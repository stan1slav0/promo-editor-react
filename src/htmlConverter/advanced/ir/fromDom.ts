import { isLinkColor } from "../../utils/colorUtils";
import { WARN } from "../core";
import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { canonicalizeBg, canonicalizeText } from "./color";
import {
  getAlign,
  isBold,
  isExplicitNonBold,
  isExplicitNonItalic,
  isExplicitNonUnderline,
  isItalic,
  isUnderline,
  parseStyle,
} from "./style";
import type {
  Align,
  BorderSide,
  BorderSpec,
  CellNode,
  FooterNode,
  ImageNode,
  Paragraph,
  RowNode,
  Run,
  SizeRole,
  SideImageWrapNode,
  StructuralNode,
  TableNode,
  WarnFn,
} from "./types";
interface Ctx {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color?: string;
  href?: string;
  bg: string;
}
const LINE_BREAK = "\n";
function sizeFromTag(tag: string): SizeRole {
  if (tag === "H1") return "headline";
  if (tag === "H5" || tag === "H6") return "small";
  return "body";
}
function makeRun(text: string, ctx: Ctx): Run {
  const run: Run = { text };
  if (ctx.bold) run.bold = true;
  if (ctx.italic) run.italic = true;
  if (ctx.underline) run.underline = true;
  if (ctx.color) run.color = ctx.color;
  if (ctx.href) run.href = ctx.href;
  return run;
}
function mergeRuns(runs: Run[]): Run[] {
  if (runs.length === 0) return runs;
  const out: Run[] = [{ ...runs[0] }];
  for (let i = 1; i < runs.length; i++) {
    const prev = out[out.length - 1];
    const cur = runs[i];
    if (
      cur.text !== LINE_BREAK &&
      prev.text !== LINE_BREAK &&
      prev.bold === cur.bold &&
      prev.italic === cur.italic &&
      prev.underline === cur.underline &&
      prev.color === cur.color &&
      prev.href === cur.href
    ) {
      prev.text += cur.text;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}
function splitIntoLines(runs: Run[]): {
  lines: Run[][];
  tightNext: boolean;
  tightBefore: boolean;
} {
  const lines: Run[][] = [[]];
  let firstBreakWasOneBr = false;
  let lastBreakWasOneBr = false;
  let sawBreak = false;
  for (const run of runs) {
    if (run.text === LINE_BREAK) {
      if (!sawBreak) {
        firstBreakWasOneBr = run.oneBr === true;
        sawBreak = true;
      }
      lastBreakWasOneBr = run.oneBr === true;
      lines.push([]);
    } else {
      lines[lines.length - 1].push(run);
    }
  }
  const tightNext =
    lines.length > 1 &&
    lines[lines.length - 1].length === 0 &&
    lastBreakWasOneBr;
  const tightBefore =
    lines.length > 1 && lines[0].length === 0 && firstBreakWasOneBr;
  while (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
  return { lines, tightNext, tightBefore };
}
function collectRuns(el: Element | Node, ctx: Ctx, tok: Tokens): Run[] {
  const runs: Run[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/\u00A0/g, " ");
      if (text) {
        const runCtx = text.trim() ? ctx : { ...ctx, href: undefined };
        runs.push(makeRun(text, runCtx));
      }
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const child = node as Element;
    const tag = child.tagName.toUpperCase();
    if (tag === "BR") {
      const oneBr = child.hasAttribute("data-one-br")
        ? { oneBr: true as const }
        : {};
      runs.push({ text: LINE_BREAK, ...oneBr });
      continue;
    }
    if (tag === "TABLE") continue;
    const style = parseStyle(child.getAttribute("style") ?? "");
    const childCtx: Ctx = { ...ctx };
    if (isExplicitNonBold(style)) childCtx.bold = false;
    else if (isBold(style) || tag === "B" || tag === "STRONG")
      childCtx.bold = true;
    if (isExplicitNonItalic(style)) childCtx.italic = false;
    else if (isItalic(style) || tag === "EM" || tag === "I")
      childCtx.italic = true;
    if (isExplicitNonUnderline(style)) childCtx.underline = false;
    else if (isUnderline(style) || tag === "U") childCtx.underline = true;
    const rawColor = style["color"];
    if (rawColor) {
      childCtx.color = canonicalizeText(rawColor, ctx.bg, tok) ?? ctx.color;
    }
    if (tag === "A") {
      childCtx.href = child.getAttribute("href") ?? ctx.href;
    }
    if (
      tag === "SPAN" &&
      rawColor &&
      !childCtx.href &&
      childCtx.underline &&
      isLinkColor(childCtx.color ?? rawColor)
    ) {
      childCtx.href = tok.placeholderHref;
    }
    runs.push(...collectRuns(child, childCtx, tok));
  }
  return runs;
}
function lengthToPt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = parseFloat(value);
  if (isNaN(n)) return undefined;
  return value.trim().endsWith("px") ? n * (72 / 96) : n;
}
const ACCENT_PAD_MAX_PX = 100;
function ptToIndentPx(pt: number): number {
  return Math.min(ACCENT_PAD_MAX_PX, Math.max(0, Math.round(pt * (96 / 72))));
}
function shorthandLeftPt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) return undefined;
  const leftPart =
    parts.length >= 4 ? parts[3] : parts.length >= 2 ? parts[1] : parts[0];
  return lengthToPt(leftPart);
}
function parseParagraph(
  el: Element,
  bg: string,
  tok: Tokens,
): Paragraph | null {
  const tag = el.tagName.toUpperCase();
  const style = parseStyle(el.getAttribute("style") ?? "");
  const align = getAlign(style);
  const headingMatch = tag.match(/^H([1-6])$/);
  const isHeading = Boolean(headingMatch);
  const headingLevel = headingMatch ? parseInt(headingMatch[1]) : undefined;
  const size = isHeading ? sizeFromTag(tag) : "body";
  const ctx: Ctx = { bold: false, italic: false, underline: false, bg };
  const rawRuns = collectRuns(el, ctx, tok);
  const merged = mergeRuns(rawRuns);
  const { lines: rawLines, tightNext, tightBefore } = splitIntoLines(merged);
  const lines: Run[][] = [];
  const paraBreaks = new Set<number>();
  for (const line of rawLines) {
    if (line.length === 0) {
      if (lines.length > 0) paraBreaks.add(lines.length);
    } else {
      lines.push(line);
    }
  }
  if (lines.length === 0) return null;
  const rawBg = style["background-color"];
  const ownBg = rawBg ? (canonicalizeBg(rawBg, tok) ?? undefined) : undefined;
  const ownBorder = parseBorderSpec(style, tok);
  const leftIndentPt =
    lengthToPt(style["padding-left"]) ??
    shorthandLeftPt(style["padding"]) ??
    lengthToPt(style["margin-left"]);
  const accentPadX =
    leftIndentPt !== undefined ? ptToIndentPx(leftIndentPt) : undefined;
  return {
    type: "p",
    align,
    size,
    headingLevel,
    bg: ownBg,
    border: ownBorder,
    accentPadX,
    lines,
    paraBreaks: paraBreaks.size ? paraBreaks : undefined,
    tightNext: tightNext || undefined,
    tightBefore: tightBefore || undefined,
    marginTopPt: lengthToPt(style["margin-top"]),
    marginBottomPt: lengthToPt(style["margin-bottom"]),
  };
}
function parseImage(el: Element, warn?: WarnFn): ImageNode | null {
  const src = el.getAttribute("src");
  if (!src) {
    warn?.(WARN.imageWithoutSrc);
    return null;
  }
  const alt = el.getAttribute("alt") ?? undefined;
  return { type: "img", src, alt };
}
function extractImages(
  el: Element,
  warn?: WarnFn,
): {
  before: ImageNode[];
  after: ImageNode[];
} {
  const before: ImageNode[] = [];
  const after: ImageNode[] = [];
  for (const imgEl of Array.from(el.querySelectorAll("img"))) {
    const img = parseImage(imgEl, warn);
    if (!img) continue;
    const range = el.ownerDocument.createRange();
    range.setStart(el, 0);
    range.setEndBefore(imgEl);
    (range.toString().trim() ? after : before).push(img);
  }
  return { before, after };
}
function extractBorderColorToken(v: string, tok: Tokens): string | undefined {
  const colorMatch = v.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)/);
  if (colorMatch) return colorMatch[0];
  const words = v.match(/[a-z]+/g) ?? [];
  return words.find((w) => canonicalizeBg(w, tok) !== null);
}
const BORDER_WIDTH_MAX_PX = 12;
function parseBorderSide(
  value: string | undefined,
  tok: Tokens,
): BorderSide | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (!v || v === "none") return undefined;
  const colorToken = extractBorderColorToken(v, tok);
  if (!colorToken) return undefined;
  const widthMatch = v.match(/([\d.]+)\s*(pt|px)/);
  const width = widthMatch ? parseFloat(widthMatch[1]) : 1;
  if (width <= 0) return undefined;
  const color = canonicalizeBg(colorToken, tok);
  if (!color) return undefined;
  const side: BorderSide = { color };
  if (widthMatch) {
    const px = widthMatch[2] === "pt" ? width * (96 / 72) : width;
    side.widthPx = Math.min(BORDER_WIDTH_MAX_PX, Math.max(1, Math.round(px)));
  }
  if (/\bdashed\b/.test(v)) side.style = "dashed";
  else if (/\bdotted\b/.test(v)) side.style = "dotted";
  return side;
}
function parseBorderSpec(
  style: Record<string, string>,
  tok: Tokens,
): BorderSpec | undefined {
  const shorthand = style["border"];
  const top = parseBorderSide(style["border-top"] ?? shorthand, tok);
  const right = parseBorderSide(style["border-right"] ?? shorthand, tok);
  const bottom = parseBorderSide(style["border-bottom"] ?? shorthand, tok);
  const left = parseBorderSide(style["border-left"] ?? shorthand, tok);
  if (!top && !right && !bottom && !left) return undefined;
  return { top, right, bottom, left };
}
function parseTable(
  el: Element,
  bg: string,
  tok: Tokens,
  warn?: WarnFn,
): TableNode | null {
  const cols = Array.from(el.querySelectorAll(":scope > colgroup > col"));
  const colWidths =
    cols.length > 0
      ? cols
          .map((c) => parseInt(c.getAttribute("width") ?? "0"))
          .filter((n) => n > 0)
      : undefined;
  const rowEls = Array.from(el.querySelectorAll("tr")).filter(
    (r) => r.closest("table") === el,
  );
  const rows: RowNode[] = [];
  for (const rowEl of rowEls) {
    const cellEls = Array.from(rowEl.querySelectorAll("td, th")).filter(
      (c) => c.closest("table") === el,
    );
    const cells: CellNode[] = cellEls.map((cellEl) => {
      const cellStyle = parseStyle(cellEl.getAttribute("style") ?? "");
      const rawBg = cellStyle["background-color"];
      const cellBg = rawBg
        ? (canonicalizeBg(rawBg, tok) ?? undefined)
        : undefined;
      const cellAlign =
        getAlign(cellStyle) ??
        (cellEl.getAttribute("align") as Align | undefined);
      const colspan = parseInt(cellEl.getAttribute("colspan") ?? "1");
      const border = parseBorderSpec(cellStyle, tok);
      const children = fromDom(cellEl as Element, cellBg ?? bg, tok, warn);
      return {
        type: "cell" as const,
        bg: cellBg,
        border,
        align: cellAlign,
        isHeader: cellEl.tagName.toUpperCase() === "TH",
        colspan: colspan > 1 ? colspan : undefined,
        children,
      };
    });
    if (cells.length > 0) rows.push({ type: "row", cells });
  }
  if (rows.length === 0) return null;
  return { type: "table", rows, colWidths };
}
function parseFooter(
  el: Element,
  bg: string,
  tok: Tokens,
  warn?: WarnFn,
): FooterNode | null {
  const structural = fromDom(el, bg, tok, warn);
  const paragraphs = structural.filter(
    (node): node is Paragraph => node.type === "p",
  );
  if (paragraphs.length === 0) {
    const paragraph = parseParagraph(el, bg, tok);
    if (paragraph) paragraphs.push(paragraph);
  }
  const lines: Run[][] = [];
  const paraBreaks = new Set<number>();
  for (const paragraph of paragraphs) {
    if (lines.length > 0) paraBreaks.add(lines.length);
    const offset = lines.length;
    lines.push(...paragraph.lines);
    for (const index of paragraph.paraBreaks ?? []) {
      paraBreaks.add(offset + index);
    }
  }
  if (lines.length === 0) return null;
  const align =
    el.getAttribute("data-advanced-footer") === "center" ? "center" : "left";
  return {
    type: "footer",
    align,
    lines,
    paraBreaks: paraBreaks.size ? paraBreaks : undefined,
  };
}
let listGroupCounter = 0;
export function resetListGroupCounter(): void {
  listGroupCounter = 0;
}
export function fromDom(
  root: Element,
  bg = "#ffffff",
  tok: Tokens = defaultTokens,
  warn?: WarnFn,
): StructuralNode[] {
  const nodes: StructuralNode[] = [];
  let pendingGap = false;
  let pendingTight = false;
  const applyPending = (p: Paragraph) => {
    if (pendingGap) p.gapBefore = true;
    if (pendingTight) p.tightBefore = true;
    pendingGap = pendingTight = false;
  };
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toUpperCase();
    if (tag === "META" || tag === "STYLE" || tag === "SCRIPT") continue;
    if (tag === "BR") {
      if (el.hasAttribute("data-one-br")) pendingTight = true;
      else pendingGap = true;
      continue;
    }
    if (tag === "IMG") {
      const img = parseImage(el, warn);
      if (img) nodes.push(img);
      pendingGap = pendingTight = false;
      continue;
    }
    if (/^H[1-6]$/.test(tag) || tag === "P") {
      const { before, after } = extractImages(el, warn);
      nodes.push(...before);
      if (before.length > 0) pendingGap = pendingTight = false;
      const p = parseParagraph(el, bg, tok);
      if (p) {
        applyPending(p);
        nodes.push(p);
      } else if (before.length === 0 && after.length === 0) {
        pendingGap = true;
      }
      nodes.push(...after);
      if (after.length > 0) pendingGap = pendingTight = false;
      continue;
    }
    if (tag === "DIV" && el.hasAttribute("data-advanced-footer")) {
      const footer = parseFooter(el, bg, tok, warn);
      if (footer) nodes.push(footer);
      pendingGap = pendingTight = false;
      continue;
    }
    if (tag === "DIV" && el.hasAttribute("data-advanced-signature")) {
      nodes.push({ type: "signature" });
      pendingGap = pendingTight = false;
      continue;
    }
    if (tag === "DIV" && el.hasAttribute("data-side-image")) {
      const side =
        el.getAttribute("data-side-image") === "left" ? "left" : "right";
      const children = fromDom(el, bg, tok, warn);
      const wrapNode: SideImageWrapNode = {
        type: "sideImageWrap",
        side,
        children,
      };
      if (pendingTight) wrapNode.tightBefore = true;
      nodes.push(wrapNode);
      pendingGap = pendingTight = false;
      continue;
    }
    if (
      tag === "DIV" ||
      tag === "BLOCKQUOTE" ||
      tag === "SECTION" ||
      tag === "ARTICLE" ||
      tag === "HEADER" ||
      tag === "FOOTER" ||
      tag === "FIGURE" ||
      tag === "MAIN" ||
      tag === "ASIDE"
    ) {
      const children = fromDom(el, bg, tok, warn);
      const first = children[0];
      if (first?.type === "p") applyPending(first);
      else if (first?.type === "table" && pendingGap) first.gapBefore = true;
      nodes.push(...children);
      pendingGap = pendingTight = false;
      continue;
    }
    if (tag === "TABLE") {
      const table = parseTable(el, bg, tok, warn);
      if (table) {
        if (pendingGap) table.gapBefore = true;
        nodes.push(table);
      }
      pendingGap = pendingTight = false;
      continue;
    }
    if (tag === "UL" || tag === "OL") {
      listGroupCounter += 1;
      const groupId = listGroupCounter;
      for (const li of Array.from(el.querySelectorAll(":scope > li"))) {
        const p = parseParagraph(li as Element, bg, tok);
        if (p) {
          p.listItem = true;
          p.ordered = tag === "OL";
          p.listGroupId = groupId;
          applyPending(p);
          nodes.push(p);
        }
      }
      continue;
    }
    const { before, after } = extractImages(el, warn);
    nodes.push(...before);
    const p = parseParagraph(el, bg, tok);
    if (p) {
      applyPending(p);
      nodes.push(p);
    }
    nodes.push(...after);
  }
  return nodes;
}
