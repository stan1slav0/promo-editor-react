import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { WARN } from "../core";
import { isBgRedundant, isDarkBg } from "../ir/color";
import { joinLinesWithSpace } from "../ir/runs";
import { isGapBoundary } from "../ir/spacing";
import type {
  Align,
  AlertBandProps,
  BorderSide,
  BorderSpec,
  ButtonBandProps,
  CellNode,
  ComponentNode,
  ImageProps,
  Paragraph,
  Run,
  StructuralNode,
  TableNode,
  WarnFn,
} from "../ir/types";
import { detectTextSplit, textSplitToRecordRow } from "./flowBlock";
export type ClassifyChildrenFn = (nodes: StructuralNode[]) => ComponentNode[];
function firstBorderColor(border: BorderSpec | undefined): string | undefined {
  return (
    border?.top?.color ??
    border?.right?.color ??
    border?.bottom?.color ??
    border?.left?.color
  );
}
function isNearWhiteOrRoot(color: string, tok: Tokens): boolean {
  return (
    isBgRedundant(color, "#ffffff", tok) ||
    isBgRedundant(color, tok.color.rootBackground, tok)
  );
}
function hasMeaningfulBorder(
  border: BorderSpec | undefined,
  tok: Tokens,
): boolean {
  if (!border) return false;
  const sides = [border.top, border.right, border.bottom, border.left].filter(
    (s): s is BorderSide => Boolean(s),
  );
  return (
    sides.length > 0 && sides.some((s) => !isNearWhiteOrRoot(s.color, tok))
  );
}
interface ListMarkerState {
  active: boolean;
  ordered: boolean;
  groupId: number | undefined;
  n: number;
}
function markListItem(child: Paragraph, state: ListMarkerState): Run[][] {
  if (!child.listItem) {
    state.active = false;
    return child.lines;
  }
  const sameRun =
    state.active &&
    state.ordered === (child.ordered ?? false) &&
    state.groupId === child.listGroupId;
  state.n = sameRun ? state.n + 1 : 1;
  state.active = true;
  state.ordered = child.ordered ?? false;
  state.groupId = child.listGroupId;
  if (child.lines.length === 0 || child.lines[0].length === 0)
    return child.lines;
  const marker = state.ordered ? `${state.n}. ` : "• ";
  const [firstLine, ...restLines] = child.lines;
  const [firstRun, ...restRuns] = firstLine;
  return [
    [{ ...firstRun, text: marker + firstRun.text }, ...restRuns],
    ...restLines,
  ];
}
function flattenLinesWithBreaks(
  cell: CellNode,
  tok: Tokens,
  warn?: WarnFn,
): {
  lines: Run[][];
  paraBreaks: Set<number>;
} {
  const lines: Run[][] = [];
  const paraBreaks = new Set<number>();
  let prevP: Paragraph | null = null;
  const listState: ListMarkerState = {
    active: false,
    ordered: false,
    groupId: undefined,
    n: 0,
  };
  const appendBlock = (
    blockLines: Run[][],
    blockBreaks: Set<number> | undefined,
    gap: boolean,
  ) => {
    if (blockLines.length === 0) return;
    if (lines.length > 0 && gap) paraBreaks.add(lines.length);
    if (blockBreaks)
      for (const idx of blockBreaks) paraBreaks.add(idx + lines.length);
    lines.push(...blockLines);
  };
  for (const child of cell.children) {
    if (child.type === "p") {
      appendBlock(
        markListItem(child, listState),
        child.paraBreaks,
        isGapBoundary(prevP ?? {}, child, tok),
      );
      prevP = child;
    } else if (child.type === "table") {
      listState.active = false;
      warn?.(WARN.nestedTableFlattened);
      for (const row of child.rows) {
        for (const nested of row.cells) {
          const nestedResult = flattenLinesWithBreaks(nested, tok, undefined);
          appendBlock(
            nestedResult.lines,
            nestedResult.paraBreaks,
            isGapBoundary(prevP ?? {}, {}, tok),
          );
          prevP = null;
        }
      }
    } else if (child.type === "img") {
      warn?.(WARN.imageDroppedInCell);
      prevP = null;
    }
  }
  return { lines, paraBreaks };
}
function flattenLines(cell: CellNode, tok: Tokens, warn?: WarnFn): Run[][] {
  return flattenLinesWithBreaks(cell, tok, warn).lines;
}
function flattenRuns(cell: CellNode, tok: Tokens, warn?: WarnFn): Run[] {
  return joinLinesWithSpace(flattenLines(cell, tok, warn));
}
function flattenCellForAlertBand(
  cell: CellNode,
  tok: Tokens,
  warn: WarnFn | undefined,
  classifyChildren: ClassifyChildrenFn | undefined,
): {
  lines: Run[][];
  paraBreaks: Set<number>;
  buttons: {
    atLine: number;
    props: ButtonBandProps;
  }[];
  bands: {
    atLine: number;
    props: AlertBandProps;
  }[];
  images: {
    atLine: number;
    props: ImageProps;
  }[];
  tables: {
    atLine: number;
    node: ComponentNode;
  }[];
  align?: Align;
} {
  const lines: Run[][] = [];
  const paraBreaks = new Set<number>();
  const buttons: {
    atLine: number;
    props: ButtonBandProps;
  }[] = [];
  const bands: {
    atLine: number;
    props: AlertBandProps;
  }[] = [];
  const images: {
    atLine: number;
    props: ImageProps;
  }[] = [];
  const tables: {
    atLine: number;
    node: ComponentNode;
  }[] = [];
  let align: Align | undefined;
  let prevP: Paragraph | null = null;
  const listState: ListMarkerState = {
    active: false,
    ordered: false,
    groupId: undefined,
    n: 0,
  };
  const appendBlock = (
    blockLines: Run[][],
    blockBreaks: Set<number> | undefined,
    gap: boolean,
  ) => {
    if (blockLines.length === 0) return;
    if (lines.length > 0 && gap) paraBreaks.add(lines.length);
    if (blockBreaks)
      for (const idx of blockBreaks) paraBreaks.add(idx + lines.length);
    lines.push(...blockLines);
  };
  for (const child of cell.children) {
    if (child.type === "p") {
      if (
        child.size === "body" &&
        !child.bg &&
        !child.border &&
        !child.listItem &&
        !child.headingLevel &&
        (!child.align || child.align === "left")
      ) {
        const split = detectTextSplit(child.lines, tok);
        if (split) {
          tables.push({
            atLine: lines.length,
            node: textSplitToRecordRow(split),
          });
          prevP = null;
          continue;
        }
      }
      if (align === undefined && child.align) align = child.align;
      appendBlock(
        markListItem(child, listState),
        child.paraBreaks,
        isGapBoundary(prevP ?? {}, child, tok),
      );
      prevP = child;
    } else if (child.type === "table") {
      listState.active = false;
      const nestedComponent = classifyTable(child, tok, warn, classifyChildren);
      if (nestedComponent?.kind === "buttonBand") {
        buttons.push({ atLine: lines.length, props: nestedComponent.props });
        prevP = null;
        continue;
      }
      if (nestedComponent?.kind === "alertBand") {
        bands.push({ atLine: lines.length, props: nestedComponent.props });
        prevP = null;
        continue;
      }
      if (
        nestedComponent?.kind === "statsGrid" ||
        nestedComponent?.kind === "recordRow" ||
        nestedComponent?.kind === "progressBar"
      ) {
        tables.push({ atLine: lines.length, node: nestedComponent });
        prevP = null;
        continue;
      }
      warn?.(WARN.nestedTableFlattened);
      for (const row of child.rows) {
        for (const nested of row.cells) {
          const nestedResult = flattenLinesWithBreaks(nested, tok, undefined);
          appendBlock(
            nestedResult.lines,
            nestedResult.paraBreaks,
            isGapBoundary(prevP ?? {}, {}, tok),
          );
          prevP = null;
        }
      }
    } else if (child.type === "img") {
      images.push({
        atLine: lines.length,
        props: { src: child.src, alt: child.alt },
      });
      prevP = null;
    }
  }
  return { lines, paraBreaks, buttons, bands, images, tables, align };
}
function findHref(cell: CellNode, tok: Tokens): string | null {
  for (const line of flattenLines(cell, tok)) {
    for (const run of line) {
      if (run.href) return run.href;
    }
  }
  return null;
}
function hasButtonMarker(cell: CellNode): boolean {
  return cell.children.some(
    (n) => n.type === "p" && (n as Paragraph).headingLevel === 5,
  );
}
function hasMeaningfulContent(cell: CellNode, tok: Tokens): boolean {
  return flattenRuns(cell, tok).some((r) => r.text.trim() !== "");
}
function cellAlign(cell: CellNode, fallback: Align = "left"): Align {
  if (cell.align) return cell.align;
  const firstPara = cell.children.find((c): c is Paragraph => c.type === "p");
  if (firstPara?.align) return firstPara.align;
  return cell.isHeader ? "center" : fallback;
}
function cellToChild(
  cell: CellNode,
  tok: Tokens,
  warn?: WarnFn,
): ComponentNode {
  return {
    kind: "paragraph",
    props: {
      lines: flattenLines(cell, tok, warn),
      align: cellAlign(cell, tok.statsGridDefaultAlign),
      size: "small" as const,
      bg: cell.bg,
      border: cell.border,
      borderColor: firstBorderColor(cell.border),
    },
  };
}
const EQUAL_WIDTH_TOLERANCE = 0.15;
function toWidthPercents(
  colWidths: number[] | undefined,
  ncells: number,
): number[] | undefined {
  if (!colWidths || colWidths.length !== ncells || ncells < 2) return undefined;
  const total = colWidths.reduce((s, w) => s + w, 0);
  if (total <= 0) return undefined;
  const avg = total / colWidths.length;
  const isNearEqual = colWidths.every(
    (w) => Math.abs(w - avg) / avg <= EQUAL_WIDTH_TOLERANCE,
  );
  const shares = isNearEqual
    ? colWidths.map(() => 100 / ncells)
    : colWidths.map((w) => (w / total) * 100);
  const pcts = shares.map((s) => Math.floor(s));
  let remainder = 100 - pcts.reduce((s, p) => s + p, 0);
  const order = shares
    .map((s, i) => ({ i, frac: s - Math.floor(s) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) pcts[order[k % order.length].i] += 1;
  return pcts;
}
export function classifySingleCell(
  cell: CellNode,
  tok: Tokens,
  warn?: WarnFn,
  classifyChildren?: ClassifyChildrenFn,
): ComponentNode | null {
  const bg = cell.bg;
  const border = hasMeaningfulBorder(cell.border, tok)
    ? cell.border
    : undefined;
  if (!border && (!bg || bg === tok.color.rootBackground)) return null;
  if (hasButtonMarker(cell) && bg && bg !== tok.color.rootBackground) {
    return {
      kind: "buttonBand",
      props: {
        runs: flattenRuns(cell, tok, warn),
        href: tok.placeholderHref,
        bg,
        radius: 0,
      },
    };
  }
  if (bg && isDarkBg(bg, tok)) {
    const { lines, paraBreaks, buttons, bands, images, tables, align } =
      flattenCellForAlertBand(cell, tok, warn, classifyChildren);
    const href =
      lines.length <= 1 &&
      buttons.length === 0 &&
      bands.length === 0 &&
      images.length === 0 &&
      tables.length === 0
        ? findHref(cell, tok)
        : null;
    if (href) {
      return {
        kind: "buttonBand",
        props: {
          runs: joinLinesWithSpace(lines),
          href,
          bg,
          border: cell.border,
        },
      };
    }
    return {
      kind: "alertBand",
      props: {
        lines,
        paraBreaks,
        bg,
        border: cell.border,
        buttons: buttons.length ? buttons : undefined,
        bands: bands.length ? bands : undefined,
        images: images.length ? images : undefined,
        tables: tables.length ? tables : undefined,
        align,
      },
    };
  }
  const isBottomRuleOnly =
    Boolean(border?.bottom) && !border?.top && !border?.right && !border?.left;
  if (isBottomRuleOnly && !bg) {
    const { lines, paraBreaks } = flattenLinesWithBreaks(cell, tok, warn);
    return {
      kind: "textDivider",
      props: {
        lines,
        paraBreaks,
        align: cellAlign(cell),
        ruleColor: border!.bottom!.color,
        ruleStyle: border!.bottom!.style,
      },
    };
  }
  const isLeftAccentOnly =
    Boolean(border?.left) && !border?.top && !border?.right && !border?.bottom;
  if (isLeftAccentOnly) {
    const { lines, paraBreaks, buttons, bands, images, tables } =
      flattenCellForAlertBand(cell, tok, warn, classifyChildren);
    return {
      kind: "calloutLeft",
      props: {
        lines,
        paraBreaks,
        bg,
        accentColor: border!.left!.color,
        accentWidthPx: border!.left!.widthPx,
        accentStyle: border!.left!.style,
        buttons: buttons.length ? buttons : undefined,
        bands: bands.length ? bands : undefined,
        images: images.length ? images : undefined,
        tables: tables.length ? tables : undefined,
      },
    };
  }
  if (border) {
    const children = classifyChildren?.(cell.children) ?? [
      cellToChild(cell, tok, warn),
    ];
    return { kind: "calloutBox", props: { border, bg }, children };
  }
  {
    const { lines, paraBreaks, buttons, bands, images, tables, align } =
      flattenCellForAlertBand(cell, tok, warn, classifyChildren);
    return {
      kind: "alertBand",
      props: {
        lines,
        paraBreaks,
        bg: bg!,
        buttons: buttons.length ? buttons : undefined,
        bands: bands.length ? bands : undefined,
        images: images.length ? images : undefined,
        tables: tables.length ? tables : undefined,
        align,
      },
    };
  }
}
function rowCells(cells: CellNode[], tok: Tokens, warn?: WarnFn) {
  return cells.map((c) => ({
    lines: flattenLines(c, tok, warn),
    align: cellAlign(c),
    bg: c.bg,
    border: c.border,
    borderColor: firstBorderColor(c.border),
  }));
}
export function classifyTable(
  node: TableNode,
  tok: Tokens = defaultTokens,
  warn?: WarnFn,
  classifyChildren?: ClassifyChildrenFn,
): ComponentNode | null {
  const { rows } = node;
  if (!rows.length) return null;
  const ncols = Math.max(
    ...rows.map((r) => r.cells.reduce((s, c) => s + (c.colspan ?? 1), 0)),
  );
  if (rows.length === 1 && rows[0].cells.length === 1) {
    return classifySingleCell(rows[0].cells[0], tok, warn, classifyChildren);
  }
  if (rows.length === 1 && ncols >= 2) {
    const cells = rows[0].cells;
    if (
      cells.length === 2 &&
      cells.every(
        (c) =>
          !hasMeaningfulBorder(c.border, tok) &&
          (!c.bg || isNearWhiteOrRoot(c.bg, tok)),
      ) &&
      cells.every((c) => hasMeaningfulContent(c, tok)) &&
      cellAlign(cells[0]) !== "right" &&
      cellAlign(cells[1]) === "right"
    ) {
      return {
        kind: "splitRow",
        props: {
          left: flattenRuns(cells[0], tok, warn),
          right: flattenRuns(cells[1], tok, warn),
        },
      };
    }
    if (cells.length === 2 && node.colWidths?.length === 2) {
      const emptyIdx = cells.findIndex((c) => !hasMeaningfulContent(c, tok));
      if (emptyIdx !== -1) {
        const emptyCell = cells[emptyIdx];
        const contentCell = cells[1 - emptyIdx];
        const totalWidth = node.colWidths[0] + node.colWidths[1];
        const emptyWidth = node.colWidths[emptyIdx];
        const isNarrowBar =
          totalWidth > 0 && emptyWidth <= 40 && emptyWidth / totalWidth <= 0.15;
        if (
          isNarrowBar &&
          emptyCell.bg &&
          !isNearWhiteOrRoot(emptyCell.bg, tok) &&
          !hasMeaningfulBorder(contentCell.border, tok)
        ) {
          const accentSide = emptyIdx === 0 ? "left" : "right";
          const syntheticCell: CellNode = {
            ...contentCell,
            border: {
              ...contentCell.border,
              [accentSide]: { color: emptyCell.bg },
            },
          };
          const comp = classifySingleCell(
            syntheticCell,
            tok,
            warn,
            classifyChildren,
          );
          if (comp) return comp;
        }
      }
    }
    const meaningfulCells = cells.filter((c) => hasMeaningfulContent(c, tok));
    if (meaningfulCells.length === 1) {
      const comp = classifySingleCell(
        meaningfulCells[0],
        tok,
        warn,
        classifyChildren,
      );
      if (comp) return comp;
    }
    if (
      meaningfulCells.length === 0 &&
      cells.some((c) => c.bg && !isNearWhiteOrRoot(c.bg, tok))
    ) {
      return {
        kind: "progressBar",
        props: {
          n: cells.length,
          widths: toWidthPercents(node.colWidths, cells.length),
          colors: cells.map((c) => c.bg ?? tok.color.rootBackground),
        },
      };
    }
    const borderColor = firstBorderColor(cells.find((c) => c.border)?.border);
    return {
      kind: "statsGrid",
      props: {
        n: cells.length,
        widths: toWidthPercents(node.colWidths, cells.length),
        borderColor,
      },
      children: cells.map((c) => cellToChild(c, tok, warn)),
    };
  }
  if (ncols >= 2) {
    const hasBand =
      rows[0].cells.length === 1 &&
      (rows[0].cells[0].colspan ?? 1) >= ncols &&
      rows.length > 1;
    const bandRow = hasBand ? rows[0] : undefined;
    const gridRows = hasBand ? rows.slice(1) : rows;
    const cellCounts = new Set(gridRows.map((r) => r.cells.length));
    const uniformCells = cellCounts.size === 1 ? gridRows[0].cells.length : 0;
    const borderColor = firstBorderColor(
      gridRows.flatMap((r) => r.cells).find((c) => c.border)?.border,
    );
    return {
      kind: "recordRow",
      props: {
        widths: toWidthPercents(node.colWidths, uniformCells),
        borderColor,
        gapBefore: node.gapBefore,
        band: bandRow ? rowCells(bandRow.cells, tok, warn)[0] : undefined,
        rows: gridRows.map((r) => ({
          bg: r.cells.every((c) => c.bg === r.cells[0].bg)
            ? r.cells[0].bg
            : undefined,
          cells: rowCells(r.cells, tok, warn),
        })),
      },
    };
  }
  return null;
}
