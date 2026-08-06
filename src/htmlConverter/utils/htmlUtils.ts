/**
 * Utility functions for HTML/MJML conversion
 */

import { SYMBOLS } from "../constants";

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanEmptyHtmlTags(htmlContent: string): string {
  // Merge adjacent <a> tags (same link split across spans) BEFORE converting &nbsp;.
  // After &nbsp; → ' ' it would look like plain whitespace and unrelated links
  // sitting on the same line (e.g. "Privacy Policy | Terms of Use | Unsubscribe")
  // would get fused into a single anchor.
  htmlContent = htmlContent.replace(/<\/a>\s*<a[^>]*>/g, " ");
  htmlContent = htmlContent.replace(/&nbsp;/g, " ");
  htmlContent = htmlContent.replace(/<b>\s*<\/b>/g, "");
  htmlContent = htmlContent.replace(/<li>\s*<\/li>/g, "");
  // Crush any sequence of 3+ breaks into 2
  htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*){3,}/gi, "\n<br><br>\n");
  htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<br><br>/gi, "$1");
  htmlContent = htmlContent.replace(/<pre>/g, "");
  htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, " ");
  htmlContent = htmlContent.replace(/<b\b[^>]*>\s*<\/b>/g, " ");
  htmlContent = htmlContent.replace(/<u>\s*<\/u>/g, " ");
  htmlContent = htmlContent.replace(/<em[^>]*>\s*<\/em>/g, " ");
  // Merge adjacent <em> tags only when their opening tags are identical (e.g. the same
  // italic run split across spans by Google Docs). Two <em> runs can carry different
  // colors/styles (e.g. a quote followed by its attribution in a callout) — collapsing
  // those unconditionally would silently drop the second run's styling.
  htmlContent = htmlContent.replace(
    /(<em(?:\s+[^>]*)?>)([\s\S]*?)<\/em>\s*<em((?:\s+[^>]*)?)>/g,
    (match, openTag: string, content: string, secondAttrs: string) => {
      const firstAttrs = openTag.slice(3, -1).trim();
      return firstAttrs === secondAttrs.trim() ? `${openTag}${content} ` : match;
    },
  );
  htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, " ");
  htmlContent = htmlContent.replace(/<br><br>\s*<\/span>/g, "</span>");
  htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<\/a>/gi, "$1");
  htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<\/b>/gi, "$1");
  htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/span>/g, "</span>");
  htmlContent = htmlContent.replace(/<b\b[^>]*>\s*<\/span>/g, "</span>");
  htmlContent = htmlContent.replace(/(<div[^>]*>)\s*<\/a>/gi, "$1");
  htmlContent = htmlContent.replace(/(<div[^>]*>)\s*<\/b>/gi, "$1");
  htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/div>/g, "</div>");
  htmlContent = htmlContent.replace(/<b\b[^>]*>\s*<\/div>/g, "</div>");

  // Strip heading tags (h1-h6) in one pass
  htmlContent = htmlContent.replace(/<\/?(h[1-6])[^>]*>/gi, "");
  // Strip leftover <br><br> adjacent to block boundaries
  htmlContent = htmlContent.replace(/<br><br>\s*<br><br>/g, "<br><br>");
  htmlContent = htmlContent.replace(/(<(div|span)[^>]*>)\s*<br><br>/gi, "$1");
  htmlContent = htmlContent.replace(/<br>\s*<\/(div|span)>/g, "</$1>");

  // Clean up completely empty template-generated structures iteratively
  // Empty blocks can be nested (e.g., <tr><td><span><br></span></td></tr>)
  let prevLen = 0;
  while (htmlContent.length !== prevLen) {
    prevLen = htmlContent.length;

    // Clear totally empty structural tags, preserving contained whitespace
    htmlContent = htmlContent.replace(/<span[^>]*>([\s\u00A0]*)<\/span>/gi, "$1");
    htmlContent = htmlContent.replace(/<div[^>]*>([\s\u00A0]*)<\/div>/gi, "$1");
    htmlContent = htmlContent.replace(/<td[^>]*>([\s\u00A0]*)<\/td>/gi, "");
    htmlContent = htmlContent.replace(/<tr[^>]*>([\s\u00A0]*)<\/tr>/gi, "");

    // Clear structural tags that contain ONLY line breaks
    htmlContent = htmlContent.replace(/<span[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/span>/gi, "");
    htmlContent = htmlContent.replace(/<div[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/div>/gi, "");
    htmlContent = htmlContent.replace(/<td[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/td>/gi, "");
    htmlContent = htmlContent.replace(/<tr[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/tr>/gi, "");

    // Unwrap <br> sequences from empty formatting tags (e.g. <a><br></a> -> <br>)
    htmlContent = htmlContent.replace(/<([abiu]|em|strong)[^>]*>(\s*(?:<br\s*\/?>\s*)+)<\/\1>/gi, "$2");
  }
  // Ensure exactly two <br> before <hr> and one <br> after it
  htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*)*(<hr[^>]*>)(?:\s*<br\s*\/?>)*/gi, "<br><br>\n$1\n<br>\n");

  // Clear line breaks directly adjacent to the boundaries of block elements
  htmlContent = htmlContent.replace(/(<(?:div|p|span|td|th)[^>]*>)\s*(?:<br\s*\/?>\s*)+/gi, "$1\n");
  htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*)+(<\/(?:div|p|span|td|th)>)/gi, "\n$1");

  return htmlContent;
}

