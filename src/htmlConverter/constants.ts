/**
 * Constants for HTML Converter module
 */

// LocalStorage keys
export const STORAGE_KEYS = {
  IMAGE_SETTINGS: "html-converter-image-settings",
  UPLOAD_HISTORY: "html-converter-upload-history",
  UI_SETTINGS: "html-converter-ui-settings",
  IMAGE_ANALYSIS_SETTINGS: "html-converter-image-analysis-settings",
  STORAGE_PROFILE: "html-converter-storage-profile",
  EXPORT_TYPE: "html-converter-export-type",
  UPLOAD_MODE: "html-converter-upload-mode",
  UPLOAD_MODE_ELECTRON: "html-converter-upload-mode-electron",
  CONVERTER_MODE: "html-converter-converter-mode",
} as const

// Symbols
export const SYMBOLS = {
  ONE_BR: "§", // § is a symbol that is not used in HTML
} as const

// UI timing constants (in milliseconds)
export const UI_TIMINGS = {
  COPIED_FEEDBACK: 2000, // How long to show "copied" feedback
  SNACKBAR_DURATION: 4000, // Toast notification duration
  SUCCESS_DIALOG_CLOSE: 2000, // Auto-close delay for success dialogs
  SLIDER_DEBOUNCE_MS: 400, // Wait after quality/maxWidth change before re-processing
} as const

// Upload configuration
export const UPLOAD_CONFIG = {
  MAX_HISTORY_SESSIONS: 50, // Maximum number of upload sessions to keep in history
  SESSIONS_PER_PAGE: 5, // Number of sessions to display per page in history
  PREPARE_TIMEOUT: 30000, // 30 seconds for file preparation
  STORAGE_TIMEOUT: 180000, // 3 minutes for storage upload
  SERVER_TIMEOUT: 300000, // 5 minutes for server processing
} as const

// Image processing defaults
export const IMAGE_DEFAULTS = {
  FORMAT: "jpeg" as const,
  QUALITY: 85,
  MAX_WIDTH: 600,
  AUTO_PROCESS: true,
  PRESERVE_FORMAT: true,
} as const

// Storage URLs
export const STORAGE_URL_PREFIX = "https://storage.5th-elementagency.com/"

/** Placeholder URL used in generated link templates (replaced by the user manually) */
export const PLACEHOLDER_URL = "urlhere"

/** Allowed folder name format: letters followed by digits (e.g., ABCD123, Finance456) */
export const FOLDER_NAME_REGEX = /[a-zA-Z]+\d+/

/** Exclude images with alt containing this (e.g. Signature, sign-i) from extraction & URL replacement */
export const IMAGE_EXCLUSION_ALT_REGEX = /Signature/i

/**
 * Storage providers config (fallback values without external automation JSON dependencies)
 */
export const STORAGE_PROVIDERS_CONFIG = {
  consoleBaseUrl: "https://storage.5th-elementagency.com",
  providers: {
    default: {
      bucket: "promo",
      usesCategory: false,
      consoleRootPrefix: "",
      publicBaseUrl: "https://storage.5th-elementagency.com",
      publicPathPrefix: "",
      publicRootPrefix: "",
    },
    alphaone: {
      bucket: "alphaone",
      usesCategory: false,
      consoleRootPrefix: "",
      publicBaseUrl: "https://storage.5th-elementagency.com/alphaone",
      publicPathPrefix: "",
      publicRootPrefix: "",
    },
    ttt: {
      bucket: "ttt",
      usesCategory: false,
      consoleRootPrefix: "",
      publicBaseUrl: "https://storage.5th-elementagency.com/ttt",
      publicPathPrefix: "",
      publicRootPrefix: "",
    },
  },
  browserProfiles: {},
}

export type StorageProviderKey = keyof typeof STORAGE_PROVIDERS_CONFIG.providers