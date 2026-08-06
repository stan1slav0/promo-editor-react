import { STORAGE_PROVIDERS_CONFIG } from "../../constants";
import type { TokensOverride } from "../config/tokens";

// AlfaOne profile — values taken from alphaone/templates.ts + alphaone/formatter.ts.
export const profile: TokensOverride = {
  font: {
    stack: "Verdana, Geneva, Tahoma, sans-serif",  // ALPHAONE_FONT
    headlinePx: 24,  // centerHeadline/headline pass fontSize: "24px" (default Simple is 22px)
  },
  color: {
    button: "#25b625",  // ALPHAONE_BUTTON_COLOR
    link: "#0404e4",    // ALPHAONE_LINK_COLOR in alphaone/formatter.ts (default Simple is #0000EE)
  },
  layout: {
    blockPadY: 16,  // ALPHAONE_PADDING = "16px"
    // fullStructure's content-space-main-wrapper td: "padding-left: 19px; padding-right: 19px"
    // — 1px narrower than the default Simple converter's 20px, not a rounding artifact.
    sidePadding: 19,
    placeholderImageWidth: 562,  // hardcoded width="562" in alphaone/templates.ts's wrapImg
  },
  button: {
    height: 53,             // AlfaOne td height="53"
    padding: "3px 4px",     // AlfaOne outer button padding
    innerPadding: "10px 20px",   // AlfaOne <a> padding
  },
  tags: {
    // headline/centerHeadline pass tag: "b" (alphaone/templates.ts) — unlike the default
    // Simple converter, which wraps headlines in <strong>.
    headlineWrap: "b",
    // createHtmlBlock's default `tag` is "div" (alphaone/templates.ts:33) — the default Simple
    // converter's is "span" (templates.ts:29). Every non-headline text block (body/small/
    // centerText/quote/…) gets this wrapper via blockRow/wrapBlockStyle.
    blockWrap: "div",
  },
  // CSS class names AlfaOne's own fullStructure/buttonTableHtml/wrapImg use in place of the
  // default Simple converter's names (templates.ts). innerTable stays "content-inner-table",
  // same as default; AlfaOne's fullStructure has no spacer <tr> rows at all (padding is baked
  // into content-space-main-wrapper instead), so classes.spacer has no real equivalent to
  // override — a structural gap `spacerPx`-based rows can't express, not a missing value.
  classes: {
    primaryTable: "primary-table-wrapper",         // fullStructure's outer <table class="...">
    verticalSpace: "content-space-main-wrapper",   // fullStructure's side-padding <td>
    btnWrap: "custom-button",                      // buttonTableHtml's colored button <td>
    imgBg: "image-full-wrapper",                   // wrapImg's <td> (signature uses "image-block" instead, but signatureImg isn't implemented in the advanced converter — see markers.ts)
  },
  // Matches ALPHAONE_STORAGE_URL in alphaone/templates.ts
  placeholderImageSrc: STORAGE_PROVIDERS_CONFIG.providers.alphaone.publicBaseUrl + "/",
};
