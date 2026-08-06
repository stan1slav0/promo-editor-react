// Phase 3: dispatch StructuralNode[] → ComponentNode[].

import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { isGapBoundary } from "../ir/spacing";
import type { ComponentNode, ParagraphProps, Run,StructuralNode, TableNode, WarnFn } from "../ir/types";
import { WARN } from "../warnings";
import { classifyFlow } from "./flowBlock";
import { classifySingleCell, classifyTable } from "./tableBlock";

// Manually-typed list/checklist markers — GDocs paragraphs that fake a list with a leading
// glyph instead of real <ul>/<li> markup. Only used as a PAIR signal (both adjacent
// paragraphs must start with a marker), so a lone dash-led sentence never triggers it.
const LIST_MARKER_CHARS = new Set([
  "•", "◦", "▪", "▸", "►", "➤", "‣", "·", "●", "○", "✓", "✔", "✗", "✕", "✅", "❌", "☐", "☑", "-", "*", "→",
]);

function startsWithListMarker(line: Run[] | undefined): boolean {
  const text = line?.[0]?.text;
  if (!text) return false;
  const trimmed = text.trim();
  // Isolated marker run ("✓ " styled separately from the text after it — GDocs splits
  // differently-formatted spans into separate runs)
  if (LIST_MARKER_CHARS.has(trimmed) || /^\d{1,2}[.)]$/.test(trimmed)) return true;
  // Marker typed inline in the same run — must be followed by whitespace
  const first = trimmed[0];
  if (LIST_MARKER_CHARS.has(first) && /^\S\s/.test(trimmed)) return true;
  return /^\d{1,2}[.)]\s/.test(trimmed);
}