export function isSignatureImageTag(imgTag: string): boolean {
  // Simple check: if alt contains "signature", skip replacement
  return /alt=["'].*signature.*["']/i.test(imgTag);
}

export function addOneBr(htmlContent: string, symbol: string = SYMBOLS.ONE_BR): string {
  // Replace the symbol with a temporary marker to find its exact injection points
  const TEMP_MARKER = "___ONE_BR_MARKER___";
  const oneBrRe = new RegExp(escapeRegExp(symbol || SYMBOLS.ONE_BR), "gi");
  htmlContent = htmlContent.replace(oneBrRe, TEMP_MARKER);

  // If the user placed the ONE_BR symbol immediately before or after an existing <br />
  // we want exactly ONE break, not two. So we absorb the adjacent native breaks.
  htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*)*___ONE_BR_MARKER___(?:\s*<br\s*\/?>)*/gi, "<br>\n");

  // Move trailing <br> from INSIDE formatting tags to OUTSIDE them.
  // e.g. <b>text…<br></b><br> → <b>text…</b><br>  (absorbs the extra <br>)
  htmlContent = htmlContent.replace(/(<br\s*\/?>)\s*(<\/(?:b|em|i|u|a|strong)>)\s*(?:<br\s*\/?>)*/gi, "$2<br>\n");

  // Clean up cases where the forced break sits completely flush against a block boundary
  // as blocks automatically define padding/line-breaks.
  htmlContent = htmlContent.replace(/(<(?:div|p|span|td|th)[^>]*>)\s*<br\s*\/?>/gi, "$1");
  htmlContent = htmlContent.replace(/<br\s*\/?>\s*(<\/(?:div|p|span|td|th)>)/gi, "$1");

  return htmlContent;
}

export function replaceTripleBrWithSingle(htmlContent: string): string {
  const BR = `<br><br>\n`;
  htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*){3,}/gi, BR);
  return htmlContent;
}

export function addBrAfterClosingP(htmlContent: string): string {
  // First, handle <p> tags inside <li> elements - remove p tags but keep content
  // This prevents <br> from being added inside list items
  htmlContent = htmlContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, liContent) => {
    // Remove <p> tags inside <li>, keeping the content
    const cleanedContent = liContent.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "");
    return `<li>${cleanedContent}</li>`;
  });

  // --- Strip Google-Docs-injected <br> between block elements ---
  // Google Docs pastes <br> between </p> and the next <p>/<ul>/<ol>,
  // and between </ul>/<ol> and the next <p>. These orphan <br> cause
  // triple+ breaks once we add our own controlled <br><br> below.
  htmlContent = htmlContent.replace(/<\/p>\s*(?:<br\s*\/?>\s*)+(<p\b)/gi, "</p>$1");
  htmlContent = htmlContent.replace(/<\/p>\s*(?:<br\s*\/?>\s*)+(<(?:ul|ol)\b)/gi, "</p>$1");
  htmlContent = htmlContent.replace(/(<\/(?:ul|ol)>)\s*(?:<br\s*\/?>\s*)+(<p\b)/gi, "$1$2");
  // Also strip <br> right after </ul>|</ol> before any next block to avoid extra spacing
  htmlContent = htmlContent.replace(/(<\/(?:ul|ol)>)\s*(?:<br\s*\/?>\s*)+/gi, "$1\n");

  // Handle sequences of empty paragraphs (p tags with only br inside)
  // We want to treat even a single empty paragraph as a spacer, but NOT add extra breaks if it's just one.
  // The goal: merge the line break from the empty paragraph with the standard paragraph break.
  htmlContent = htmlContent.replace(/(<p[^>]*>[\s\S]*?<\/p>)(\s*<p[^>]*>\s*<br\s*\/?>\s*<\/p>\s*){1,}(<p[^>]*>[\s\S]*?<\/p>)/gi, (_match, beforeP, _emptyPs, afterP) => {
    // We just ignore the empty P in the middle, because the </p> replacement below will add <br><br>    // effectively doing P -> BR BR -> P.
    // If we kept the empty P, we'd get P -> BR BR -> BR (from empty P) -> BR BR -> P, which is too much.
    return beforeP + afterP;
  });

  // Delete extra inline <br> (optional, but good for cleanup)
  // htmlContent = htmlContent.replace(/<br\s*\/?>/gi, "");

  // Add <br><br> after each </p> (but not inside lists - they're already processed)
  // Use negative lookahead to skip </p> that are inside <li> elements
  htmlContent = htmlContent.replace(/<\/p>(?!\s*<\/li>)/gi, "</p>\n<br><br>\n");

  // Delete extra <p> tags (but not inside lists - already processed)
  // Use \n for opening tag to avoid gluing with preceding text
  htmlContent = htmlContent.replace(/<p[^>]*>/gi, "\n").replace(/<\/p>/gi, "");

  // Remove <br> between <li> elements (lists should not have <br> between items)
  htmlContent = htmlContent.replace(/<\/li>\s*<br>\s*<br>\s*<li>/gi, "</li>\n<li>");
  htmlContent = htmlContent.replace(/<\/li>\s*<br>\s*<li>/gi, "</li>\n<li>");
  // Also remove <br> at the start of <li> (if any were added incorrectly)
  htmlContent = htmlContent.replace(/<li>\s*<br>\s*<br>/gi, "<li>");
  htmlContent = htmlContent.replace(/<li>\s*<br>/gi, "<li>");

  // add <br> before (ol, ul) if needed
  htmlContent = htmlContent.replace(/<br><br>(\s*<(ol|ul)[^>]*>)/gi, "<br>\n$1");

  return htmlContent;
}

