import { SYMBOLS } from "./constants";
import { escapeRegExp } from "./utils/htmlUtils";

export function isSignatureImageTag(imgTag: string): boolean {
  return /alt=["'].*signature.*["']/i.test(imgTag);
}

export function addOneBr(
  htmlContent: string,
  symbol: string = SYMBOLS.ONE_BR,
): string {
  const marker = "___PROMO_FORMATTER_ONE_BR___";
  const oneBrRe = new RegExp(escapeRegExp(symbol || SYMBOLS.ONE_BR), "gi");

  htmlContent = htmlContent.replace(oneBrRe, marker);
  htmlContent = htmlContent.replace(
    new RegExp(`(?:<br\\s*/?>\\s*)*${marker}(?:\\s*<br\\s*/?>)*`, "gi"),
    "<br>\n",
  );
  htmlContent = htmlContent.replace(
    /(<br\s*\/?>)\s*(<\/(?:b|em|i|u|a|strong)>)\s*(?:<br\s*\/?>)*/gi,
    "$2<br>\n",
  );
  htmlContent = htmlContent.replace(
    /(<(?:div|p|span|td|th)[^>]*>)\s*<br\s*\/?>/gi,
    "$1",
  );
  htmlContent = htmlContent.replace(
    /<br\s*\/?>\s*(<\/(?:div|p|span|td|th)>)/gi,
    "$1",
  );

  return htmlContent;
}

export function addBrAfterClosingP(htmlContent: string): string {
  htmlContent = htmlContent.replace(
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    (_match, liContent: string) => {
      const cleanedContent = liContent
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "");
      return `<li>${cleanedContent}</li>`;
    },
  );
  htmlContent = htmlContent.replace(
    /<\/p>\s*(?:<br\s*\/?>\s*)+(<p\b)/gi,
    "</p>$1",
  );
  htmlContent = htmlContent.replace(
    /<\/p>\s*(?:<br\s*\/?>\s*)+(<(?:ul|ol)\b)/gi,
    "</p>$1",
  );
  htmlContent = htmlContent.replace(
    /(<\/(?:ul|ol)>)\s*(?:<br\s*\/?>\s*)+(<p\b)/gi,
    "$1$2",
  );
  htmlContent = htmlContent.replace(
    /(<\/(?:ul|ol)>)\s*(?:<br\s*\/?>\s*)+/gi,
    "$1\n",
  );
  htmlContent = htmlContent.replace(
    /(<p[^>]*>[\s\S]*?<\/p>)(\s*<p[^>]*>\s*<br\s*\/?>\s*<\/p>\s*){1,}(<p[^>]*>[\s\S]*?<\/p>)/gi,
    (_match, beforeP: string, _emptyPs: string, afterP: string) =>
      beforeP + afterP,
  );
  htmlContent = htmlContent.replace(/<\/p>(?!\s*<\/li>)/gi, "</p>\n<br><br>\n");
  htmlContent = htmlContent.replace(/<p[^>]*>/gi, "\n").replace(/<\/p>/gi, "");
  htmlContent = htmlContent.replace(
    /<\/li>\s*<br>\s*<br>\s*<li>/gi,
    "</li>\n<li>",
  );
  htmlContent = htmlContent.replace(/<\/li>\s*<br>\s*<li>/gi, "</li>\n<li>");
  htmlContent = htmlContent.replace(/<li>\s*<br>\s*<br>/gi, "<li>");
  htmlContent = htmlContent.replace(/<li>\s*<br>/gi, "<li>");
  htmlContent = htmlContent.replace(
    /<br><br>(\s*<(ol|ul)[^>]*>)/gi,
    "<br>\n$1",
  );

  return htmlContent;
}

export function removeStylesFromLists(htmlContent: string): string {
  htmlContent = htmlContent.replace(/<ol[^>]*>/gi, "<ol>\n");
  htmlContent = htmlContent.replace(/<ul[^>]*>/gi, "<ul>\n");
  htmlContent = htmlContent.replace(/<li[^>]*>/gi, "<li>");
  htmlContent = htmlContent.replace(/<\/li>/gi, "</li>\n");

  let previousLength = 0;
  while (htmlContent.length !== previousLength) {
    previousLength = htmlContent.length;
    htmlContent = htmlContent.replace(
      /<\/ol>\s*(?:<br\s*\/?> *\s*)*<ol>/gi,
      "\n",
    );
    htmlContent = htmlContent.replace(
      /<\/ul>\s*(?:<br\s*\/?> *\s*)*<ul>/gi,
      "\n",
    );
  }

  return htmlContent;
}

export function mergeSimilarTags(htmlContent: string): string {
  let previousLength = 0;
  while (htmlContent.length !== previousLength) {
    previousLength = htmlContent.length;
    const exactMatchRegex =
      /(<(p|h[1-6])(?:\s+[^>]*|)>)((?:(?!<\/\2>)[\s\S])*?)<\/\2>\s*(?:<br\s*\/?>\s*)*\1/gi;
    htmlContent = htmlContent.replace(
      exactMatchRegex,
      (_match, openTag: string, _tagName: string, innerContent: string) =>
        `${openTag}${innerContent}[[BR_SEP]]`,
    );
  }

  const getAlign = (attrs: string) =>
    (attrs.match(/text-align:\s*(\w+)/i) || [])[1]?.toLowerCase() ?? "";
  let matchFound = true;
  let iterations = 0;

  while (matchFound && iterations < 50) {
    matchFound = false;
    htmlContent = htmlContent.replace(
      /<h6([^>]*)>([\s\S]*?)<\/h6>\s*(?:<br\s*\/?>\s*)*<h6([^>]*)>/gi,
      (match, attrs1: string, innerContent: string, attrs2: string) => {
        if (getAlign(attrs1) !== getAlign(attrs2)) return match;
        matchFound = true;
        return `<h6${attrs1}>${innerContent}[[BR_SEP]]`;
      },
    );
    iterations += 1;
  }

  return htmlContent;
}
