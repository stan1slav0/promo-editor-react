// Single source of truth for all visual values.
// Import config so fontFamily and brand colors are never duplicated.
// Profile overrides (TTT, Alfa, …) live in advanced/profiles/*.ts and extend this object.
import { config } from "../../utils/config"
import type { Align } from "../ir/types"

// Explicit interface keeps types wide (number, string) so profile overrides
// don't clash with the literal types produced by `as const`.
export interface Tokens {
  color: {
    rootBackground: string
    warning: string
    blackSnap: number
    whiteSnap: number
    neutralTol: number
    bgRedundant: number
    darkLuma: number
    link: string
    button: string
    white: string
    black: string
  }
  /** Href stub rendered into links/buttons — real URLs are filled in manually after conversion */
  placeholderHref: string
  /**
   * Every <img> the advanced converter emits uses this src instead of whatever the source
   * document had — matches the Simple converter's own `wrapImg`/`signatureImg` convention
   * (src/htmlConverter/templates.ts): images are never uploaded from the pasted doc, they're
   * re-uploaded through the app's own storage flow afterward, which finds/replaces this exact
   * placeholder. Per-provider profiles (ttt.ts, alphaone.ts) override it to their own bucket's
   * public base URL, matching TTT_STORAGE_URL/ALPHAONE_STORAGE_URL in the Simple converter.
   */
  placeholderImageSrc: string
  /** Matches the Simple converter's fixed alt text for not-yet-uploaded images — same across
   *  every provider (see src/htmlConverter/templates.ts's wrapImg), so no profile override. */
  placeholderImageAlt: string
  /**
   * Alignment a statsGrid cell falls back to when NEITHER the cell nor its first <p> declares
   * one (see detect/tableBlock.ts's cellToChild/cellAlign). GDocs omits `text-align` for the
   * CSS default (left) just like it omits any other default value — "no text-align" isn't
   * "unknown", it's "left" — so this fallback is a converter-side guess, not a fact read from
   * the document. "center" was chosen because a past real stat-card doc read best that way;
   * flip to "left" here if a real doc needs the literal CSS-default reading instead — no code
   * change required.
   */
  statsGridDefaultAlign: Align
  font: {
    stack: string
    lineHeight: number
    bodyPx: number
    headlinePx: number
    smallPx: number
    cellPx: number
    linkWeight: number
    linkDecoration: string
  }
  layout: {
    containerMaxWidth: number
    sidePadding: number
    blockPadY: number
    spacerPx: number
    gridMinWidth: number
    /**
     * statsGrid column count above which cells switch to wrapping inline-block layout
     * (display:inline-block + min-width, so cards stack on narrow screens). At or below
     * this count, cells stay fixed side-by-side <td width="N%"> — 2-3 column grids read as
     * a deliberate row and shouldn't reflow. Cards default: 4+ columns wraps, matching the
     * point where fixed-width cards get too narrow to read on mobile without wrapping.
     */
    gridInlineBlockThreshold: number
    quotePadX: number
    calloutAccentPx: number
    calloutBoxBorderPx: number
    calloutPadX: number
    alertBandPadH: number
    alertBandPadV: number
    /**
     * Horizontal inset for a nested grid/row table (statsGrid/recordRow/progressBar — see
     * AlertBandProps.tables) embedded inside an alertBand/calloutLeft container, applied to
     * its own outer <td> alongside its normal padding-top/bottom. Deliberately a separate
     * token from alertBandPadH/calloutPadX (the container's own TEXT inset) — a nested table
     * is a distinct visual unit from the surrounding prose and may need retuning
     * independently of it, even though both happen to default to the same value today.
     */
    nestedBlockPadX: number
    gridCellPadY: number
    gridCellPadX: number
    recordCellPadY: number
    recordCellPadX: number
    recordBorderPx: number
    buttonSubtitlePadTop: number
    gapMarginThresholdPt: number
    /**
     * Minimum run of consecutive spaces (GDocs' &nbsp;-padding idiom, already collapsed to
     * regular spaces by fromDom) between two runs on the same line before it's read as a
     * deliberate "pseudo-column" gap rather than ordinary double-spacing in prose — see
     * detect/flowBlock.ts's text-split detection. Chosen well above a typical 2-3 space
     * decorative gap so plain text is never misread as a table.
     */
    textSplitGapMinSpaces: number
    listIndentPx: number
    /**
     * Vertical fill of a progressBar cell (no text/border, just a colored block) — the row
     * has no natural height without text, so this top-only padding gives it one, matching
     * the GDocs convention of a colored <td> containing nothing but a <br>.
     */
    progressBarPadTopPx: number
    /**
     * Base width for the placeholder image (imageRowHtml) — a hand-picked constant per
     * provider, NOT derived from containerMaxWidth/sidePadding. Matches the Simple converter's
     * own per-provider `wrapImg` width, which the three variants don't agree on either: 560
     * (default, templates.ts), 562 (AlfaOne, alphaone/templates.ts), 400 (TTT's
     * FULL_IMAGE_WIDTH, ttt/templates.ts — notably NOT close to containerMaxWidth −
     * 2×sidePadding=558, so it must come from its own token, not a formula).
     */
    placeholderImageWidth: number
    /**
     * Fixed size for the `i-r-s`/`i-l-s` floated side image — matches the Simple
     * converter's hardcoded rightSideImg/leftSideImg width="250" height="224",
     * confirmed identical (not per-provider) across templates.ts, ttt/templates.ts
     * and alphaone/templates.ts, unlike placeholderImageWidth above.
     */
    sideImageWidthPx: number
    sideImageHeightPx: number
  }
  button: {
    radius: number
    height: number
    padding: string
    innerPadding: string
    target: string
    textDecoration: string  // text-decoration on the <a> link inside a button
  }
  tags: {
    bold: string  // "b" or "strong" — INLINE bold runs only (all 3 Simple converters use "b" here)
    /**
     * Block-level tag for a headline paragraph (h1/h2). Separate from `bold` because the
     * default Simple converter (templates.ts's centerHeadline/headline) wraps the headline
     * block in `<strong>` while still using `<b>` for inline bold runs elsewhere on the page
     * — TTT and AlfaOne use `<b>` for both roles (ttt/templates.ts, alphaone/templates.ts).
     */
    headlineWrap: string  // "b" or "strong"
    italic: string  // "em" or "i"
    underline: string  // "u"
    colorWrap: string  // "span" — wrapper for color-only runs
    blockWrap: string  // "span" or "div" — inner wrapper for normal text block rows
  }
  accentBullet: string
  classes: {
    primaryTable: string
    verticalSpace: string
    innerTable: string
    spacer: string
    btnWrap: string
    imgBg: string
    inlineCell: string
  }
}

