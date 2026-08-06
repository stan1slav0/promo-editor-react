import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { WARN } from "../core";
import { isGapBoundary } from "../ir/spacing";
import type {
  ComponentNode,
  ParagraphProps,
  Run,
  StructuralNode,
  TableNode,
  WarnFn,
} from "../ir/types";
import { classifyFlow } from "./flowBlock";
import { classifySingleCell, classifyTable } from "./tableBlock";
const LIST_MARKER_CHARS = new Set([
  "•",
  "◦",
  "▪",
  "▸",
  "►",
  "➤",
  "‣",
  "·",
  "●",
  "○",
  "✓",
  "✔",
  "✗",
  "✕",
  "✅",
  "❌",
  "☐",
  "☑",
  "-",
  "*",
  "→",
]);
function startsWithListMarker(line: Run[] | undefined): boolean {
  const text = line?.[0]?.text;
  if (!text) return false;
  const trimmed = text.trim();
  if (LIST_MARKER_CHARS.has(trimmed) || /^\d{1,2}[.)]$/.test(trimmed))
    return true;
  const first = trimmed[0];
  if (LIST_MARKER_CHARS.has(first) && /^\S\s/.test(trimmed)) return true;
  return /^\d{1,2}[.)]\s/.test(trimmed);
}
function pushMerged(
  result: ComponentNode[],
  comp: ComponentNode,
  tok: Tokens,
  warn?: WarnFn,
): void {
  const last = result[result.length - 1];
  const alignOf = (p: ParagraphProps) => p.align ?? "left";
  if (
    comp.kind === "paragraph" &&
    last?.kind === "paragraph" &&
    last.props.size === comp.props.size &&
    last.props.variant === comp.props.variant &&
    alignOf(last.props) === alignOf(comp.props)
  ) {
    const lastLines = last.props.lines;
    const newLines = comp.props.lines;
    if (newLines.length === 0) return;
    const breakIdx = lastLines.length;
    const isMarkerPair =
      startsWithListMarker(newLines[0]) &&
      startsWithListMarker(lastLines[breakIdx - 1]);
    const isTight =
      last.props.tightNext === true ||
      comp.props.tightBefore === true ||
      (comp.props.gapBefore !== true &&
        (alignOf(comp.props) === "center" || isMarkerPair)) ||
      !isGapBoundary(last.props, comp.props, tok);
    const compBreaks = comp.props.paraBreaks;
    const breaks = new Set<number>(last.props.paraBreaks);
    if (!isTight) breaks.add(breakIdx);
    if (compBreaks) for (const idx of compBreaks) breaks.add(idx + breakIdx);
    result[result.length - 1] = {
      kind: "paragraph",
      props: {
        ...last.props,
        lines: [...lastLines, ...newLines],
        paraBreaks: breaks.size ? breaks : undefined,
        tightNext: comp.props.tightNext,
        marginBottomPt: comp.props.marginBottomPt,
      },
    };
    return;
  }
  if (
    comp.kind === "calloutLeft" &&
    last?.kind === "calloutLeft" &&
    last.props.accentColor === comp.props.accentColor &&
    last.props.accentWidthPx === comp.props.accentWidthPx &&
    last.props.accentStyle === comp.props.accentStyle &&
    last.props.accentPadX === comp.props.accentPadX &&
    last.props.bg === comp.props.bg
  ) {
    const lastLines = last.props.lines;
    const newLines = comp.props.lines;
    if (
      newLines.length === 0 &&
      !comp.props.buttons?.length &&
      !comp.props.bands?.length &&
      !comp.props.tables?.length
    )
      return;
    const breakIdx = lastLines.length;
    const isTight =
      last.props.tightNext === true ||
      comp.props.tightBefore === true ||
      !isGapBoundary(last.props, comp.props, tok);
    const compBreaks = comp.props.paraBreaks;
    const breaks = new Set<number>(last.props.paraBreaks);
    if (!isTight) breaks.add(breakIdx);
    if (compBreaks) for (const idx of compBreaks) breaks.add(idx + breakIdx);
    const offsetAtLine = <T>(
      items:
        | {
            atLine: number;
            props: T;
          }[]
        | undefined,
      by: number,
    ) => items?.map((i) => ({ ...i, atLine: i.atLine + by }));
    const offsetTableAtLine = (
      items:
        | {
            atLine: number;
            node: ComponentNode;
          }[]
        | undefined,
      by: number,
    ) => items?.map((i) => ({ ...i, atLine: i.atLine + by }));
    const mergeArr = <T>(
      a: T[] | undefined,
      b: T[] | undefined,
    ): T[] | undefined => {
      const merged = [...(a ?? []), ...(b ?? [])];
      return merged.length ? merged : undefined;
    };
    result[result.length - 1] = {
      kind: "calloutLeft",
      props: {
        ...last.props,
        lines: [...lastLines, ...newLines],
        paraBreaks: breaks.size ? breaks : undefined,
        tightNext: comp.props.tightNext,
        marginBottomPt: comp.props.marginBottomPt,
        buttons: mergeArr(
          last.props.buttons,
          offsetAtLine(comp.props.buttons, breakIdx),
        ),
        bands: mergeArr(
          last.props.bands,
          offsetAtLine(comp.props.bands, breakIdx),
        ),
        tables: mergeArr(
          last.props.tables,
          offsetTableAtLine(comp.props.tables, breakIdx),
        ),
      },
    };
    return;
  }
  if (
    comp.kind === "paragraph" &&
    last?.kind === "paragraph" &&
    !isGapBoundary(last.props, comp.props, tok)
  ) {
    result[result.length - 1] = {
      ...last,
      props: { ...last.props, tightAfter: true },
    };
    comp = { ...comp, props: { ...comp.props, tightBefore: true } };
  }
  if (
    comp.kind === "paragraph" &&
    last?.kind === "image" &&
    comp.props.tightBefore === true
  ) {
    result[result.length - 1] = {
      ...last,
      props: { ...last.props, tightAfter: true },
    };
  }
  if (
    comp.kind === "paragraph" &&
    last?.kind === "sideImage" &&
    comp.props.tightBefore === true
  ) {
    result[result.length - 1] = {
      ...last,
      props: { ...last.props, tightAfter: true },
    };
  }
  const isPlainBodyParagraph = (
    p: ComponentNode | undefined,
  ): p is Extract<
    ComponentNode,
    {
      kind: "paragraph";
    }
  > => p?.kind === "paragraph" && p.props.size === "body" && !p.props.variant;
  if (comp.kind === "list" && isPlainBodyParagraph(last)) {
    const attached = last.props.lists ?? [];
    const atLine = last.props.lines.length;
    const prev = attached[attached.length - 1];
    const lists =
      prev &&
      prev.atLine === atLine &&
      prev.props.ordered === comp.props.ordered &&
      prev.props.listGroupId === comp.props.listGroupId
        ? [
            ...attached.slice(0, -1),
            {
              atLine,
              props: {
                ...prev.props,
                items: [...prev.props.items, ...comp.props.items],
              },
            },
          ]
        : [...attached, { atLine, props: comp.props }];
    result[result.length - 1] = { ...last, props: { ...last.props, lists } };
    return;
  }
  if (
    comp.kind === "paragraph" &&
    comp.props.size === "body" &&
    !comp.props.variant &&
    last?.kind === "list"
  ) {
    result[result.length - 1] = {
      kind: "paragraph",
      props: { ...comp.props, lists: [{ atLine: 0, props: last.props }] },
    };
    return;
  }
  if (
    comp.kind === "list" &&
    last?.kind === "list" &&
    last.props.ordered === comp.props.ordered &&
    last.props.listGroupId === comp.props.listGroupId
  ) {
    result[result.length - 1] = {
      kind: "list",
      props: {
        items: [...last.props.items, ...comp.props.items],
        ordered: last.props.ordered,
        listGroupId: last.props.listGroupId,
      },
    };
    return;
  }
  if (
    comp.kind === "recordRow" &&
    last?.kind === "recordRow" &&
    !comp.props.gapBefore &&
    !last.props.band &&
    !comp.props.band
  ) {
    const lastRows = last.props.rows;
    const newRows = comp.props.rows;
    if (lastRows[0]?.cells?.length === newRows[0]?.cells?.length) {
      if (
        comp.props.borderColor !== last.props.borderColor ||
        JSON.stringify(comp.props.widths) !== JSON.stringify(last.props.widths)
      ) {
        warn?.(WARN.tablesMergedMismatch);
      }
      result[result.length - 1] = {
        kind: "recordRow",
        props: { ...last.props, rows: [...lastRows, ...newRows] },
      };
      return;
    }
  }
  result.push(comp);
}
export function classify(
  nodes: StructuralNode[],
  tok: Tokens = defaultTokens,
  warn?: WarnFn,
): ComponentNode[] {
  const result: ComponentNode[] = [];
  const classifyChildren = (n: StructuralNode[]) => classify(n, tok, warn);
  for (const node of nodes) {
    if (node.type === "table") {
      const component = classifyTable(
        node as TableNode,
        tok,
        warn,
        classifyChildren,
      );
      if (component) {
        pushMerged(result, component, tok, warn);
      } else {
        const tableRows = (node as TableNode).rows;
        const cellComps = tableRows.map((r) =>
          r.cells.length === 1
            ? classifySingleCell(r.cells[0], tok, warn, classifyChildren)
            : null,
        );
        const isPlainBand = (
          c: ComponentNode | null,
        ): c is Extract<
          ComponentNode,
          {
            kind: "alertBand";
          }
        > =>
          c?.kind === "alertBand" &&
          !c.props.buttons?.length &&
          !c.props.bands?.length &&
          !c.props.images?.length &&
          !c.props.tables?.length;
        if (tableRows.length >= 2 && cellComps.every(isPlainBand)) {
          pushMerged(
            result,
            {
              kind: "bandStack",
              props: {
                rows: cellComps.map((c) => ({
                  bg: c.props.bg,
                  lines: c.props.lines,
                  paraBreaks: c.props.paraBreaks,
                  align: c.props.align,
                  border: c.props.border,
                })),
              },
            },
            tok,
            warn,
          );
        } else {
          tableRows.forEach((row, i) => {
            const cellComp = cellComps[i];
            if (cellComp) {
              pushMerged(result, cellComp, tok, warn);
            } else {
              for (const cell of row.cells) {
                for (const comp of classify(cell.children, tok, warn)) {
                  pushMerged(result, comp, tok, warn);
                }
              }
            }
          });
        }
      }
    } else if (node.type === "p") {
      for (const comp of classifyFlow([node], tok)) {
        pushMerged(result, comp, tok, warn);
      }
    } else if (node.type === "img") {
      const comp: ComponentNode = {
        kind: "image",
        props: { src: node.src, alt: node.alt },
      };
      const last = result[result.length - 1];
      if (last?.kind === "paragraph" && last.props.tightNext === true) {
        result[result.length - 1] = {
          ...last,
          props: { ...last.props, tightAfter: true },
        };
        comp.props.tightBefore = true;
      }
      result.push(comp);
    } else if (node.type === "footer") {
      result.push({
        kind: "footer",
        props: {
          align: node.align,
          lines: node.lines,
          paraBreaks: node.paraBreaks,
        },
      });
    } else if (node.type === "signature") {
      result.push({ kind: "signature" });
    } else if (node.type === "sideImageWrap") {
      const children = classify(node.children, tok, warn);
      if (children.length === 0) continue;
      const flowable = children.every(
        (c) =>
          (c.kind === "paragraph" &&
            c.props.size === "body" &&
            !c.props.variant) ||
          c.kind === "list",
      );
      if (!flowable) warn?.(WARN.sideImageMixedContent);
      const comp: ComponentNode = {
        kind: "sideImage",
        props: { side: node.side, tightBefore: node.tightBefore },
        children,
      };
      const last = result[result.length - 1];
      if (last?.kind === "paragraph" && last.props.tightNext === true) {
        result[result.length - 1] = {
          ...last,
          props: { ...last.props, tightAfter: true },
        };
        comp.props.tightBefore = true;
      }
      result.push(comp);
    }
  }
  return result;
}
