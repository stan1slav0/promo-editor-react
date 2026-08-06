import {
  type AlertBandOpts,
  type AlertBandSegment,
  blockRow,
  buildTemplates,
  type ButtonBandOpts,
  type CalloutBoxOpts,
  type CalloutOpts,
  type FooterOpts,
  type GridCell,
  type GridOpts,
  type ImageOpts,
  imageRowHtml,
  type ListOpts,
  type ParagraphOpts,
  type ProgressBarOpts,
  type RecordOpts,
  type SideImageOpts,
  type SplitRowOpts,
  templates as defaultTemplates,
  type TextDividerOpts,
} from "../config/templates";
import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { escapeHtml as esc } from "../core";
import { isDarkBg } from "../ir/color";
import type {
  Align,
  AlertBandProps,
  ButtonBandProps,
  ComponentNode,
  ListProps,
  ParagraphProps,
  Run,
} from "../ir/types";
type Templates = ReturnType<typeof buildTemplates>;
function isSafeHref(href: string): boolean {
  const lower = href.trimStart().toLowerCase();
  return (
    !lower.startsWith("javascript:") &&
    !lower.startsWith("data:") &&
    !lower.startsWith("vbscript:")
  );
}
function wrapInline(tag: string, inner: string, style?: string): string {
  const leading = inner.match(/^[\s\n]+/)?.[0] ?? "";
  const trailing = inner.match(/[\s\n]+$/)?.[0] ?? "";
  const core = inner.slice(leading.length, inner.length - trailing.length);
  if (!core) return inner;
  const openTag = style ? `<${tag} style="${style};">` : `<${tag}>`;
  return `${leading}${openTag}${core}</${tag}>${trailing}`;
}
export function renderRuns(
  runs: Run[],
  tok: Tokens = defaultTokens,
  baseColor?: string,
): string {
  const { bold: B, italic: I, underline: U, colorWrap: S } = tok.tags;
  return runs
    .map((run) => {
      const html = esc(run.text.replace(/\s*\n\s*/g, " "));
      if (run.href && isSafeHref(run.href)) {
        const linkColor = run.color ?? tok.color.link;
        const inner = run.italic ? `<${I}>${html}</${I}>` : html;
        return `<a href="${tok.placeholderHref}" style="font-family:${tok.font.stack};text-decoration:${tok.font.linkDecoration};font-weight:${tok.font.linkWeight};color:${linkColor};">${inner}</a>`;
      }
      const hasColor =
        Boolean(run.color) &&
        run.color!.toLowerCase() !== (baseColor ?? "").toLowerCase();
      if (!run.bold && !run.italic && !run.underline && !hasColor) return html;
      const styleParts: string[] = [];
      let tag: string;
      if (run.bold) {
        tag = B;
        if (run.italic) styleParts.push("font-style:italic");
        if (run.underline) styleParts.push("text-decoration:underline");
      } else if (run.italic) {
        tag = I;
        if (run.underline) styleParts.push("text-decoration:underline");
      } else if (run.underline) {
        tag = U;
      } else {
        tag = S;
      }
      if (hasColor) styleParts.push(`color:${run.color}`);
      return wrapInline(
        tag,
        html,
        styleParts.length ? styleParts.join(";") : undefined,
      );
    })
    .join("")
    .trim();
}
export function renderLines(
  lines: Run[][],
  tok: Tokens = defaultTokens,
  baseColor?: string,
  paraBreaks?: Set<number>,
): string {
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.length === 0) continue;
    if (result.length > 0) {
      result.push(paraBreaks?.has(i) ? "\n<br><br>\n" : " <br>\n");
    }
    result.push(renderRuns(l, tok, baseColor));
  }
  return result.join("");
}
function renderLineSlice(
  lines: Run[][],
  start: number,
  end: number,
  tok: Tokens,
  baseColor: string,
  paraBreaks?: Set<number>,
): string {
  const slicedBreaks = new Set<number>();
  for (const index of paraBreaks ?? []) {
    if (index > start && index < end) slicedBreaks.add(index - start);
  }
  return renderLines(lines.slice(start, end), tok, baseColor, slicedBreaks);
}
function renderListItems(items: Run[][], tok: Tokens): string {
  return items
    .map((runs) => `<li>${renderRuns(runs, tok, tok.color.black)}</li>`)
    .join("\n");
}
function renderListInline(props: ListProps, tok: Tokens): string {
  const tag = props.ordered ? "ol" : "ul";
  return `<${tag}>\n${renderListItems(props.items, tok)}\n</${tag}>`;
}
function renderParagraphInner(p: ParagraphProps, tok: Tokens): string {
  if (!p.lists?.length)
    return renderLines(p.lines, tok, tok.color.black, p.paraBreaks);
  const sorted = [...p.lists].sort((a, b) => a.atLine - b.atLine);
  const parts: string[] = [];
  let groupStart = 0;
  const flushText = (end: number) => {
    if (end <= groupStart) return;
    const html = renderLineSlice(
      p.lines,
      groupStart,
      end,
      tok,
      tok.color.black,
      p.paraBreaks,
    );
    if (html) parts.push(html);
  };
  for (const { atLine, props: listProps } of sorted) {
    flushText(atLine);
    if (parts.length > 0) parts.push("<br>");
    parts.push(renderListInline(listProps, tok));
    groupStart = atLine;
  }
  flushText(p.lines.length);
  return parts.join("\n");
}
function buildAlertBandSegments(
  p: Pick<
    AlertBandProps,
    "lines" | "paraBreaks" | "buttons" | "bands" | "images"
  >,
  tok: Tokens,
  textColor: string,
): AlertBandSegment[] {
  const segments: AlertBandSegment[] = [];
  let groupStart = 0;
  const flushTextGroup = (end: number) => {
    if (end <= groupStart) return;
    const html = renderLineSlice(
      p.lines,
      groupStart,
      end,
      tok,
      textColor,
      p.paraBreaks,
    );
    if (html) segments.push({ kind: "text", html });
  };
  const pushButton = (btn: ButtonBandProps) => {
    const btnTextColor = isDarkBg(btn.bg, tok)
      ? tok.color.white
      : tok.color.black;
    const buttonRuns = btn.runs.map((r) => ({
      ...r,
      color: r.href ? undefined : r.color,
      href: undefined,
    }));
    const label = renderRuns(buttonRuns, tok, btnTextColor);
    segments.push({
      kind: "button",
      label,
      href: btn.href ?? tok.placeholderHref,
      bg: btn.bg,
      radius: btn.radius,
      border: btn.border,
    });
  };
  const nested = [
    ...(p.buttons ?? []).map((b) => ({
      atLine: b.atLine,
      kind: "button" as const,
      btn: b.props,
    })),
    ...(p.bands ?? []).map((b) => ({
      atLine: b.atLine,
      kind: "band" as const,
      band: b.props,
    })),
    ...(p.images ?? []).map((im) => ({
      atLine: im.atLine,
      kind: "image" as const,
      props: im.props,
    })),
  ].sort((a, b) => a.atLine - b.atLine);
  for (const item of nested) {
    flushTextGroup(item.atLine);
    if (item.kind === "button") {
      pushButton(item.btn);
    } else if (item.kind === "image") {
      segments.push({ kind: "image", props: item.props });
    } else {
      const band = item.band;
      const bandTextColor = isDarkBg(band.bg, tok)
        ? tok.color.white
        : tok.color.black;
      const html = renderLines(band.lines, tok, bandTextColor, band.paraBreaks);
      segments.push({
        kind: "band",
        html,
        bg: band.bg,
        border: band.border,
        align: band.align,
      });
      for (const b of band.buttons ?? []) pushButton(b.props);
    }
    groupStart = item.atLine;
  }
  flushTextGroup(p.lines.length);
  return segments;
}
function buildImageOnlyRows(
  p: Pick<AlertBandProps, "lines" | "paraBreaks" | "images" | "tables">,
  tmpl: Templates,
  tok: Tokens,
  textColor: string,
  align: Align,
  padX: number,
): string[] {
  const rows: string[] = [];
  let groupStart = 0;
  const flushTextGroup = (end: number) => {
    if (end <= groupStart) return;
    const html = renderLineSlice(
      p.lines,
      groupStart,
      end,
      tok,
      textColor,
      p.paraBreaks,
    );
    if (html) {
      rows.push(
        blockRow(
          html,
          {
            align,
            color: textColor,
            extraStyle: `padding-left:${padX}px;padding-right:${padX}px;`,
          },
          tok,
        ),
      );
    }
  };
  const nested = [
    ...(p.images ?? []).map((im) => ({
      atLine: im.atLine,
      kind: "image" as const,
      props: im.props,
    })),
    ...(p.tables ?? []).map((t) => ({
      atLine: t.atLine,
      kind: "table" as const,
      node: t.node,
    })),
  ].sort((a, b) => a.atLine - b.atLine);
  for (const item of nested) {
    flushTextGroup(item.atLine);
    if (item.kind === "image") {
      rows.push(imageRowHtml(item.props, tok, padX));
    } else {
      rows.push(renderNode(item.node, tmpl, tok, tok.layout.nestedBlockPadX));
    }
    groupStart = item.atLine;
  }
  flushTextGroup(p.lines.length);
  return rows;
}
export function renderNode(
  node: ComponentNode,
  tmpl: Templates = defaultTemplates,
  tok: Tokens = defaultTokens,
  padX = 0,
): string {
  switch (node.kind) {
    case "paragraph": {
      const p = node.props;
      const opts: ParagraphOpts = {
        innerHtml: renderParagraphInner(p, tok),
        align: p.align ?? "left",
        size: p.size ?? "body",
        variant: p.variant,
        tightAfter: p.tightAfter,
        tightBefore: p.tightBefore,
      };
      return tmpl.paragraph(opts);
    }
    case "list": {
      const p = node.props;
      const opts: ListOpts = { ordered: p.ordered };
      return tmpl.list(renderListItems(p.items, tok), opts);
    }
    case "alertBand": {
      const p = node.props;
      const textColor = isDarkBg(p.bg, tok) ? tok.color.white : tok.color.black;
      let opts: AlertBandOpts;
      if (p.buttons?.length || p.bands?.length) {
        opts = {
          segments: buildAlertBandSegments(p, tok, textColor),
          bg: p.bg,
          border: p.border,
          align: p.align,
        };
      } else if (p.images?.length || p.tables?.length) {
        const rows = buildImageOnlyRows(
          p,
          tmpl,
          tok,
          textColor,
          p.align ?? "left",
          tok.layout.alertBandPadH,
        );
        opts = { rows, bg: p.bg, border: p.border, align: p.align };
      } else {
        opts = {
          innerHtml: renderLines(p.lines, tok, textColor, p.paraBreaks),
          bg: p.bg,
          border: p.border,
          align: p.align,
        };
      }
      return tmpl.alertBand(opts);
    }
    case "bandStack": {
      const rows = node.props.rows.map((r) => {
        const textColor = isDarkBg(r.bg, tok)
          ? tok.color.white
          : tok.color.black;
        return {
          bg: r.bg,
          align: r.align,
          border: r.border,
          innerHtml: renderLines(r.lines, tok, textColor, r.paraBreaks),
        };
      });
      return tmpl.bandStack({ rows });
    }
    case "buttonBand": {
      const p = node.props;
      const textColor = isDarkBg(p.bg, tok) ? tok.color.white : tok.color.black;
      const buttonRuns = p.runs.map((r) => ({
        ...r,
        color: undefined,
        href: undefined,
      }));
      const opts: ButtonBandOpts = {
        innerHtml: renderRuns(buttonRuns, tok, textColor),
        href: p.href ?? tok.placeholderHref,
        bg: p.bg,
        radius: p.radius,
        border: p.border,
      };
      return tmpl.buttonBand(opts);
    }
    case "calloutLeft": {
      const p = node.props;
      const hasButtonsOrBands = Boolean(p.buttons?.length || p.bands?.length);
      const hasImagesOrTablesOnly =
        !hasButtonsOrBands && Boolean(p.images?.length || p.tables?.length);
      const innerHtml =
        hasButtonsOrBands || hasImagesOrTablesOnly
          ? ""
          : renderLines(p.lines, tok, tok.color.black, p.paraBreaks);
      const opts: CalloutOpts = {
        accentColor: p.accentColor,
        accentWidthPx: p.accentWidthPx,
        accentStyle: p.accentStyle,
        accentPadX: p.accentPadX,
        bg: p.bg,
        segments: hasButtonsOrBands
          ? buildAlertBandSegments(p, tok, tok.color.black)
          : undefined,
        rows: hasImagesOrTablesOnly
          ? buildImageOnlyRows(
              p,
              tmpl,
              tok,
              tok.color.black,
              "left",
              p.accentPadX ?? tok.layout.calloutPadX,
            )
          : undefined,
      };
      return tmpl.calloutLeft(innerHtml, opts);
    }
    case "calloutBox": {
      const only = node.children.length === 1 ? node.children[0] : undefined;
      if (
        only?.kind === "paragraph" &&
        only.props.size === "body" &&
        !only.props.variant
      ) {
        const innerHtml = renderParagraphInner(only.props, tok);
        const opts: CalloutBoxOpts = {
          border: node.props.border,
          bg: node.props.bg,
          innerHtml,
          align: only.props.align ?? "left",
        };
        return tmpl.calloutBox(undefined, opts);
      }
      const childrenHtml = renderAll(node.children, tmpl, tok);
      const opts: CalloutBoxOpts = {
        border: node.props.border,
        bg: node.props.bg,
      };
      return tmpl.calloutBox(childrenHtml, opts);
    }
    case "textDivider": {
      const p = node.props;
      const innerHtml = renderLines(
        p.lines,
        tok,
        tok.color.black,
        p.paraBreaks,
      );
      const opts: TextDividerOpts = {
        align: p.align,
        ruleColor: p.ruleColor,
        ruleStyle: p.ruleStyle,
      };
      return tmpl.textDivider(innerHtml, opts);
    }
    case "statsGrid": {
      const cells: GridCell[] = node.children.map((child) => {
        if (child.kind !== "paragraph") return { innerHtml: "" };
        const cp = child.props;
        const baseColor =
          cp.bg && isDarkBg(cp.bg, tok) ? tok.color.white : tok.color.black;
        return {
          innerHtml: renderLines(cp.lines, tok, baseColor),
          bg: cp.bg,
          border: cp.border,
          borderColor: cp.borderColor,
          align: cp.align,
        };
      });
      const opts: GridOpts = {
        n: node.props.n || cells.length,
        widths: node.props.widths,
        borderColor: node.props.borderColor,
        padX: padX || undefined,
      };
      return tmpl.statsGrid(cells, opts);
    }
    case "recordRow": {
      const p = node.props;
      const bandCell = p.band;
      const band = bandCell
        ? {
            innerHtml: renderLines(
              bandCell.lines,
              tok,
              bandCell.bg && isDarkBg(bandCell.bg, tok)
                ? tok.color.white
                : tok.color.black,
            ),
            align: bandCell.align,
            bg: bandCell.bg,
            border: bandCell.border,
            borderColor: bandCell.borderColor,
          }
        : undefined;
      const opts: RecordOpts = {
        widths: p.widths,
        borderColor: p.borderColor,
        band,
        padX: padX || undefined,
        rows: p.rows.map((row) => ({
          bg: row.bg,
          cells: row.cells.map((c) => {
            const bg = c.bg ?? row.bg;
            const textColor =
              bg && isDarkBg(bg, tok) ? tok.color.white : tok.color.black;
            return {
              innerHtml: renderLines(c.lines, tok, textColor),
              align: c.align,
              bg: c.bg,
              border: c.border,
              borderColor: c.borderColor,
            };
          }),
        })),
      };
      return tmpl.recordRow(opts);
    }
    case "splitRow": {
      const opts: SplitRowOpts = {
        leftHtml: renderRuns(node.props.left, tok, tok.color.black),
        rightHtml: renderRuns(node.props.right, tok, tok.color.black),
      };
      return tmpl.splitRow(opts);
    }
    case "image": {
      if (!node.props.src) return "";
      const opts: ImageOpts = {
        src: node.props.src,
        alt: node.props.alt,
        tightBefore: node.props.tightBefore,
        tightAfter: node.props.tightAfter,
      };
      return tmpl.image(opts);
    }
    case "progressBar": {
      const opts: ProgressBarOpts = {
        n: node.props.n,
        widths: node.props.widths,
        colors: node.props.colors,
        padX: padX || undefined,
      };
      return tmpl.progressBar(opts);
    }
    case "footer": {
      const opts: FooterOpts = { align: node.props.align };
      const innerHtml = renderLines(
        node.props.lines,
        tok,
        tok.color.black,
        node.props.paraBreaks,
      );
      return tmpl.footer(innerHtml, opts);
    }
    case "signature":
      return tmpl.signature();
    case "sideImage": {
      const p = node.props;
      const flowable = node.children.every(
        (c) =>
          (c.kind === "paragraph" &&
            c.props.size === "body" &&
            !c.props.variant) ||
          c.kind === "list",
      );
      if (flowable) {
        const firstPara = node.children.find(
          (
            c,
          ): c is Extract<
            ComponentNode,
            {
              kind: "paragraph";
            }
          > => c.kind === "paragraph",
        );
        const align = firstPara?.props.align ?? "left";
        const innerHtml = node.children
          .map((c) =>
            c.kind === "paragraph"
              ? renderParagraphInner(c.props, tok)
              : c.kind === "list"
                ? renderListInline(c.props, tok)
                : "",
          )
          .join("<br><br>\n");
        const opts: SideImageOpts = {
          side: p.side,
          align,
          tightBefore: p.tightBefore,
          tightAfter: p.tightAfter,
        };
        return tmpl.sideImage(innerHtml, opts);
      }
      const imageOpts: ImageOpts = { tightBefore: p.tightBefore };
      return `${tmpl.image(imageOpts)}\n${renderAll(node.children, tmpl, tok)}`;
    }
    case "spacer":
      return tmpl.spacer(
        Math.trunc(node.props.heightPx || 0) || tok.layout.spacerPx,
      );
    default:
      return "";
  }
}
export function renderAll(
  nodes: ComponentNode[],
  tmpl: Templates = defaultTemplates,
  tok: Tokens = defaultTokens,
): string {
  return nodes
    .map((n) => renderNode(n, tmpl, tok))
    .filter(Boolean)
    .join("\n");
}