export const tokens: Tokens = {
  color: {
    rootBackground: "#ffffff",
    warning: "#cc0000",
    // Colour-classification thresholds (used only by ir/color.ts — not rendered directly)
    blackSnap: 48,
    whiteSnap: 48,
    neutralTol: 24,
    bgRedundant: 12,
    darkLuma: 0.5,
    // Brand colours — pulled from the shared config so Simple and Advanced always match
    link: config.colors.link,    // "#0000EE"
    button: config.colors.button,  // "#28b628"
    white: config.colors.white,
    black: config.colors.black,
  },
  placeholderHref: "urlhere",
  placeholderImageSrc: config.storageUrl,  // "https://storage.5th-elementagency.com/" — matches Simple's default provider
  placeholderImageAlt: "Video preview",
  statsGridDefaultAlign: "left",
  font: {
    // Pulled from shared config — one place to update for all converters and profiles
    stack: config.fontFamily,  // "'Roboto', Arial, Helvetica, sans-serif"
    lineHeight: 1.5,
    // Font sizes NEVER come from the source document — only these tokens, chosen by
    // role: body (default paragraph), headline (h1/h2), small (h5/h6 — footer,
    // disclaimers), cell (text inside statsGrid/recordRow table cells).
    bodyPx: 18,   // matches Simple converter default paragraph size
    headlinePx: 22,   // matches Simple converter h1 / centerHeadline size
    smallPx: 12,   // matches Simple converter h6 / smallText size
    cellPx: 14,   // table-cell text (statsGrid cards, recordRow data cells)
    linkWeight: 700,
    linkDecoration: "underline",
  },
  layout: {
    containerMaxWidth: 600,
    sidePadding: 20,
    blockPadY: 14,   // top + bottom padding per block row (matches Simple)
    spacerPx: 16,   // height of the spacer <td> between sections
    gridMinWidth: 100,
    gridInlineBlockThreshold: 3,   // >3 columns wraps (inline-block); 3 or fewer stays fixed side-by-side
    quotePadX: 20,   // h4 quote paragraph left/right indent (matches Simple converter)
    calloutAccentPx: 10,   // calloutLeft left-border width
    calloutBoxBorderPx: 1,   // calloutBox frame border width (all declared sides)
    calloutPadX: 10,   // callout left/right inner padding
    alertBandPadH: 10,   // alertBand horizontal inner padding
    alertBandPadV: 4,   // alertBand vertical inner padding
    nestedBlockPadX: 10,   // horizontal inset for a nested grid/row table inside alertBand/calloutLeft
    gridCellPadY: 10,   // statsGrid card cell padding top/bottom
    gridCellPadX: 6,   // statsGrid card cell padding left/right
    recordCellPadY: 6,   // recordRow cell padding top/bottom
    recordCellPadX: 6,   // recordRow cell padding left/right
    recordBorderPx: 1,   // recordRow cell border width (all declared sides)
    buttonSubtitlePadTop: 8,   // gap above buttonBand subtitle line
    // Paragraph-boundary spacing rule: prev margin-bottom + cur margin-top (pt, from the
    // source doc) below this → the boundary is a line break (<br>); at/above → a real
    // gap (<br><br>). GDocs authors' "paragraph style" spacing (0–4pt per side) reads
    // as tight lines; deliberate section spacing (14pt+) reads as a gap. Blank lines
    // (top-level <br>) and § override this in either direction.
    gapMarginThresholdPt: 6,
    textSplitGapMinSpaces: 6,   // consecutive spaces before an nbsp-padded run reads as a pseudo-column gap
    listIndentPx: 20,   // <ul>/<ol> left indent (matches quotePadX)
    progressBarPadTopPx: 24,   // vertical fill height for a text-less progressBar cell
    placeholderImageWidth: 560,   // matches Simple converter's default wrapImg width="560"
    sideImageWidthPx: 250,   // matches Simple converter's rightSideImg/leftSideImg width="250"
    sideImageHeightPx: 224,   // matches Simple converter's rightSideImg/leftSideImg height="224"
  },
  button: { radius: 10, height: 51, padding: "3px 5px", innerPadding: "9px 15px", target: "_blank", textDecoration: "none" },
  tags: { bold: "b", headlineWrap: "strong", italic: "em", underline: "u", colorWrap: "span", blockWrap: "span" },
  accentBullet: "&#9656; ",
  // CSS class names shared with the Simple converter stylesheet — do NOT rename
  classes: {
    primaryTable: "primary-table-limit content-table",
    verticalSpace: "content-vertical-space",
    innerTable: "content-inner-table",
    spacer: "md-horizontal-space",
    btnWrap: "btn-edit-p",
    imgBg: "img-bg-block",
    inlineCell: "d-i-b",
  },
}

