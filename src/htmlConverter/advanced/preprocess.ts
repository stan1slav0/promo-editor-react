// Pre-processing pass applied to raw HTML before the DOM-based pipeline.
// Imports utility functions from the shared htmlUtils / constants layer.

import { SYMBOLS } from "../constants";
import {
  escapeRegExp,
  replaceAllEmojisAndSymbolsExcludingHTML,
} from "../utils/htmlUtils";
import type { WarnFn } from "./ir/types";
import { WARN } from "./warnings";

/**
 * § symbol (with any adjacent <br> elements absorbed) → a single <br>, tagged
 * data-one-br so fromDom.ts can tell an explicit user marker apart from a plain
 * GDocs-typed <br> — needed to detect § placed at the very end of a <p> (right
 * before </p>), which would otherwise be silently dropped as a trailing empty line.
 * No trailing "\n" in the replacement (unlike historical "<br>\n"): DOMParser turns
 * a bare newline after the tag into its own text node, and fromDom's collectRuns
 * treats a lone "\n" text node as an (unmarked) line break too — which used to
 * clobber the very data-one-br distinction this function exists to preserve.
 */
export function resolveOneBrSymbol(html: string, symbol: string = SYMBOLS.ONE_BR): string {
  const oneBrRe = new RegExp(
    `(?:<br\\s*/?>\\s*)*${escapeRegExp(symbol || SYMBOLS.ONE_BR)}(?:\\s*<br\\s*/?>)*`,
    "gi",
  );
  return html.replace(oneBrRe, '<br data-one-br="1">');
}

/** Remove zero-width chars and encode emoji/symbols as HTML entities */
export const normalizeSymbols = replaceAllEmojisAndSymbolsExcludingHTML;

const SIDE_IMAGE_MARKERS = [
  { open: "i-r-s", close: "i-r-s-e", side: "right" },
  { open: "i-l-s", close: "i-l-s-e", side: "left" },
] as const;

/**
 * `i-r-s`…`i-r-s-e` / `i-l-s`…`i-l-s-e` (see markers.ts) are inserted by
 * EditorSelectionToolbar's wrapSelectionWithMarkers as bare, attribute-less
 * `<div>i-r-s</div>` / `<div>i-r-s-e</div>` elements straddling the selected
 * blocks. ir/fromDom.ts's DIV recursion only visits ELEMENT_NODE children, so a
 * div whose sole child is a raw text node is silently dropped — the marker pair
 * must be rewritten here, before fromDom ever sees it, into a real wrapper div
 * fromDom.ts knows how to recognize (`data-side-image`).
 *
 * Matching the COMPLETE marker `<div>` tags (not just the inner text, unlike the
 * Simple converter's `/i-r-s([\s\S]*?)i-r-s-e/gi` on flattened strings) is
 * required so the replacement nests the wrapped content as a real child of the
 * new wrapper div — open/close markers are separate sibling elements, not
 * overlapping tags, so matching bare text would leave dangling stray
 * `<div>`/`</div>` fragments instead of well-formed nesting.
 */
export function resolveSideImageMarkers(html: string, warn?: WarnFn): string {
  for (const { open, close, side } of SIDE_IMAGE_MARKERS) {
    const pairRe = new RegExp(
      `<div>\\s*${escapeRegExp(open)}\\s*</div>([\\s\\S]*?)<div>\\s*${escapeRegExp(close)}\\s*</div>`,
      "gi",
    );
    html = html.replace(pairRe, (_match, inner: string) => `<div data-side-image="${side}">${inner}</div>`);
  }
  // A lone open or close marker (no partner found by the pairing above) would
  // otherwise vanish with no trace once fromDom drops its bare text — surface it
  // instead of leaving the author wondering where their wrapped text went.
  const leftoverRe = /<div>\s*i-[rl]-s(?:-e)?\s*<\/div>/gi;
  if (leftoverRe.test(html)) {
    warn?.(WARN.sideImageMarkerUnclosed);
    html = html.replace(leftoverRe, "");
  }
  return html;
}

export function preprocess(html: string, oneBrSymbol?: string, warn?: WarnFn): string {
  html = resolveOneBrSymbol(html, oneBrSymbol);
  html = resolveSideImageMarkers(html, warn);
  // normalizeSymbols is intentionally NOT called here — DOMParser in normalize()
  // decodes HTML entities back to raw characters, undoing the encoding.
  // It is applied after renderAll in index.ts instead.
  return html;
}
