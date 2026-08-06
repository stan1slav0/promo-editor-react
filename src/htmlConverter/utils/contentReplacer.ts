/**
 * Content replacer utilities for HTML Converter
 * Plain functions (no hook needed — no state, no side effects).
 */

import { isSignatureImageTag } from "./htmlUtils";

export interface ContentReplacerResult {
  replaced: string;
  count: number;
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Replaces image src URLs in HTML/MJML content using a src→newUrl map.
 * Tries both the raw URL and the absolute version.
 */
export function replaceUrlsInContentByMap(content: string, pattern: RegExp, urlMap: Record<string, string>): ContentReplacerResult {
  let replacedCount = 0;
  const replaced = content.replace(pattern, (match, prefix, oldUrl, suffix) => {
    if (isSignatureImageTag(match)) return match;

    const candidates: string[] = [String(oldUrl)];
    try {
      candidates.push(new URL(String(oldUrl), window.location.href).toString());
    } catch {
      // ignore
    }

    for (const c of candidates) {
      const next = urlMap[c];
      if (next) {
        replacedCount++;
        return `${prefix}${next}${suffix}`;
      }
    }
    return match;
  });

  return { replaced, count: replacedCount };
}

/**
 * Replaces image src URLs positionally using an ordered list of storage URLs.
 */
export function replaceUrlsInContent(content: string, pattern: RegExp, storageUrls: string[]): ContentReplacerResult {
  let imageIndex = 0;
  let replacedCount = 0;

  const replaced = content.replace(pattern, (match, prefix, _oldUrl, suffix) => {
    if (isSignatureImageTag(match)) return match;
    if (imageIndex < storageUrls.length) {
      const newUrl = storageUrls[imageIndex++];
      replacedCount++;
      return `${prefix}${newUrl}${suffix}`;
    }
    return match;
  });

  return { replaced, count: replacedCount };
}

/**
 * Replaces ALT attributes in img tags based on a storageUrl → alt mapping.
 * Uses regex instead of DOMParser to preserve original HTML formatting (important for email).
 */
export function replaceAltsInContent(content: string, altMap: Record<string, string>): ContentReplacerResult {
  if (Object.keys(altMap).length === 0) return { replaced: content, count: 0 };

  let replacedCount = 0;

  // Match entire <img ...> tag (handles multi-line with [\s\S])
  const replaced = content.replace(/<img[\s\S]*?>/gi, (imgTag) => {
    const srcMatch = imgTag.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch) return imgTag;

    const src = srcMatch[1];
    const newAlt = altMap[src];
    if (!newAlt) return imgTag;
    const safeAlt = escapeHtmlAttr(newAlt);

    replacedCount++;

    if (/\salt=["'][^"']*["']/i.test(imgTag)) {
      return imgTag.replace(/(\salt=["'])[^"']*(["'])/i, `$1${safeAlt}$2`);
    } else {
      return imgTag.replace(/<img/i, `<img alt="${safeAlt}"`);
    }
  });

  return { replaced, count: replacedCount };
}
