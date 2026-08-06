import { STORAGE_PROVIDERS_CONFIG } from "../../constants";
import type { TokensOverride } from "../config/tokens";

// Red profile — values ported from the same standalone tool as
// simple/profiles/red.ts. Only fields with a real, known Red-specific value
// are set here; concepts Red's original script never had (statsGrid,
// calloutBox/calloutLeft, recordRow, alertBand — all advanced-only IR
// components) are left at their inherited base defaults, same convention as
// ttt.ts/alphaone.ts.
export const profile: TokensOverride = {
  font: {
    stack: "'Noto Sans', Arial, Helvetica, sans-serif",
    headlinePx: 24, // matches headline/centerHeadline fontSize:"24px" in the original script
  },
  color: {
    button: "#29c329",
    link: "#0d0de3",
  },
  layout: {
    blockPadY: 16,
    sidePadding: 18, // layout-content-wrapper's "padding-left: 18px; padding-right: 18px"
    spacerPx: 14, // height="14" section-gap spacer rows
    placeholderImageWidth: 564, // hardcoded width="564" in the original wrapTextInSpan
  },
  button: {
    radius: 12, // border-radius: 12px — every other profile (default/ttt/alphaone) shares 10px
    height: 53,
    padding: "3px 4px",
    innerPadding: "10px 20px",
  },
  tags: {
    // The original script's processStyles emits <i> for italic runs, not <em> like every
    // other profile — advanced already tokenizes this per-profile, so it's captured exactly
    // (the Simple converter's shared processStyles isn't forked for this — see
    // simple/profiles/red.ts's header comment).
    italic: "i",
    // headlineWrap/blockWrap are NOT overridden: the original script wraps headlines in
    // <strong> and body blocks in <span>, matching the base default (unlike ttt/alphaone,
    // which both use <b>/<div>).
  },
  // CSS class names the original script's wrapContentInFullTableStructure/wrapButtonHtml/
  // wrapTextInSpan use in place of the default Simple converter's names.
  classes: {
    primaryTable: "layout-table-wrapper",
    verticalSpace: "layout-content-wrapper",
    innerTable: "layout-inner-block",
    spacer: "section-gap",
    btnWrap: "base-button",
    imgBg: "full-img-block", // wrapImg's <td> (signature uses "image-block" instead, but signatureImg isn't implemented in the advanced converter — see markers.ts)
  },
  // Sourced from automation/config.json (matches simple/profiles/red.ts) rather than the
  // original script's per-image dynamic path built from the file-name input + a running
  // counter. See simple/profiles/red.ts's header comment for what's confirmed vs inferred
  // in that config entry.
  placeholderImageSrc: `${STORAGE_PROVIDERS_CONFIG.providers.red.publicBaseUrl}/`,
};
