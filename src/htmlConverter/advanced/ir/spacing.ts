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
export function isGapBoundary(
  prev: BoundaryPrev,
  cur: BoundaryCur,
  tok: Tokens,
): boolean {
  if (prev.tightNext === true || cur.tightBefore === true) return false;
  if (cur.gapBefore === true) return true;
  if (prev.marginBottomPt !== undefined && cur.marginTopPt !== undefined) {
    return (
      prev.marginBottomPt + cur.marginTopPt >= tok.layout.gapMarginThresholdPt
    );
  }
  return true;
}
