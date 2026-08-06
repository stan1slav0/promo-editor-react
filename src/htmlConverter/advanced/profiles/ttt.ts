import { STORAGE_PROVIDERS_CONFIG } from "../../constants";
import type { TokensOverride } from "../config/tokens";

// TTT (TerraTrans) profile — values taken from ttt/templates.ts.
export const profile: TokensOverride = {
  layout: {
    blockPadY:   15,  // TTT_PADDING = "15px"
    sidePadding: 21,  // "padding-left: 21px; padding-right: 21px" in TTT scaffold
    spacerPx:    15,  // height="15" in TTT fullStructure spacers
    // FULL_IMAGE_WIDTH = "400" in ttt/templates.ts — its own hand-picked value, notably NOT
    // close to containerMaxWidth − 2×sidePadding (558), so it can't be derived from a formula.
    placeholderImageWidth: 400,
  },
  // Matches TTT_STORAGE_URL in ttt/templates.ts
  placeholderImageSrc: STORAGE_PROVIDERS_CONFIG.providers.ttt.publicBaseUrl + "/",
  tags: {
    // headline/centerHeadline pass tag: "b" (ttt/templates.ts) — unlike the default Simple
    // converter, which wraps headlines in <strong>.
    headlineWrap: "b",
    // createHtmlBlock's default `tag` is "div" (ttt/templates.ts:51) — the default Simple
    // converter's is "span" (templates.ts:29). Every non-headline text block (body/small/
    // centerText/quote/…) gets this wrapper via blockRow/wrapBlockStyle.
    blockWrap: "div",
  },
  // CSS class names TTT's own fullStructure/buttonTableHtml use in place of the default
  // Simple converter's names (templates.ts) — imgBg stays "img-bg-block", same as default.
  classes: {
    primaryTable: "main-table",              // fullStructure's outer <table class="...">
    verticalSpace: "content-wrapper",        // fullStructure's side-padding <td>
    innerTable: "inner-content-wrapper",     // fullStructure's inner content <table>
    spacer: "space-between-sections",        // fullStructure's top/bottom spacer <tr><td>
    btnWrap: "creative-button",              // buttonTableHtml's colored button <td>
  },
};