function pushMerged(result: ComponentNode[], comp: ComponentNode, tok: Tokens, warn?: WarnFn): void {
  const last = result[result.length - 1];

  // align defaults to "left" at render time — treat undefined and "left" as equal here
  const alignOf = (p: ParagraphProps) => p.align ?? "left";

  if (comp.kind === "paragraph" && last?.kind === "paragraph" &&
      last.props.size === comp.props.size &&
      last.props.variant === comp.props.variant &&
      alignOf(last.props) === alignOf(comp.props)) {
    const lastLines = last.props.lines;
    const newLines = comp.props.lines;
    if (newLines.length === 0) return;  // empty comp contributes nothing — drop it
    const breakIdx = lastLines.length;
    // Boundary decision, in priority order:
    //  1. § on either end (tightNext on the previous paragraph / tightBefore on this
    //     one) → line break; the explicit marker always wins.
    //  2. Structural/convention signals (unless an author-typed blank line — gapBefore —
    //     sits on the boundary): centered (GDocs banner/eyebrow convention), marker pair
    //     (BOTH lines start with a bullet/checkmark glyph — a hand-typed checklist; the
    //     pair requirement keeps a lone dash-led sentence prose) → line break. (Real
    //     <ul>/<li> lists don't reach this merge at all — they route to their own "list"
    //     ComponentNode in classifyFlow, merged separately below.)
    //  3. isGapBoundary (ir/spacing.ts): blank line → gap; margin sum below the
    //     threshold token → line break; margins undeclared → gap. This pairwise rule
    //     replaced both the reverted chain-relative margin heuristic (one large-margin
    //     opener collapsed a whole section — pairwise sums have no chain memory) and
    //     the interim zero-margin-pair rule (0+0 is just a sum below the threshold).
    const isMarkerPair = startsWithListMarker(newLines[0]) &&
      startsWithListMarker(lastLines[breakIdx - 1]);
    const isTight = last.props.tightNext === true || comp.props.tightBefore === true ||
      (comp.props.gapBefore !== true &&
        (alignOf(comp.props) === "center" || isMarkerPair)) ||
      !isGapBoundary(last.props, comp.props, tok);
    const compBreaks = comp.props.paraBreaks;

    // Build the merged paragraph without mutating the node already in `result`.
    const breaks = new Set<number>(last.props.paraBreaks);
    // Track paragraph boundary so renderLines can use <br><br> here.
    if (!isTight) breaks.add(breakIdx);
    // comp's own internal blank lines (author-typed <br><br> inside one <p>) survive
    // the merge regardless of tightness — carry them over, offset by breakIdx.
    if (compBreaks) for (const idx of compBreaks) breaks.add(idx + breakIdx);

    result[result.length - 1] = {
      kind: "paragraph",
      props: {
        ...last.props,
        lines: [...lastLines, ...newLines],
        paraBreaks: breaks.size ? breaks : undefined,
        // comp is now the tail of the merged paragraph — its own tightNext /
        // marginBottomPt (not last's, which were already consumed above) govern
        // the NEXT merge.
        tightNext: comp.props.tightNext,
        marginBottomPt: comp.props.marginBottomPt,
      },
    };
    return;
  }

  // Consecutive <p>-with-border-left paragraphs (see Paragraph.border, classifyFlow's
  // isLeftAccentOnly branch) merge into ONE calloutLeft box instead of three separate
  // bordered blocks — same boundary rule as the plain-paragraph merge above (§ wins,
  // blank line forces the gap, small margin sums mean adjacent lines). Only merges when
  // the accent itself matches — a color/width/style/indent change means a new, deliberately
  // distinct box.
  if (comp.kind === "calloutLeft" && last?.kind === "calloutLeft" &&
      last.props.accentColor === comp.props.accentColor &&
      last.props.accentWidthPx === comp.props.accentWidthPx &&
      last.props.accentStyle === comp.props.accentStyle &&
      last.props.accentPadX === comp.props.accentPadX &&
      last.props.bg === comp.props.bg) {
    const lastLines = last.props.lines;
    const newLines = comp.props.lines;
    if (newLines.length === 0 && !comp.props.buttons?.length && !comp.props.bands?.length && !comp.props.tables?.length) return;
    const breakIdx = lastLines.length;
    const isTight = last.props.tightNext === true || comp.props.tightBefore === true ||
      !isGapBoundary(last.props, comp.props, tok);
    const compBreaks = comp.props.paraBreaks;
    const breaks = new Set<number>(last.props.paraBreaks);
    if (!isTight) breaks.add(breakIdx);
    if (compBreaks) for (const idx of compBreaks) breaks.add(idx + breakIdx);
    // comp's own nested buttons/bands (see CalloutLeftProps.buttons/bands) — offset onto
    // the merged lines array so their atLine still points at the right spot; dropped
    // silently before this fix (see fix-advanced.md, Ітерація 6).
    const offsetAtLine = <T,>(items: { atLine: number; props: T }[] | undefined, by: number) =>
      items?.map(i => ({ ...i, atLine: i.atLine + by }));
    // tables entries carry `node` instead of `props` (see AlertBandProps.tables) — same
    // atLine-offset shift, different field name.
    const offsetTableAtLine = (items: { atLine: number; node: ComponentNode }[] | undefined, by: number) =>
      items?.map(i => ({ ...i, atLine: i.atLine + by }));
    const mergeArr = <T,>(a: T[] | undefined, b: T[] | undefined): T[] | undefined => {
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
        buttons: mergeArr(last.props.buttons, offsetAtLine(comp.props.buttons, breakIdx)),
        bands: mergeArr(last.props.bands, offsetAtLine(comp.props.bands, breakIdx)),
        tables: mergeArr(last.props.tables, offsetTableAtLine(comp.props.tables, breakIdx)),
      },
    };
    return;
  }

  // The full merge above requires matching size/variant/align — a § between a headline
  // and body text (or center- and left-aligned paragraphs) can't share one <span>'s
  // formatting, so it falls through here instead. The two blocks stay separate, but the
  // author's "no gap" intent still collapses the padding between them to roughly a
  // single-<br> gap instead of the default double block padding. Same boundary rule as
  // the full merge (isGapBoundary): § wins outright, blank line forces the gap, small
  // margin sums mean the author saw these as adjacent lines.
  if (comp.kind === "paragraph" && last?.kind === "paragraph" &&
      !isGapBoundary(last.props, comp.props, tok)) {
    result[result.length - 1] = { ...last, props: { ...last.props, tightAfter: true } };
    comp = { ...comp, props: { ...comp.props, tightBefore: true } };
  }

  // § at the start of a paragraph that follows an image or an i-r-s/i-l-s side-image
  // wrap ("[image] §text") — neither can merge with text, but the "no gap" intent
  // still applies: zero the previous block's bottom padding; the paragraph's own
  // tightBefore already zeroes its top padding. Two separate branches (rather than
  // one `last?.kind === "image" || last?.kind === "sideImage"` condition) because
  // spreading `last.props` into a fresh object loses the kind/props correlation
  // TypeScript needs to keep the result assignable to the ComponentNode union.
  if (comp.kind === "paragraph" && last?.kind === "image" && comp.props.tightBefore === true) {
    result[result.length - 1] = { ...last, props: { ...last.props, tightAfter: true } };
  }
  if (comp.kind === "paragraph" && last?.kind === "sideImage" && comp.props.tightBefore === true) {
    result[result.length - 1] = { ...last, props: { ...last.props, tightAfter: true } };
  }

  // A real <ul>/<ol> renders inline with the surrounding prose (intro line → list →
  // continuing prose, all one <td>) instead of its own separate block — matches GDocs'
  // own visual layout. Attach to a plain body paragraph immediately before it; headline/
  // quote-variant text keeps the list separate since embedding would inherit the wrong
  // font-size/weight for the list items.
  const isPlainBodyParagraph = (p: ComponentNode | undefined): p is Extract<ComponentNode, { kind: "paragraph" }> =>
    p?.kind === "paragraph" && p.props.size === "body" && !p.props.variant;

  if (comp.kind === "list" && isPlainBodyParagraph(last)) {
    const attached = last.props.lists ?? [];
    const atLine = last.props.lines.length;
    const prev = attached[attached.length - 1];
    // Each <li> arrives as its own single-item "list" node (classifyFlow processes one
    // StructuralNode at a time) — if the previous attached list is at the same position,
    // same ordered-ness AND same listGroupId (see Paragraph.listGroupId — distinguishes
    // two adjacent-but-different <ul>/<ol> of matching ordered-ness from consecutive items
    // of the SAME list), this is another item from the SAME <ul>/<ol>: append, don't start
    // a second list at the same spot.
    const lists = prev && prev.atLine === atLine && prev.props.ordered === comp.props.ordered &&
      prev.props.listGroupId === comp.props.listGroupId
      ? [...attached.slice(0, -1), { atLine, props: { ...prev.props, items: [...prev.props.items, ...comp.props.items] } }]
      : [...attached, { atLine, props: comp.props }];
    result[result.length - 1] = { ...last, props: { ...last.props, lists } };
    return;
  }

  // Mirror of the above for a list that comes FIRST, followed by prose — the paragraph
  // absorbs the preceding list at its own start (atLine 0).
  if (comp.kind === "paragraph" && comp.props.size === "body" && !comp.props.variant && last?.kind === "list") {
    result[result.length - 1] = {
      kind: "paragraph",
      props: { ...comp.props, lists: [{ atLine: 0, props: last.props }] },
    };
    return;
  }

  // Fallback: no adjacent paragraph to attach to (e.g. document starts with a <ul>, or
  // the previous block is an image/table) — each <li> arrives as its own single-item
  // "list" node; merge consecutive ones from the same <ul>/<ol> into one list instead of
  // emitting a separate <ul> per item. Different ordered-ness (a <ul> immediately
  // followed by an <ol>) OR a different listGroupId (two adjacent but separate <ul>s of
  // the same ordered-ness) stays two separate lists.
  if (comp.kind === "list" && last?.kind === "list" && last.props.ordered === comp.props.ordered &&
      last.props.listGroupId === comp.props.listGroupId) {
    result[result.length - 1] = {
      kind: "list",
      props: { items: [...last.props.items, ...comp.props.items], ordered: last.props.ordered, listGroupId: last.props.listGroupId },
    };
    return;
  }

  // An author-typed blank line between two tables (comp.props.gapBefore, propagated from
  // TableNode.gapBefore — see ir/fromDom.ts) is an explicit "these are two separate tables"
  // signal that overrides the same-column-count merge below, even when both happen to have
  // the same number of columns (e.g. two unrelated 3-column tables in one document).
  if (comp.kind === "recordRow" && last?.kind === "recordRow" && !comp.props.gapBefore &&
      !last.props.band && !comp.props.band) {
    const lastRows = last.props.rows;
    const newRows = comp.props.rows;
    if (lastRows[0]?.cells?.length === newRows[0]?.cells?.length) {
      // Merge keeps the first table's borderColor/widths — warn if the second table
      // actually disagrees, so a silently-repainted table doesn't go unnoticed.
      if (comp.props.borderColor !== last.props.borderColor ||
          JSON.stringify(comp.props.widths) !== JSON.stringify(last.props.widths)) {
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

export function classify(nodes: StructuralNode[], tok: Tokens = defaultTokens, warn?: WarnFn): ComponentNode[] {
  const result: ComponentNode[] = [];
  const classifyChildren = (n: StructuralNode[]) => classify(n, tok, warn);

  for (const node of nodes) {
    if (node.type === "table") {
      const component = classifyTable(node as TableNode, tok, warn, classifyChildren);
      if (component) {
        pushMerged(result, component, tok, warn);
      } else {
        // classifyTable returned null → a multi-row single-col table (every row is one
        // cell). Each such cell may be its own colored band / bordered callout, with the
        // bg + border living on the <td> itself, not its children. Re-classify the whole
        // cell via classifySingleCell so that styling survives — iterating cell.children
        // alone would silently drop the cell's bg/border (e.g. a stacked dark header +
        // red sub-band renders as plain uncolored text). When the cell is transparent and
        // borderless, classifySingleCell returns null and we fall back to its children.
        // Classify each row's single cell once. When EVERY row is a plain colored fill
        // (an alertBand with no nested button/band/image), the table is a stack of flush
        // colored bands — merge them into ONE bandStack so they render inside a single
        // shared wrapper with no gap between rows, matching the source table's zero
        // inter-row margin (a dark headline band directly over a red sub-band). A
        // heterogeneous stack (a transparent or bordered row mixed in) falls back to
        // emitting each cell's component individually — bg still preserved via
        // classifySingleCell; transparent/borderless cells unwrap to their children.
        const tableRows = (node as TableNode).rows;
        const cellComps = tableRows.map(r =>
          r.cells.length === 1 ? classifySingleCell(r.cells[0], tok, warn, classifyChildren) : null);
        const isPlainBand = (c: ComponentNode | null): c is Extract<ComponentNode, { kind: "alertBand" }> =>
          c?.kind === "alertBand" && !c.props.buttons?.length && !c.props.bands?.length && !c.props.images?.length && !c.props.tables?.length;
        if (tableRows.length >= 2 && cellComps.every(isPlainBand)) {
          pushMerged(result, {
            kind: "bandStack",
            props: {
              rows: cellComps.map(c => ({
                bg: c.props.bg,
                lines: c.props.lines,
                paraBreaks: c.props.paraBreaks,
                align: c.props.align,
                border: c.props.border,
              })),
            },
          }, tok, warn);
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
      const comp: ComponentNode = { kind: "image", props: { src: node.src, alt: node.alt } };
      // § at the end of the paragraph right before this image ("text§ [image]") —
      // mirror of the image-then-paragraph case in pushMerged: zero the paragraph's
      // bottom padding and the image's top padding.
      const last = result[result.length - 1];
      if (last?.kind === "paragraph" && last.props.tightNext === true) {
        result[result.length - 1] = { ...last, props: { ...last.props, tightAfter: true } };
        comp.props.tightBefore = true;
      }
      result.push(comp);
    } else if (node.type === "sideImageWrap") {
      const children = classify(node.children, tok, warn);
      if (children.length === 0) continue;  // empty wrap (author selected nothing) — drop it
      // The realistic/intended use (see markers.ts's hint: "wrap only normal text, no
      // picture") is one or more plain body paragraphs — pushMerged already fuses
      // consecutive same-style body paragraphs into one, so this is almost always a
      // single node here. Anything else (a headline mixed in, a list, an image/table)
      // still renders — never silently dropped — but toEmailHtml.ts's render falls back
      // to a plain stacked layout instead of floating the image beside the text, since
      // a headline-sized paragraph flattened into the wrap's single shared <span> would
      // otherwise render at the wrong font size.
      const flowable = children.every(c =>
        (c.kind === "paragraph" && c.props.size === "body" && !c.props.variant) || c.kind === "list");
      if (!flowable) warn?.(WARN.sideImageMixedContent);
      const comp: ComponentNode = { kind: "sideImage", props: { side: node.side, tightBefore: node.tightBefore }, children };
      // § at the end of the paragraph right before this wrap — same convention as image.
      const last = result[result.length - 1];
      if (last?.kind === "paragraph" && last.props.tightNext === true) {
        result[result.length - 1] = { ...last, props: { ...last.props, tightAfter: true } };
        comp.props.tightBefore = true;
      }
      result.push(comp);
    }
  }

  return result;
}
