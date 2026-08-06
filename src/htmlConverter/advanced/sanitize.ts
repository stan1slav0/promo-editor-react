// Phase 5 (optional): DOMPurify pass on the final email HTML output.
// The output is built from a controlled IR so <script> never appears.
// Enable only if you need to accept untrusted HTML directly.
//
// Allowlist covers email-safe attributes; enabling DOMPurify without this
// list would strip inline styles and break the rendered output.

import * as dompurifyModule from "dompurify";

// Vite loads the ESM build (instance on `default`); Jest loads the CJS build where
// the module object itself is the instance and `default` is undefined.
const DOMPurify = ((dompurifyModule as { default?: unknown }).default ??
  dompurifyModule) as { sanitize(html: string, config: object): string };

// Fragment-level tags — everything convertAdvanced emits.
const FRAGMENT_TAGS = [
  "table", "tr", "td", "th", "thead", "tbody", "colgroup", "col",
  "a", "img", "span", "div", "b", "strong", "em", "i", "u", "br", "p",
];

// Document-level wrappers — only allowed when sanitizing a full document.
const DOCUMENT_TAGS = ["html", "head", "meta", "body", "title"];

const ALLOWED_ATTR = [
  "style", "class", "width", "height", "align", "valign",
  "cellpadding", "cellspacing", "border", "bgcolor",
  "colspan", "rowspan", "role", "lang", "charset",
  "src", "alt", "href", "target",
];

/**
 * Returns sanitized HTML.
 * - Fragment input (convertAdvanced output) is sanitized in-place — no <html>/<body>
 *   wrapper is added, so the string stays a drop-in table fragment.
 * - Full-document input (starts with <!doctype…> or <html…>) keeps its document
 *   structure (head/meta/title survive).
 */
export function sanitize(html: string): string {
  const isDocument = /^\s*(?:<!doctype\b|<html[\s>])/i.test(html);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: isDocument ? [...DOCUMENT_TAGS, ...FRAGMENT_TAGS] : FRAGMENT_TAGS,
    ALLOWED_ATTR,
    WHOLE_DOCUMENT: isDocument,
  });
}
