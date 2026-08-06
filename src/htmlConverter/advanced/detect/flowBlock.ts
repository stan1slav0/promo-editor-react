// Phase 4: classify <p>/<h*> StructuralNodes into paragraph ComponentNodes.

import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { joinLinesWithSpace } from "../ir/runs";
import type { ComponentNode, Run,StructuralNode } from "../ir/types";

/**
 * GDocs' manual "pseudo-column" idiom: instead of a real table, the author pads a run of
 * text with a long stretch of &nbsp; (already collapsed to regular spaces by fromDom, but
 * the run length survives since these spans carry white-space:pre-wrap) to visually push a
 * second, differently-styled run to the right. Detected narrowly — a single line, exactly
 * two runs, no link on either — so ordinary double-spaced prose is never misread as a table;
 * see fix-advanced.md-style conservative scoping used throughout this file's other checks.
 */
export function detectTextSplit(lines: Run[][], tok: Tokens): { left: Run; right: Run } | null {
  if (lines.length !== 1 || lines[0].length !== 2) return null;
  const [first, second] = lines[0];
  if (first.href || second.href) return null;
  const gapRe = new RegExp(`^(.*\\S)( {${tok.layout.textSplitGapMinSpaces},})$`, "s");
  const m = first.text.match(gapRe);
  if (!m) return null;
  const rightText = second.text.trim();
  if (!rightText) return null;
  return { left: { ...first, text: m[1] }, right: { ...second, text: rightText } };
}

/** A 2-column, 50/50, borderless recordRow from a detectTextSplit result — reuses the
 *  existing recordRow render path entirely (no new template/render code). */
export function textSplitToRecordRow(split: { left: Run; right: Run }): ComponentNode {
  return {
    kind: "recordRow",
    props: {
      widths: [50, 50],
      rows: [{ cells: [
        { lines: [[split.left]], align: "left" },
        { lines: [[split.right]], align: "left" },
      ] }],
    },
  };
}

export function classifyFlow(nodes: StructuralNode[], tok: Tokens = defaultTokens): ComponentNode[] {
  const result: ComponentNode[] = [];
  for (const node of nodes) {
    if (node.type !== "p") continue;
    const { lines, align, size, headingLevel, bg, border, accentPadX, paraBreaks, listItem, ordered, listGroupId, tightNext, tightBefore,
      marginTopPt, marginBottomPt, gapBefore } = node;
    if (!lines.some(l => l.length > 0)) continue;

    // Heading levels are markers matching the simple converter's conventions:
    // H1/H2 → headline size (set in fromDom), H4 → quote, H5 → button,
    // H6 → small size (fromDom). H3 has no special role — renders as body text.

    // h5 → button component (matches simple converter "Кнопка" marker). bg comes from the
    // document when the author colored the <h5> itself (not a wrapping colored <td> — see
    // classifySingleCell's hasButtonMarker branch for that case); tok.color.button is only
    // the house fallback for a plain (uncolored) standalone h5.
    if (headingLevel === 5) {
      const allRuns: Run[] = joinLinesWithSpace(lines);
      result.push({ kind: "buttonBand", props: { runs: allRuns, bg: bg ?? tok.color.button, href: tok.placeholderHref } });
      continue;
    }

    // h4 → indented quote paragraph (matches simple converter "Відступ" marker)
    if (headingLevel === 4) {
      result.push({ kind: "paragraph", props: { lines, align, size, variant: "quote", paraBreaks, tightNext, tightBefore, marginTopPt, marginBottomPt, gapBefore } });
      continue;
    }

    // Real <ul>/<li> (structurally certain, see Paragraph.listItem) → a "list"
    // ComponentNode, rendered as an actual <ul>/<ol> — pushMerged (classify.ts) merges
    // consecutive <li> items into one list, same convention as recordRow's table merge.
    if (listItem) {
      result.push({ kind: "list", props: { items: [joinLinesWithSpace(lines)], ordered: ordered ?? false, listGroupId } });
      continue;
    }

    // A <p> with its own border-left (not a wrapping colored <td> — see classifySingleCell's
    // isLeftAccentOnly branch for that case) is the same "quote/callout accent" convention,
    // just declared directly on the paragraph. A table is needed to give it real padding
    // (a plain <p> can't), so this becomes a "calloutLeft" ComponentNode — pushMerged
    // (classify.ts) merges consecutive same-accent paragraphs into one box, same boundary
    // rule (isGapBoundary/§) as plain paragraph merging.
    // size === "body" only: CalloutLeftProps has no size/align field, so a heading
    // (h1/h2 "headline", h6 "small") with border-left routed here would silently lose its
    // size/alignment, rendering as 14px left-aligned body text — see fix-advanced.md,
    // Ітерація 8. A heading with border-left falls through to the plain "paragraph" case
    // below instead — the border itself is dropped there (ParagraphProps carries no border),
    // same as before border-left support existed for flow paragraphs.
    const isLeftAccentOnly = size === "body" &&
      Boolean(border?.left) && !border?.top && !border?.right && !border?.bottom;
    if (isLeftAccentOnly) {
      result.push({
        kind: "calloutLeft",
        props: {
          lines, paraBreaks, accentColor: border!.left!.color, accentWidthPx: border!.left!.widthPx, accentStyle: border!.left!.style,
          accentPadX, tightNext, tightBefore, marginTopPt, marginBottomPt, gapBefore,
        },
      });
      continue;
    }

    // Plain, unstyled body text only — a colored/bordered/non-left-aligned paragraph is a
    // more deliberate authoring choice, and the source gives no real signal that "gap the
    // wrong shape" belongs there too (conservative: fall through to plain text instead of
    // guessing). See detectTextSplit's own doc comment for the detection itself.
    if (size === "body" && !bg && !border && (!align || align === "left")) {
      const split = detectTextSplit(lines, tok);
      if (split) {
        result.push(textSplitToRecordRow(split));
        continue;
      }
    }

    result.push({ kind: "paragraph", props: { lines, align, size, paraBreaks, tightNext, tightBefore, marginTopPt, marginBottomPt, gapBefore } });
  }
  return result;
}
