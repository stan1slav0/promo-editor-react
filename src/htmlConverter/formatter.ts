/**
 * Main HTML/MJML formatting logic
 */

import { PLACEHOLDER_URL } from "./constants";
import { htmlTemplates, mjmlTemplates } from "./templates";
import * as colorUtils from "./utils/colorUtils";
import { config } from "./utils/config";
import * as utils from "./utils/htmlUtils";

function getInlineStyleValue(style: string, property: string): string | null {
  const targetProperty = property.trim().toLowerCase();
  const declarations = style.split(";");

  for (const declaration of declarations) {
    const [rawProperty, ...rawValueParts] = declaration.split(":");
    if (!rawProperty || rawValueParts.length === 0) continue;

    if (rawProperty.trim().toLowerCase() !== targetProperty) continue;

    const rawValue = rawValueParts.join(":").trim();
    return rawValue || null;
  }

  return null;
}

function italicLinks(htmlContent: string): string {
  // Save native <a href="https://..."> links before stripping so they survive.
  const savedLinks: string[] = [];
  htmlContent = htmlContent.replace(/<a\s[^>]*href=(["'])(https?:\/\/[^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _q, _href, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    
    // Extract leading/trailing spaces to correctly place them OUTSIDE the link tag
    const leadingSpaceMatch = text.match(/^([\s\u00A0]*)/);
    const trailingSpaceMatch = text.match(/([\s\u00A0]*)$/);
    
    const leadingSpaces = leadingSpaceMatch ? leadingSpaceMatch[1] : "";
    const trailingSpaces = trailingSpaceMatch ? trailingSpaceMatch[1] : "";
    const coreText = text.trim();

    if (!coreText) {
      // If the link contains image(s) but no text — preserve the img tags so they
      // reach wrapTextInSpan for proper template wrapping. Without this the images
      // inside <a href="..."><img ...></a> are silently dropped.
      const imgTags = inner.match(/<img[^>]*>/gi);
      if (imgTags && imgTags.length > 0) return imgTags.join("");
      return text; // just whitespace — safe to drop
    }

    const hasItalic = /font-style:\s*italic/i.test(inner);
    const linkContent = hasItalic ? `<em>${coreText}</em>` : coreText;
    const placeholder = `\x02LINK${savedLinks.length}\x03`;
    savedLinks.push(`<a href="${PLACEHOLDER_URL}" style="font-family:'Roboto', Arial, Helvetica, sans-serif;text-decoration: underline;font-weight: 700; color: ${config.colors.link};">${linkContent}</a>`);
    return `${leadingSpaces}${placeholder}${trailingSpaces}`;
  });

  htmlContent = htmlContent.replace(/<a[^>]*>/gi, "").replace(/<\/a>/gi, "");

  const regex = /(<span\b[^>]*style=(["'])[\s\S]*?\2[^>]*>[\s\S]*?<\/span>)/gi;

  htmlContent = htmlContent.replace(regex, (match, _full, _quote) => {
    const styleMatch = match.match(/style=(["'])([\s\S]*?)\1/i);
    if (!styleMatch) return match;
    const style = styleMatch[2];
    const innerText = match.replace(/<[^>]+>/g, "");
    const color = getInlineStyleValue(style, "color");
    const fontStyle = getInlineStyleValue(style, "font-style");

    if (!color || !fontStyle || !/italic/i.test(fontStyle)) {
      return match;
    }

    if (colorUtils.isLinkColor(color)) {
      const leadingSpaceMatch = innerText.match(/^([\s\u00A0]*)/);
      const trailingSpaceMatch = innerText.match(/([\s\u00A0]*)$/);
      
      const leadingSpaces = leadingSpaceMatch ? leadingSpaceMatch[1] : "";
      const trailingSpaces = trailingSpaceMatch ? trailingSpaceMatch[1] : "";
      const coreText = innerText.trim();
      
      if (!coreText) return match;

      return `${leadingSpaces}<a href="${PLACEHOLDER_URL}" style="font-family:'Roboto', Arial, Helvetica, sans-serif;text-decoration: underline;font-weight: 700; color: ${config.colors.link};"><em>${coreText}</em></a>${trailingSpaces}`;
    }
    return match;
  });

  // eslint-disable-next-line no-control-regex -- \x02/\x03 are deliberate sentinel bytes marking saved-link placeholders
  htmlContent = htmlContent.replace(/\x02LINK(\d+)\x03/g, (_, i) => savedLinks[+i] ?? "");

  return htmlContent;
}

function linksStyles(htmlContent: string): string {
  const reg = /<span\b[^>]*style=(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/span>/gi;

  htmlContent = htmlContent.replace(reg, (match, _quote, style, innerText) => {
    const color = getInlineStyleValue(style, "color");
    if (!color) return match;

    if (colorUtils.isLinkColor(color)) {
      const leadingSpaceMatch = innerText.match(/^([\s\u00A0]*)/);
      const trailingSpaceMatch = innerText.match(/([\s\u00A0]*)$/);
      
      const leadingSpaces = leadingSpaceMatch ? leadingSpaceMatch[1] : "";
      const trailingSpaces = trailingSpaceMatch ? trailingSpaceMatch[1] : "";
      // Avoid mutating tags internally if any exist, just strip ends
      const coreText = innerText.slice(leadingSpaces.length, innerText.length - trailingSpaces.length);

      if (!coreText) return match;

      return `${leadingSpaces}<a href="${PLACEHOLDER_URL}" style="font-family:'Roboto', Arial, Helvetica, sans-serif;text-decoration: underline;font-weight: 700; color: ${config.colors.link};">${coreText}</a>${trailingSpaces}`;
    }
    return match;
  });
  return htmlContent;
}

function processStyles(htmlContent: string): string {
  htmlContent = htmlContent.replace(/<b\b[^>]*>/gi, "").replace(/<\/b>/gi, "");

  // Single-pass style detection: parse style once, emit correct semantic tag
  // This fixes order-sensitivity (e.g. italic before bold) that the old 7-regex approach had
  htmlContent = htmlContent.replace(/<span[^>]*style=["']([^"']*)["'][^>]*>(.*?)<\/span>/gi, (_match: string, style: string, inner: string) => {
    const bold = /font-weight:\s*700/i.test(style);
    const italic = /font-style:\s*italic/i.test(style);
    const underline = /text-decoration(?:-line)?\s*:[^;]*\bunderline\b/i.test(style);

    if (bold && italic && underline) return `<em style="text-decoration: underline;font-weight: bold;">${inner}</em>`;
    if (italic && underline) return `<em style="text-decoration: underline;">${inner}</em>`;
    if (bold && italic) return `<b style="font-style: italic;">${inner}</b>`;
    if (bold && underline) return `<b style="text-decoration: underline;">${inner}</b>`;
    if (underline) return `<u>${inner}</u>`;
    if (bold) return `<b>${inner}</b>`;
    if (italic) return `<em>${inner}</em>`;

    return inner; // No formatting — strip the span
  });

  // Convert <div> to <p> so block structure is preserved by the paragraph formatter later
  htmlContent = htmlContent.replace(/<div[^>]*>/gi, "<p>");
  htmlContent = htmlContent.replace(/<\/div>/gi, "</p>");

  // Preserve basic spacing for tables before stripping their structure
  // Add space between cells but NOT at the end of a row (before </tr>)
  htmlContent = htmlContent.replace(/<\/td>(?!\s*<\/tr>)/gi, " ");
  htmlContent = htmlContent.replace(/<\/th>(?!\s*<\/tr>)/gi, " ");
  htmlContent = htmlContent.replace(/<\/tr>/gi, "<br>\n");

  // Delete table tags
  htmlContent = htmlContent.replace(/<\/?(table|tbody|thead|tr|td|th|col|colgroup)[^>]*>/gi, "");

  // Delete remaining empty/wrapper tags
  htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, " ");
  htmlContent = htmlContent.replace(/<span[^>]*>/gi, "").replace(/<\/span>/gi, "");
  htmlContent = htmlContent.replace(/<b>\s*<\/b>/g, "");

  return htmlContent;
}

function applyTemplate(content: string, regex: RegExp, templateFn: (content: string) => string): string {
  return content.replace(regex, (_match, innerContent) => templateFn(innerContent));
}

// Special handling for the function that wraps images AND the whole content
function wrapTextInSpan(htmlContent: string, templateFn: (content: string) => string, type: "html" | "mjml" = "html"): string {
  // 1. Replace Images
  htmlContent = htmlContent.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, function (_match, src) {
    return templateFn(src);
  });

  // 2. Wrap the whole result in a default span block
  if (type === "html") {
    htmlContent = `<tr>
                      <td style="font-family:${config.fontFamily};font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;padding-top: 14px; padding-bottom: 14px;">
                                <span style="font-family:${config.fontFamily};font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                                    ${htmlContent}
                                </span>
                      </td>
                    </tr>`;
  } else {
    htmlContent = `
            <tr>
              <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                <div style="font-family:${config.fontFamily};font-size:18px;font-style:normal;font-weight:normal;line-height:1.5;text-align:left;color:#000000;">
                    ${htmlContent}
                </div>
              </td>
            </tr>
        `;
  }
  return htmlContent;
}

export function formatHtml(editorContent: string, oneBrSymbol?: string): string {
  let content = editorContent;
  content = content.replace(/<meta[^>]*>/gi, "");
  content = content.replace(/<br\b[^>]*>/gi, "<br>");
  content = utils.mergeSimilarTags(content);
  content = italicLinks(content);
  content = linksStyles(content);
  content = utils.replaceAllEmojisAndSymbolsExcludingHTML(content);
  content = processStyles(content);

  // Block Wrappers
  content = applyTemplate(content, /<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, htmlTemplates.centerText);
  content = applyTemplate(content, /<h6[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h6>/gi, htmlTemplates.smallCenterText);
  content = applyTemplate(content, /<h6[^>]*>([\s\S]*?)<\/h6>/gi, htmlTemplates.smallText);
  content = applyTemplate(content, /<h1[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h1>/gi, htmlTemplates.centerHeadline);
  content = applyTemplate(content, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, htmlTemplates.headline);
  content = applyTemplate(content, /<h5[^>]*>([\s\S]*?)<\/h5>/gi, htmlTemplates.button);
  content = applyTemplate(content, /<h4[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi, htmlTemplates.centerQuote);
  content = applyTemplate(content, /<h4[^>]*>([\s\S]*?)<\/h4>/gi, htmlTemplates.quote);

  content = utils.addBrAfterClosingP(content);
  // Clean up whitespace around [[BR_SEP]] and replace with <br><br> on its own line
  content = content.replace(/\s*\[\[BR_SEP\]\]\s*/g, "\n<br><br>\n");
  content = utils.removeStylesFromLists(content);

  // Complex wrapping (Images + Body)
  content = wrapTextInSpan(content, htmlTemplates.wrapImg, "html");

  // More wrappers
  content = applyTemplate(content, /i-r-s([\s\S]*?)i-r-s-e/gi, htmlTemplates.rightSideImg);
  content = applyTemplate(content, /i-l-s([\s\S]*?)i-l-s-e/gi, htmlTemplates.leftSideImg);
  content = applyTemplate(content, /sign-i([\s\S]*?)sign-i-e/gi, htmlTemplates.signatureImg);
  content = applyTemplate(content, /ftr-s([\s\S]*?)ftr-e/gi, htmlTemplates.footerBlock);
  content = applyTemplate(content, /ftr-c([\s\S]*?)ftr-c-e/gi, htmlTemplates.footerCenterBlock);

  content = utils.cleanEmptyHtmlTags(content);
  content = htmlTemplates.fullStructure(content);
  content = utils.addOneBr(content, oneBrSymbol);
  content = utils.replaceTripleBrWithSingle(content);

  return content;
}

export function formatMjml(editorContent: string, oneBrSymbol?: string): string {
  let content = editorContent;
  content = content.replace(/<meta[^>]*>/gi, "");
  content = content.replace(/<br\b[^>]*>/gi, "<br>");
  content = utils.mergeSimilarTags(content);
  content = italicLinks(content);
  content = linksStyles(content);
  content = utils.replaceAllEmojisAndSymbolsExcludingHTML(content);
  content = processStyles(content);

  // Block Wrappers
  content = applyTemplate(content, /<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, mjmlTemplates.centerText);
  content = applyTemplate(content, /<h6[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h6>/gi, mjmlTemplates.smallCenterText);
  content = applyTemplate(content, /<h6[^>]*>([\s\S]*?)<\/h6>/gi, mjmlTemplates.smallText);
  content = applyTemplate(content, /<h1[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h1>/gi, mjmlTemplates.centerHeadline);
  content = applyTemplate(content, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, mjmlTemplates.headline);
  content = applyTemplate(content, /<h4[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi, mjmlTemplates.centerQuote);
  content = applyTemplate(content, /<h4[^>]*>([\s\S]*?)<\/h4>/gi, mjmlTemplates.quote);
  content = applyTemplate(content, /<h5[^>]*>([\s\S]*?)<\/h5>/gi, mjmlTemplates.button);

  content = utils.addBrAfterClosingP(content);
  // Clean up whitespace around [[BR_SEP]] and replace with <br><br> on its own line
  content = content.replace(/\s*\[\[BR_SEP\]\]\s*/g, "\n<br><br>\n");
  content = utils.removeStylesFromLists(content);

  // Complex wrapping
  content = wrapTextInSpan(content, mjmlTemplates.wrapImg, "mjml");

  // More wrappers
  content = applyTemplate(content, /i-l-s([\s\S]*?)i-l-s-e/gi, mjmlTemplates.leftSideImg);
  content = applyTemplate(content, /i-r-s([\s\S]*?)i-r-s-e/gi, mjmlTemplates.rightSideImg);
  content = applyTemplate(content, /sign-i([\s\S]*?)sign-i-e/gi, mjmlTemplates.signatureImg);
  content = applyTemplate(content, /ftr-s([\s\S]*?)ftr-e/gi, mjmlTemplates.footerBlock);
  content = applyTemplate(content, /ftr-c([\s\S]*?)ftr-c-e/gi, mjmlTemplates.footerCenterBlock);

  content = utils.cleanEmptyHtmlTags(content);
  content = mjmlTemplates.fullStructure(content);
  content = utils.addOneBr(content, oneBrSymbol);
  content = utils.replaceTripleBrWithSingle(content);

  return content;
}
