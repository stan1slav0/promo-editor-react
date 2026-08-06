import { STORAGE_PROVIDERS_CONFIG } from "../constants";
import type { TokensOverride } from "./config/tokens";
const defaultProfile: TokensOverride = {};
const alphaProfile: TokensOverride = {
  font: {
    stack: "Verdana, Geneva, Tahoma, sans-serif",
    headlinePx: 24,
  },
  color: {
    button: "#25b625",
    link: "#0404e4",
  },
  layout: {
    blockPadY: 16,
    sidePadding: 19,
    placeholderImageWidth: 562,
    signatureImageWidthPx: 220,
    footerPadTopPx: 25,
    footerPadBottomPx: 15,
  },
  button: {
    height: 53,
    padding: "3px 4px",
    innerPadding: "10px 20px",
  },
  tags: {
    headlineWrap: "b",
    blockWrap: "div",
  },
  classes: {
    primaryTable: "primary-table-wrapper",
    verticalSpace: "content-space-main-wrapper",
    btnWrap: "custom-button",
    imgBg: "image-full-wrapper",
    signatureImg: "image-block",
  },
  placeholderImageSrc: `${STORAGE_PROVIDERS_CONFIG.providers.alphaone.publicBaseUrl}/`,
  signatureImageSrc:
    STORAGE_PROVIDERS_CONFIG.providers.alphaone.signatureImageSrc,
};
const terraProfile: TokensOverride = {
  layout: {
    blockPadY: 15,
    sidePadding: 21,
    spacerPx: 15,
    placeholderImageWidth: 400,
    signatureImageWidthPx: 220,
    footerPadTopPx: 25,
    footerPadBottomPx: 15,
  },
  placeholderImageSrc: `${STORAGE_PROVIDERS_CONFIG.providers.ttt.publicBaseUrl}/`,
  signatureImageSrc: STORAGE_PROVIDERS_CONFIG.providers.ttt.signatureImageSrc,
  tags: {
    headlineWrap: "b",
    blockWrap: "div",
  },
  classes: {
    primaryTable: "main-table",
    verticalSpace: "content-wrapper",
    innerTable: "inner-content-wrapper",
    spacer: "space-between-sections",
    btnWrap: "creative-button",
    signatureImg: "image-block",
  },
};
const redProfile: TokensOverride = {
  font: {
    stack: "'Noto Sans', Arial, Helvetica, sans-serif",
    headlinePx: 24,
  },
  color: {
    button: "#29c329",
    link: "#0d0de3",
  },
  layout: {
    blockPadY: 16,
    sidePadding: 18,
    spacerPx: 14,
    placeholderImageWidth: 564,
    signatureImageWidthPx: 220,
    footerPadTopPx: 25,
    footerPadBottomPx: 15,
  },
  button: {
    radius: 12,
    height: 53,
    padding: "3px 4px",
    innerPadding: "10px 20px",
  },
  tags: {
    italic: "i",
  },
  classes: {
    primaryTable: "layout-table-wrapper",
    verticalSpace: "layout-content-wrapper",
    innerTable: "layout-inner-block",
    spacer: "section-gap",
    btnWrap: "base-button",
    imgBg: "full-img-block",
    signatureImg: "image-block",
  },
  placeholderImageSrc: `${STORAGE_PROVIDERS_CONFIG.providers.red.publicBaseUrl}/`,
  signatureImageSrc: STORAGE_PROVIDERS_CONFIG.providers.red.signatureImageSrc,
};
const profilesByCategory: Record<string, TokensOverride> = {
  finance: defaultProfile,
  health: defaultProfile,
  pets: defaultProfile,
  alpha: alphaProfile,
  terra: terraProfile,
  red: redProfile,
};
export function getAdvancedProfile(category?: string): TokensOverride {
  return (
    profilesByCategory[(category || "finance").toLowerCase()] ?? defaultProfile
  );
}
