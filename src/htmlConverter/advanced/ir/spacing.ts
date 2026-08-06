// The single decision function for "is this paragraph boundary a line break or a gap".
// Shared by classify.ts (flow paragraphs) and tableBlock.ts (flattened cell content) so
// both paths speak the same language the author does.

import type { Tokens } from "../config/tokens";

export interface BoundaryPrev {
  tightNext?: boolean;
  marginBottomPt?: number;
}

export interface BoundaryCur {
  tightBefore?: boolean;
  gapBefore?: boolean;
  marginTopPt?: number;
}

/**
 * Deterministic paragraph-boundary rule, in priority order:
 *   1. § on either end (tightNext / tightBefore) → LINE BREAK — the explicit marker
 *      always wins.
 *   2. An author-typed blank line on the boundary (gapBefore: top-level <br> or an
 *      empty <p>) → GAP.
 *   3. Margin sum: prev margin-bottom + cur margin-top (both explicitly declared,
 *      pt) < tok.layout.gapMarginThresholdPt → LINE BREAK; at/above → GAP. GDocs
 *      "paragraph style" spacing (0–4pt per side) reads as adjacent lines in the
 *      document; deliberate section spacing (14pt+) reads as a gap.
 *   4. Margins not declared on either side (non-GDocs input) → GAP — the
 *      conservative default; a missing declaration is unknown, not zero.
 *
 * Returns true when the boundary is a GAP (<br><br>), false for a LINE BREAK (<br>).
 */
export function isGapBoundary(prev: BoundaryPrev, cur: BoundaryCur, tok: Tokens): boolean {
  if (prev.tightNext === true || cur.tightBefore === true) return false;
  if (cur.gapBefore === true) return true;
  if (prev.marginBottomPt !== undefined && cur.marginTopPt !== undefined) {
    return prev.marginBottomPt + cur.marginTopPt >= tok.layout.gapMarginThresholdPt;
  }
  return true;
}