// Partial override accepted by convertAdvanced — each nested object is also partial.
export type TokensOverride = {
  color?: Partial<Tokens["color"]>
  font?: Partial<Tokens["font"]>
  layout?: Partial<Tokens["layout"]>
  button?: Partial<Tokens["button"]>
  tags?: Partial<Tokens["tags"]>
  classes?: Partial<Tokens["classes"]>
  accentBullet?: string
  placeholderHref?: string
  placeholderImageSrc?: string
  statsGridDefaultAlign?: Align
}

export function mergeTokens(base: Tokens, override: TokensOverride): Tokens {
  return {
    color: { ...base.color, ...override.color },
    font: { ...base.font, ...override.font },
    layout: { ...base.layout, ...override.layout },
    button: { ...base.button, ...override.button },
    tags: { ...base.tags, ...override.tags },
    classes: { ...base.classes, ...override.classes },
    accentBullet: override.accentBullet ?? base.accentBullet,
    placeholderHref: override.placeholderHref ?? base.placeholderHref,
    placeholderImageSrc: override.placeholderImageSrc ?? base.placeholderImageSrc,
    placeholderImageAlt: base.placeholderImageAlt,
    statsGridDefaultAlign: override.statsGridDefaultAlign ?? base.statsGridDefaultAlign,
  } as Tokens
}
