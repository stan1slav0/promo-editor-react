import type { Align } from "../ir/types";
import { STORAGE_PROVIDERS_CONFIG } from "../../constants";
export interface Tokens {
  color: {
    rootBackground: string;
    warning: string;
    blackSnap: number;
    whiteSnap: number;
    neutralTol: number;
    bgRedundant: number;
    darkLuma: number;
    link: string;
    button: string;
    white: string;
    black: string;
  };
  placeholderHref: string;
  placeholderImageSrc: string;
  placeholderImageAlt: string;
  signatureImageSrc: string;
  signatureImageAlt: string;
  statsGridDefaultAlign: Align;
  font: {
    stack: string;
    lineHeight: number;
    bodyPx: number;
    headlinePx: number;
    smallPx: number;
    cellPx: number;
    linkWeight: number;
    linkDecoration: string;
  };
  layout: {
    containerMaxWidth: number;
    sidePadding: number;
    blockPadY: number;
    spacerPx: number;
    gridMinWidth: number;
    gridInlineBlockThreshold: number;
    quotePadX: number;
    calloutAccentPx: number;
    calloutBoxBorderPx: number;
    calloutPadX: number;
    alertBandPadH: number;
    alertBandPadV: number;
    nestedBlockPadX: number;
    gridCellPadY: number;
    gridCellPadX: number;
    recordCellPadY: number;
    recordCellPadX: number;
    recordBorderPx: number;
    buttonSubtitlePadTop: number;
    gapMarginThresholdPt: number;
    textSplitGapMinSpaces: number;
    listIndentPx: number;
    progressBarPadTopPx: number;
    placeholderImageWidth: number;
    sideImageWidthPx: number;
    sideImageHeightPx: number;
    signatureImageWidthPx: number;
    footerPadTopPx: number;
    footerPadBottomPx: number;
  };
  button: {
    radius: number;
    height: number;
    padding: string;
    innerPadding: string;
    target: string;
    textDecoration: string;
  };
  tags: {
    bold: string;
    headlineWrap: string;
    italic: string;
    underline: string;
    colorWrap: string;
    blockWrap: string;
  };
  accentBullet: string;
  classes: {
    primaryTable: string;
    verticalSpace: string;
    innerTable: string;
    spacer: string;
    btnWrap: string;
    imgBg: string;
    inlineCell: string;
    signatureImg: string;
  };
}
export const tokens: Tokens = {
  color: {
    rootBackground: "#ffffff",
    warning: "#cc0000",
    blackSnap: 48,
    whiteSnap: 48,
    neutralTol: 24,
    bgRedundant: 12,
    darkLuma: 0.5,
    link: "#0000EE",
    button: "#28b628",
    white: "#ffffff",
    black: "#000000",
  },
  placeholderHref: "urlhere",
  placeholderImageSrc: STORAGE_PROVIDERS_CONFIG.providers.finance.publicBaseUrl,
  placeholderImageAlt: "Video preview",
  signatureImageSrc:
    STORAGE_PROVIDERS_CONFIG.providers.finance.signatureImageSrc,
  signatureImageAlt: "Signature",
  statsGridDefaultAlign: "left",
  font: {
    stack: "'Roboto', Arial, Helvetica, sans-serif",
    lineHeight: 1.5,
    bodyPx: 18,
    headlinePx: 22,
    smallPx: 12,
    cellPx: 14,
    linkWeight: 700,
    linkDecoration: "underline",
  },
  layout: {
    containerMaxWidth: 600,
    sidePadding: 20,
    blockPadY: 14,
    spacerPx: 16,
    gridMinWidth: 100,
    gridInlineBlockThreshold: 3,
    quotePadX: 20,
    calloutAccentPx: 10,
    calloutBoxBorderPx: 1,
    calloutPadX: 10,
    alertBandPadH: 10,
    alertBandPadV: 4,
    nestedBlockPadX: 10,
    gridCellPadY: 10,
    gridCellPadX: 6,
    recordCellPadY: 6,
    recordCellPadX: 6,
    recordBorderPx: 1,
    buttonSubtitlePadTop: 8,
    gapMarginThresholdPt: 6,
    textSplitGapMinSpaces: 6,
    listIndentPx: 20,
    progressBarPadTopPx: 24,
    placeholderImageWidth: 560,
    sideImageWidthPx: 250,
    sideImageHeightPx: 224,
    signatureImageWidthPx: 200,
    footerPadTopPx: 34,
    footerPadBottomPx: 14,
  },
  button: {
    radius: 10,
    height: 51,
    padding: "3px 5px",
    innerPadding: "9px 15px",
    target: "_blank",
    textDecoration: "none",
  },
  tags: {
    bold: "b",
    headlineWrap: "strong",
    italic: "em",
    underline: "u",
    colorWrap: "span",
    blockWrap: "span",
  },
  accentBullet: "&#9656; ",
  classes: {
    primaryTable: "primary-table-limit content-table",
    verticalSpace: "content-vertical-space",
    innerTable: "content-inner-table",
    spacer: "md-horizontal-space",
    btnWrap: "btn-edit-p",
    imgBg: "img-bg-block",
    inlineCell: "d-i-b",
    signatureImg: "img-bg-block",
  },
};
export type TokensOverride = {
  color?: Partial<Tokens["color"]>;
  font?: Partial<Tokens["font"]>;
  layout?: Partial<Tokens["layout"]>;
  button?: Partial<Tokens["button"]>;
  tags?: Partial<Tokens["tags"]>;
  classes?: Partial<Tokens["classes"]>;
  accentBullet?: string;
  placeholderHref?: string;
  placeholderImageSrc?: string;
  signatureImageSrc?: string;
  signatureImageAlt?: string;
  statsGridDefaultAlign?: Align;
};
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
    placeholderImageSrc:
      override.placeholderImageSrc ?? base.placeholderImageSrc,
    placeholderImageAlt: base.placeholderImageAlt,
    signatureImageSrc: override.signatureImageSrc ?? base.signatureImageSrc,
    signatureImageAlt: override.signatureImageAlt ?? base.signatureImageAlt,
    statsGridDefaultAlign:
      override.statsGridDefaultAlign ?? base.statsGridDefaultAlign,
  } as Tokens;
}
