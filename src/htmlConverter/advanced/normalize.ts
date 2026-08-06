// Phase 2: strip GDocs-specific noise before IR construction.
// Uses DOMParser so we handle nested structures correctly.

const ALWAYS_STRIP = new Set([
  "white-space", "vertical-align", "font-variant",
  "overflow", "overflow-wrap",
  "font-family", "font-size", "line-height",
  "margin", "margin-right",
  "padding-top", "padding-bottom", "padding-right",
  "border-collapse", "border-spacing",
]);
// Document metrics are stripped — vertical rhythm and text sizes come exclusively from
// the token system; the § marker is the author's channel for tight spacing. Deliberate
// exceptions:
//   - margin-top / margin-bottom are KEPT: fromDom reads them ONLY for the paragraph-
//     boundary rule (ir/spacing.ts isGapBoundary) — prev margin-bottom + cur margin-top,
//     both explicitly declared, summed and compared against the gapMarginThresholdPt
//     token to decide line break vs. gap. Their VALUES are never rendered. A chain-
//     relative margin comparison was tried and reverted — see pushMerged in classify.ts —
//     the pairwise sum rule has no chain memory and can't cascade.
//   - border / border-<side> are kept — fromDom reads their color (and declared
//     width, quantized to whole px) for classification (§4) and box rendering.
//   - padding-left / padding (shorthand) / margin-left are kept — fromDom reads the LEFT
//     value ONLY, as the gap between a <p>'s own border-left and its text (a quote/callout
//     convention declared directly on the paragraph, not a wrapping colored <td> — see
//     CalloutLeftProps.accentPadX). padding-top/right/bottom stay stripped; nothing reads
//     them, and the "padding" shorthand's other three values are ignored by that same reader.

const STRIP_WHEN: Array<[string, string]> = [
  ["background-color", "transparent"],
  ["border", "none"],
];
// text-decoration: none is kept even when explicit — fromDom's isExplicitNonUnderline()
// reads it to detect an author cancelling an inherited underline on a nested span.

function cleanStyle(style: string): string {
  const kept: string[] = [];
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val  = decl.slice(idx + 1).trim().toLowerCase();
    if (!prop || !val) continue;
    if (ALWAYS_STRIP.has(prop)) continue;
    if (STRIP_WHEN.some(([p, v]) => p === prop && val === v)) continue;
    kept.push(`${prop}: ${val}`);
  }
  return kept.join("; ");
}

function cleanEl(el: Element): void {
  el.removeAttribute("dir");

  const style = el.getAttribute("style");
  if (style !== null) {
    const cleaned = cleanStyle(style);
    if (cleaned) {
      el.setAttribute("style", cleaned);
    } else {
      el.removeAttribute("style");
    }
  }

  for (const child of Array.from(el.children)) {
    cleanEl(child);
  }
}

function isOneBr(node: ChildNode | null): boolean {
  return node?.nodeName === "BR" && (node as Element).hasAttribute("data-one-br");
}

function cleanBrNoise(body: HTMLElement): void {
  // Strip leading/trailing <br> from block elements (GDocs artifact: <p><br>text</p>).
  // Without this, parseParagraph produces a leading empty line that shifts paraBreak indices.
  // A <br data-one-br> is never stripped here even at a block boundary — that's the
  // ONLY position where fromDom.ts's splitIntoLines can turn it into `tightNext` (a
  // trailing break with nothing after it is otherwise silently trimmed as empty), so
  // stripping it here would silently discard every § the user places at a paragraph edge.
  body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li").forEach(el => {
    while (el.firstChild?.nodeName === "BR" && !isOneBr(el.firstChild)) el.firstChild.remove();
    while (el.lastChild?.nodeName === "BR" && !isOneBr(el.lastChild)) el.lastChild.remove();
  });

  // Unwrap <span> elements that contain only <br> tags (and optional whitespace text).
  // e.g. <span><br></span> → <br>  so the parent block's boundary cleanup above can catch it.
  body.querySelectorAll("span").forEach(span => {
    const nodes = Array.from(span.childNodes);
    if (nodes.length > 0 && nodes.every(
      n => n.nodeName === "BR" ||
           (n.nodeType === Node.TEXT_NODE && !(n.textContent?.trim()))
    )) {
      span.replaceWith(...Array.from(span.childNodes));
    }
  });
}

const INLINE_WRAPPER_TAGS = new Set(["SPAN", "B", "STRONG", "EM", "I", "U", "A"]);

function isWhitespaceText(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE && !(node.textContent?.trim());
}

function previousMeaningfulSibling(node: Node): Node | null {
  let sib = node.previousSibling;
  while (sib && isWhitespaceText(sib)) sib = sib.previousSibling;
  return sib;
}

function nextMeaningfulSibling(node: Node): Node | null {
  let sib = node.nextSibling;
  while (sib && isWhitespaceText(sib)) sib = sib.nextSibling;
  return sib;
}

/** Walks up through inline-formatting ancestors (span/b/em/…) while `node` is the
 *  first (or last) non-whitespace child at each level — the point where a real
 *  document-order sibling would sit. */
function outermostWhileEdge(node: Node, edgeSibling: (n: Node) => Node | null): Node {
  let cur = node;
  for (;;) {
    const parent = cur.parentNode as Element | null;
    if (!parent || !INLINE_WRAPPER_TAGS.has(parent.tagName)) return cur;
    if (edgeSibling(cur) !== null) return cur;
    cur = parent;
  }
}

/**
 * GDocs wraps each differently-styled run in its own <span>, so a § the author types
 * right next to an already-existing <br> often ends up one level deeper than that
 * <br> — e.g. "text</span><br><span>§text" puts the marker inside the second span,
 * not directly beside the plain <br>. preprocess.ts's string-adjacency regex can't
 * see across that span boundary, so both breaks survive and render as a double break
 * instead of the single one the user asked for. Collapse that sibling plain <br> here,
 * once there's a real DOM tree to walk across the span boundary.
 */
function collapseAdjacentPlainBr(body: HTMLElement): void {
  body.querySelectorAll("br[data-one-br]").forEach(marker => {
    const leadingEdge = outermostWhileEdge(marker, previousMeaningfulSibling);
    const prev = previousMeaningfulSibling(leadingEdge);
    if (prev && prev.nodeName === "BR" && !isOneBr(prev as ChildNode)) prev.parentNode?.removeChild(prev);

    const trailingEdge = outermostWhileEdge(marker, nextMeaningfulSibling);
    const next = nextMeaningfulSibling(trailingEdge);
    if (next && next.nodeName === "BR" && !isOneBr(next as ChildNode)) next.parentNode?.removeChild(next);
  });
}

export function normalize(rawHtml: string): HTMLBodyElement {
  const doc = new DOMParser().parseFromString(`<body>${rawHtml}</body>`, "text/html");
  const body = doc.body;

  body.querySelectorAll("meta, style, script").forEach(el => el.remove());

  body.querySelectorAll('b[id^="docs-internal-guid"]').forEach(el => {
    el.replaceWith(...Array.from(el.childNodes));
  });

  cleanEl(body);

  body.querySelectorAll("span:not([style]):not([class])").forEach(span => {
    span.replaceWith(...Array.from(span.childNodes));
  });

  cleanBrNoise(body);
  collapseAdjacentPlainBr(body);

  return body as HTMLBodyElement;
}
