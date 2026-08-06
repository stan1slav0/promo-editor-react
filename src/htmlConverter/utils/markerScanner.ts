/**
 * Чистий сканер літеральних маркер-токенів у DOM-піддереві (тестується в jsdom).
 * Повертає офсети в текстових нодах — Range'и будує споживач (useMarkerHighlighter).
 */

import { escapeRegExp } from "./htmlUtils";

export interface MarkerTokenMatch {
  node: Text;
  startOffset: number;
  endOffset: number;
  token: string;
}

function buildTokenRegex(tokens: string[]): RegExp | null {
  // Довші токени першими, інакше i-r-s "з'їсть" початок i-r-s-e
  const unique = [...new Set(tokens.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (unique.length === 0) return null;

  // Межі слова — тільки для токенів із словниковими краями: "xi-r-s" чи "ftr-sx"
  // матчитись не повинні, а символьний токен (§) зобов'язаний матчитись і впритул до тексту.
  const parts = unique.map((token) => {
    const pre = /^[\w-]/.test(token) ? "(?<![\\w-])" : "";
    const post = /[\w-]$/.test(token) ? "(?![\\w-])" : "";
    return pre + escapeRegExp(token) + post;
  });
  return new RegExp(parts.join("|"), "gi");
}

export function scanMarkerTokens(root: Node, tokens: string[]): MarkerTokenMatch[] {
  const regex = buildTokenRegex(tokens);
  if (!regex) return [];

  const matches: MarkerTokenMatch[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.nodeValue ?? "";
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      matches.push({ node, startOffset: match.index, endOffset: match.index + match[0].length, token: match[0] });
      if (match[0].length === 0) regex.lastIndex++;
    }
  }
  return matches;
}
