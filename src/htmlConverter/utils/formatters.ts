/**
 * Formatting utilities for HTML Converter
 */

/**
 * Formats byte size to human-readable string
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
};

/**
 * Extracts folder name from file name input
 * Always returns uppercase format: LETTERS + NUMBERS (e.g., "SMMKTS1303")
 * Handles any input: spaces, lowercase, hyphens, underscores, etc.
 *
 * @param name - Input file name
 * @returns Extracted folder name in uppercase (e.g., "SMMKTS1303")
 *
 * @example
 * extractFolderName("SMMKTS1303_mjml(Approve needed)") // "SMMKTS1303"
 * extractFolderName("smmkts1303-mjml-approve") // "SMMKTS1303"
 * extractFolderName("smmkts 1303 mjml") // "SMMKTS1303"
 * extractFolderName("promo-ABCD123") // "ABCD123"
 */
export const extractFolderName = (name: string): string => {
  // Try to match uppercase letters + digits pattern (already uppercase)
  const uppercaseMatch = name.match(/([A-Z]+\d+)/);
  if (uppercaseMatch) {
    return uppercaseMatch[1];
  }

  // If no uppercase match, clean and extract pattern, then uppercase it
  // Remove all non-alphanumeric characters (except keep letters and digits together)
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "");

  // Extract pattern: letters followed by digits
  const match = cleaned.match(/([a-zA-Z]+\d+)/);

  if (match) {
    // Convert to uppercase (e.g., "smmkts1303" -> "SMMKTS1303")
    return match[1].toUpperCase();
  }

  return "";
};

/**
 * Formats timestamp to human-readable date/time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string (e.g., "21.01.2026, 15:30")
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Removes storage URL prefix from full URL
 * @param url - Full storage URL
 * @param prefix - URL prefix to remove
 * @returns Short path without prefix
 *
 * @example
 * getShortPath("https://storage.example.com/images/test.jpg", "https://storage.example.com/")
 * // "images/test.jpg"
 */
export const getShortPath = (url: string, prefix: string): string => {
  return url.replace(prefix, "");
};

/**
 * Formats timestamp relative to today:
 * - Today → "HH:MM"
 * - Older → "DD Mon, HH:MM"
 */
export const formatTimeRelative = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString("uk-UA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
