/**
 * Types for HTML Converter module
 */

// Image processing types
export type ImageFormat = "jpeg" | "png" | "gif";
export type ImageFormatOverride = ImageFormat | "auto";
export type ImageStatus = "pending" | "processing" | "done" | "error";

export interface ProcessedImage {
  id: string;
  src: string;
  name: string;
  customName?: string; // Custom name set by user (without extension)
  previewUrl: string;
  convertedBlob?: Blob;
  originalSize: number;
  convertedSize?: number;
  status: ImageStatus;
  error?: string;
  formatOverride?: ImageFormatOverride; // Per-image format override
  hasTransparency?: boolean; // Detected transparency
}

export interface ImageSettings {
  format: ImageFormat;
  quality: number;
  maxWidth: number;
  autoProcess: boolean;
  preserveFormat: boolean;
}

// Storage upload types
export type UploadCategory = "finance" | "health";

export interface UploadResult {
  fileId?: string;
  filename: string;
  url: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
}

export interface StorageUploadResponse {
  results: UploadResult[];
  category: string;
  folderName: string;
}

// Upload history types
export interface UploadHistoryEntry {
  id: string;
  timestamp: number;
  filename: string;
  url: string;
  shortPath: string;
  category: string;
  folderName: string;
  alt?: string; // Alt text for accessibility
}

export interface UploadSession {
  id: string;
  timestamp: number;
  category: string;
  folderName: string;
  files: UploadHistoryEntry[];
}

// Image analysis (OCR / ML) settings
export type ImageAnalysisEngine = "off" | "ocr";
export type ImageAnalysisRunMode = "manual" | "auto";
export type ImageAnalysisAutoApplyMode = "off" | "ifEmpty";

export interface ImageAnalysisSettings {
  enabled: boolean;
  engine: ImageAnalysisEngine;
  runMode: ImageAnalysisRunMode;
  autoApplyAlt: ImageAnalysisAutoApplyMode;
  autoApplyFilename: ImageAnalysisAutoApplyMode;
  /**
   * Smart precheck: fast text-likelihood estimate on a small downscale.
   * If below threshold, OCR will be skipped (unless forced).
   */
  smartPrecheck: boolean;
  /**
   * 0..1-ish density threshold. Lower = OCR more often. Higher = OCR only when text is likely.
   */
  textLikelihoodThreshold: number;
  /**
   * Edge threshold for the precheck gradient test (0..255-ish).
   */
  precheckEdgeThreshold: number;
  /**
   * Preprocess canvas before OCR (grayscale + contrast + optional threshold).
   */
  preprocess: boolean;
  preprocessContrast: number; // 1..3
  preprocessBrightness: number; // 0.8..1.4
  preprocessThreshold: number; // 0..255
  preprocessUseThreshold: boolean;
  /**
   * Optional blur before threshold (reduces textured background noise).
   * Often helps on "marketing banners" with noisy photos.
   */
  preprocessBlur: boolean;
  preprocessBlurRadius: number; // 0..3
  /**
   * Optional sharpen filter before OCR (edge enhance).
   * Helps with slightly blurred banners / JPG artifacts.
   */
  preprocessSharpen: boolean;
  /**
   * Extra scale multiplier applied to OCR input canvas (2 or 3 is common).
   * This increases runtime/memory but improves recognition of small text.
   */
  ocrScaleFactor: number; // 1..3
  /**
   * Page Segmentation Mode for Tesseract.
   * 11 is good default for banners/mixed UI text.
   */
  ocrPsm: "3" | "4" | "6" | "7" | "8" | "11";
  /**
   * Optional whitelist for better accuracy if you know expected charset.
   * Empty = no whitelist.
   */
  ocrWhitelist: string;
  /**
   * Lightweight spell correction for banner/CTA English text.
   * Uses a small built-in dictionary + edit-distance heuristics.
   */
  spellCorrectionBanner: boolean;
  /**
   * Region of interest (ROI) crop to avoid feeding the whole image to OCR.
   * Values are fractions 0..1.
   */
  roiEnabled: boolean;
  roiPreset: "full" | "auto" | "top60" | "top60_left70" | "custom";
  roiX: number;
  roiY: number;
  roiW: number;
  roiH: number;
  /**
   * If the source image is small, upscale to this width before OCR.
   * Upscaling often improves OCR on banners/buttons.
   */
  ocrMinWidth: number;
  /**
   * Downscale width before OCR to reduce CPU/memory usage.
   * Typical sweet spot: 1000-1400px.
   */
  ocrMaxWidth: number;
  /**
   * If true, use the local Python AI Backend (PaddleOCR + BLIP + CLIP).
   * Requires `npm run dev:ai`.
   */
  useAiBackend: boolean;
  /**
   * AI Backend Provider
   */
  aiProvider: "gemma3";
  /**
   * Safety limit for auto-run mode. 0 disables auto-run even if runMode="auto".
   */
  autoAnalyzeMaxFiles: number;
}
