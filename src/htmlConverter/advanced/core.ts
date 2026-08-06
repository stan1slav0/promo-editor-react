import * as dompurifyModule from "dompurify";
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
export const WARN = {
  imageWithoutSrc: "Зображення без src пропущено",
  nestedTableFlattened:
    "Вкладену таблицю сплющено до тексту (розмітка внутрішньої таблиці втрачена)",
  tablesMergedMismatch:
    "Сусідні таблиці об’єднано в одну, але колір рамки або ширини колонок другої таблиці відрізняються — застосовано значення першої",
  imageDroppedInCell:
    "Зображення в клітинці таблиці втрачено — цей тип блоку (розділювач/сітка статистики) не підтримує зображення всередині",
  sideImageMarkerUnclosed:
    "Маркер i-r-s/i-l-s без пари (не знайдено відповідного закриваючого маркера) — проігноровано",
  sideImageMixedContent:
    "Обгортка i-r-s/i-l-s містить непідтримуваний вміст (заголовок/зображення/таблицю) — текст не огортає зображення",
  footerMarkerUnclosed:
    "Маркер ftr-s/ftr-c без пари — блок футера проігноровано",
  signatureMarkerUnclosed:
    "Маркер sign-i без пари — блок підпису проігноровано",
} as const;
const ALWAYS_STRIP = new Set([
  "white-space",
  "vertical-align",
  "font-variant",
  "overflow",
  "overflow-wrap",
  "font-family",
  "font-size",
  "line-height",
  "margin",
  "margin-right",
  "padding-top",
  "padding-bottom",
  "padding-right",
  "border-collapse",
  "border-spacing",
]);
const STRIP_WHEN: Array<[string, string]> = [
  ["background-color", "transparent"],
  ["border", "none"],
];
function cleanStyle(style: string): string {
  const kept: string[] = [];
  for (const declaration of style.split(";")) {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex === -1) continue;
    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration
      .slice(separatorIndex + 1)
      .trim()
      .toLowerCase();
    if (!property || !value) continue;
    if (ALWAYS_STRIP.has(property)) continue;
    if (
      STRIP_WHEN.some(
        ([targetProperty, targetValue]) =>
          targetProperty === property && targetValue === value,
      )
    )
      continue;
    kept.push(`${property}: ${value}`);
  }
  return kept.join("; ");
}
function cleanElement(element: Element): void {
  element.removeAttribute("dir");
  const style = element.getAttribute("style");
  if (style !== null) {
    const cleanedStyle = cleanStyle(style);
    if (cleanedStyle) {
      element.setAttribute("style", cleanedStyle);
    } else {
      element.removeAttribute("style");
    }
  }
  for (const child of Array.from(element.children)) {
    cleanElement(child);
  }
}
function isOneBr(node: ChildNode | null): boolean {
  return (
    node?.nodeName === "BR" && (node as Element).hasAttribute("data-one-br")
  );
}
function cleanBrNoise(body: HTMLElement): void {
  body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li").forEach((element) => {
    while (
      element.firstChild?.nodeName === "BR" &&
      !isOneBr(element.firstChild)
    ) {
      element.firstChild.remove();
    }
    while (
      element.lastChild?.nodeName === "BR" &&
      !isOneBr(element.lastChild)
    ) {
      element.lastChild.remove();
    }
  });
  body.querySelectorAll("span").forEach((span) => {
    const nodes = Array.from(span.childNodes);
    const containsOnlyBreaks =
      nodes.length > 0 &&
      nodes.every(
        (node) =>
          node.nodeName === "BR" ||
          (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()),
      );
    if (containsOnlyBreaks) {
      span.replaceWith(...Array.from(span.childNodes));
    }
  });
}
const INLINE_WRAPPER_TAGS = new Set([
  "SPAN",
  "B",
  "STRONG",
  "EM",
  "I",
  "U",
  "A",
]);
function isWhitespaceText(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE && !node.textContent?.trim();
}
function previousMeaningfulSibling(node: Node): Node | null {
  let sibling = node.previousSibling;
  while (sibling && isWhitespaceText(sibling))
    sibling = sibling.previousSibling;
  return sibling;
}
function nextMeaningfulSibling(node: Node): Node | null {
  let sibling = node.nextSibling;
  while (sibling && isWhitespaceText(sibling)) sibling = sibling.nextSibling;
  return sibling;
}
function outermostWhileEdge(
  node: Node,
  getEdgeSibling: (currentNode: Node) => Node | null,
): Node {
  let current = node;
  for (;;) {
    const parent = current.parentNode as Element | null;
    if (!parent || !INLINE_WRAPPER_TAGS.has(parent.tagName)) return current;
    if (getEdgeSibling(current) !== null) return current;
    current = parent;
  }
}
function collapseAdjacentPlainBr(body: HTMLElement): void {
  body.querySelectorAll("br[data-one-br]").forEach((marker) => {
    const leadingEdge = outermostWhileEdge(marker, previousMeaningfulSibling);
    const previous = previousMeaningfulSibling(leadingEdge);
    if (previous?.nodeName === "BR" && !isOneBr(previous as ChildNode)) {
      previous.parentNode?.removeChild(previous);
    }
    const trailingEdge = outermostWhileEdge(marker, nextMeaningfulSibling);
    const next = nextMeaningfulSibling(trailingEdge);
    if (next?.nodeName === "BR" && !isOneBr(next as ChildNode)) {
      next.parentNode?.removeChild(next);
    }
  });
}
export function normalize(rawHtml: string): HTMLBodyElement {
  const document = new DOMParser().parseFromString(
    `<body>${rawHtml}</body>`,
    "text/html",
  );
  const body = document.body;
  body
    .querySelectorAll("meta, style, script")
    .forEach((element) => element.remove());
  body.querySelectorAll('b[id^="docs-internal-guid"]').forEach((element) => {
    element.replaceWith(...Array.from(element.childNodes));
  });
  cleanElement(body);
  body.querySelectorAll("span:not([style]):not([class])").forEach((span) => {
    span.replaceWith(...Array.from(span.childNodes));
  });
  cleanBrNoise(body);
  collapseAdjacentPlainBr(body);
  return body as HTMLBodyElement;
}
const DOMPurify = ((
  dompurifyModule as {
    default?: unknown;
  }
).default ?? dompurifyModule) as {
  sanitize(html: string, config: object): string;
};
const FRAGMENT_TAGS = [
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "colgroup",
  "col",
  "a",
  "img",
  "span",
  "div",
  "b",
  "strong",
  "em",
  "i",
  "u",
  "br",
  "p",
];
const DOCUMENT_TAGS = ["html", "head", "meta", "body", "title"];
const ALLOWED_ATTRIBUTES = [
  "style",
  "class",
  "width",
  "height",
  "align",
  "valign",
  "cellpadding",
  "cellspacing",
  "border",
  "bgcolor",
  "colspan",
  "rowspan",
  "role",
  "lang",
  "charset",
  "src",
  "alt",
  "href",
  "target",
];
export function sanitize(html: string): string {
  const isDocument = /^\s*(?:<!doctype\b|<html[\s>])/i.test(html);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: isDocument
      ? [...DOCUMENT_TAGS, ...FRAGMENT_TAGS]
      : FRAGMENT_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    WHOLE_DOCUMENT: isDocument,
  });
}
