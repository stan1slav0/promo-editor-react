export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function cleanEmptyHtmlTags(htmlContent: string): string {
  htmlContent = htmlContent.replace(/<\/a>\s*<a[^>]*>/g, " ");
  htmlContent = htmlContent.replace(/&nbsp;/g, " ");
  htmlContent = htmlContent.replace(/<b>\s*<\/b>/g, "");
  htmlContent = htmlContent.replace(/<li>\s*<\/li>/g, "");
  htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*){3,}/gi, "\n<br><br>\n");
  htmlContent = htmlContent.replace(/(<span[^>]*>)\s*<br><br>/gi, "$1");
  htmlContent = htmlContent.replace(/<pre>/g, "");
  htmlContent = htmlContent.replace(/<a[^>]*>\s*<\/a>/g, " ");
  htmlContent = htmlContent.replace(/<b\b[^>]*>\s*<\/b>/g, " ");
  htmlContent = htmlContent.replace(/<u>\s*<\/u>/g, " ");
  htmlContent = htmlContent.replace(/<em[^>]*>\s*<\/em>/g, " ");
  htmlContent = htmlContent.replace(
    /(<em(?:\s+[^>]*)?>)([\s\S]*?)<\/em>\s*<em((?:\s+[^>]*)?)>/g,
    (match, openTag: string, content: string, secondAttrs: string) => {
      const firstAttrs = openTag.slice(3, -1).trim();
      return firstAttrs === secondAttrs.trim()
        ? `${openTag}${content} `
        : match;
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
  htmlContent = htmlContent.replace(/<\/?(h[1-6])[^>]*>/gi, "");
  htmlContent = htmlContent.replace(/<br><br>\s*<br><br>/g, "<br><br>");
  htmlContent = htmlContent.replace(/(<(div|span)[^>]*>)\s*<br><br>/gi, "$1");
  htmlContent = htmlContent.replace(/<br>\s*<\/(div|span)>/g, "</$1>");
  let prevLen = 0;
  while (htmlContent.length !== prevLen) {
    prevLen = htmlContent.length;
    htmlContent = htmlContent.replace(
      /<span[^>]*>([\s\u00A0]*)<\/span>/gi,
      "$1",
    );
    htmlContent = htmlContent.replace(/<div[^>]*>([\s\u00A0]*)<\/div>/gi, "$1");
    htmlContent = htmlContent.replace(/<td[^>]*>([\s\u00A0]*)<\/td>/gi, "");
    htmlContent = htmlContent.replace(/<tr[^>]*>([\s\u00A0]*)<\/tr>/gi, "");
    htmlContent = htmlContent.replace(
      /<span[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/span>/gi,
      "",
    );
    htmlContent = htmlContent.replace(
      /<div[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/div>/gi,
      "",
    );
    htmlContent = htmlContent.replace(
      /<td[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/td>/gi,
      "",
    );
    htmlContent = htmlContent.replace(
      /<tr[^>]*>\s*(?:<br\s*\/?>\s*)+\s*<\/tr>/gi,
      "",
    );
    htmlContent = htmlContent.replace(
      /<([abiu]|em|strong)[^>]*>(\s*(?:<br\s*\/?>\s*)+)<\/\1>/gi,
      "$2",
    );
  }
  htmlContent = htmlContent.replace(
    /(?:<br\s*\/?>\s*)*(<hr[^>]*>)(?:\s*<br\s*\/?>)*/gi,
    "<br><br>\n$1\n<br>\n",
  );
  htmlContent = htmlContent.replace(
    /(<(?:div|p|span|td|th)[^>]*>)\s*(?:<br\s*\/?>\s*)+/gi,
    "$1\n",
  );
  htmlContent = htmlContent.replace(
    /(?:<br\s*\/?>\s*)+(<\/(?:div|p|span|td|th)>)/gi,
    "\n$1",
  );
  return htmlContent;
}
export function replaceTripleBrWithSingle(htmlContent: string): string {
  const BR = `<br><br>\n`;
  htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*){3,}/gi, BR);
  return htmlContent;
}
export function replaceAllEmojisAndSymbolsExcludingHTML(
  htmlContent: string,
): string {
  const rx =
    /(?:\p{Extended_Pictographic}|(?![<>=&%"'#;:_-])[\p{S}\p{No}])(?:\uFE0F)?/gu;
  htmlContent = htmlContent.replace(/[\u200B-\u200D\uFEFF]/g, "");
  return htmlContent.replace(rx, (match) => {
    return Array.from(match)
      .map((ch) => `&#${ch.codePointAt(0)};`)
      .join("");
  });
}