export function removeStylesFromLists(htmlContent: string): string {
  // Strip ALL attributes from <ol>/<ul> (Google Docs adds style, start, etc.)
  htmlContent = htmlContent.replace(/<ol[^>]*>/gi, "<ol>\n");
  htmlContent = htmlContent.replace(/<ul[^>]*>/gi, "<ul>\n");
  htmlContent = htmlContent.replace(/<li[^>]*>/gi, "<li>");
  htmlContent = htmlContent.replace(/<\/li>/gi, "</li>\n");

  // Merge adjacent <ol></ol> blocks (Google Docs puts each <li> in its own <ol>)
  // Allow any whitespace or <br> tags between </ol> and <ol>
  let prevLen = 0;
  while (htmlContent.length !== prevLen) {
    prevLen = htmlContent.length;
    htmlContent = htmlContent.replace(/<\/ol>\s*(?:<br\s*\/?> *\s*)*<ol>/gi, "\n");
    htmlContent = htmlContent.replace(/<\/ul>\s*(?:<br\s*\/?> *\s*)*<ul>/gi, "\n");
  }

  return htmlContent;
}

export function replaceAllEmojisAndSymbolsExcludingHTML(htmlContent: string): string {
  const rx = /(?:\p{Extended_Pictographic}|(?![<>=&%"'#;:_-])[\p{S}\p{No}])(?:\uFE0F)?/gu;

  // Remove Zero Width Space and other invisible characters that cause issues
  htmlContent = htmlContent.replace(/[\u200B-\u200D\uFEFF]/g, "");

  return htmlContent.replace(rx, (match) => {
    return Array.from(match)
      .map((ch) => `&#${ch.codePointAt(0)};`)
      .join("");
  });
}

export function mergeSimilarTags(htmlContent: string): string {
  let prevLen = 0;
  while (htmlContent.length !== prevLen) {
    prevLen = htmlContent.length;
    // Merge IDENTICAL adjacent blocks (same exact opening tag) for p and h1-h6
    // This perfectly joins equivalently styled blocks (e.g. <p text-align: center>) across multiple lines.
    const exactMatchRegex = /(<(p|h[1-6])(?:\s+[^>]*|)>)((?:(?!<\/\2>)[\s\S])*?)<\/\2>\s*(?:<br\s*\/?>\s*)*\1/gi;
    htmlContent = htmlContent.replace(exactMatchRegex, (_match, openTag, _tagName, innerContent) => {
      return `${openTag}${innerContent}[[BR_SEP]]`;
    });
  }

  // Merge adjacent h6 tags that share the same text-align value (or both have none).
  // This handles footer text from Google Docs where tags are split but differ only in minor
  // style attributes like margin-bottom. Skips pairs with mismatched text-align (e.g. center
  // vs left) to avoid the layout bug the deprecated generic merge caused.
  {
    const getAlign = (attrs: string) =>
      (attrs.match(/text-align:\s*(\w+)/i) || [])[1]?.toLowerCase() ?? "";
    let matchFound = true;
    let iterations = 0;
    while (matchFound && iterations < 50) {
      matchFound = false;
      htmlContent = htmlContent.replace(
        /<h6([^>]*)>([\s\S]*?)<\/h6>\s*(?:<br\s*\/?>\s*)*<h6([^>]*)>/gi,
        (_match, attrs1, innerContent, attrs2) => {
          if (getAlign(attrs1) === getAlign(attrs2)) {
            matchFound = true;
            return `<h6${attrs1}>${innerContent}[[BR_SEP]]`;
          }
          return _match;
        }
      );
      iterations++;
    }
  }

  return htmlContent;
}
