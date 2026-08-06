import { SYMBOLS } from "../constants";
import {
  escapeRegExp,
  replaceAllEmojisAndSymbolsExcludingHTML,
} from "../utils/htmlUtils";
import { WARN } from "./core";
import type { WarnFn } from "./ir/types";
export function resolveOneBrSymbol(
  html: string,
  symbol: string = SYMBOLS.ONE_BR,
): string {
  const oneBrRe = new RegExp(
    `(?:<br\\s*/?>\\s*)*${escapeRegExp(symbol || SYMBOLS.ONE_BR)}(?:\\s*<br\\s*/?>)*`,
    "gi",
  );
  return html.replace(oneBrRe, '<br data-one-br="1">');
}
export const normalizeSymbols = replaceAllEmojisAndSymbolsExcludingHTML;
interface MarkerSpec {
  open: string;
  close: string;
  attribute: string;
  value: string;
  warning: string;
}
const SIDE_IMAGE_MARKERS: MarkerSpec[] = [
  {
    open: "i-r-s",
    close: "i-r-s-e",
    attribute: "data-side-image",
    value: "right",
    warning: WARN.sideImageMarkerUnclosed,
  },
  {
    open: "i-l-s",
    close: "i-l-s-e",
    attribute: "data-side-image",
    value: "left",
    warning: WARN.sideImageMarkerUnclosed,
  },
];
const CONTENT_MARKERS: MarkerSpec[] = [
  {
    open: "ftr-s",
    close: "ftr-e",
    attribute: "data-advanced-footer",
    value: "left",
    warning: WARN.footerMarkerUnclosed,
  },
  {
    open: "ftr-c",
    close: "ftr-c-e",
    attribute: "data-advanced-footer",
    value: "center",
    warning: WARN.footerMarkerUnclosed,
  },
  {
    open: "sign-i",
    close: "sign-i-e",
    attribute: "data-advanced-signature",
    value: "1",
    warning: WARN.signatureMarkerUnclosed,
  },
];
function normalizedMarkerText(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}
function collectMarkerAnchors(
  body: HTMLElement,
  tokens: Set<string>,
): Map<string, Element[]> {
  const anchors = new Map<string, Element[]>();
  const seen = new Set<Element>();
  const walker = body.ownerDocument.createTreeWalker(body, 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const token = normalizedMarkerText(node.textContent);
    if (!tokens.has(token)) continue;
    let host = (node as Text).parentElement;
    if (!host || normalizedMarkerText(host.textContent) !== token) continue;
    while (
      host.parentElement &&
      host.parentElement !== body &&
      normalizedMarkerText(host.parentElement.textContent) === token
    ) {
      host = host.parentElement;
    }
    if (seen.has(host)) continue;
    seen.add(host);
    const list = anchors.get(token) ?? [];
    list.push(host);
    anchors.set(token, list);
  }
  return anchors;
}
function isBefore(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & 4);
}
function wrapMarkerPair(open: Element, close: Element, spec: MarkerSpec): void {
  const document = open.ownerDocument;
  const range = document.createRange();
  range.setStartAfter(open);
  range.setEndBefore(close);
  const content = range.extractContents();
  const wrapper = document.createElement("div");
  wrapper.setAttribute(spec.attribute, spec.value);
  wrapper.append(content);
  range.insertNode(wrapper);
  open.remove();
  close.remove();
}
function resolveMarkers(
  html: string,
  specs: MarkerSpec[],
  warn?: WarnFn,
): string {
  const document = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html",
  );
  const body = document.body;
  const tokens = new Set(specs.flatMap(({ open, close }) => [open, close]));
  for (;;) {
    const anchors = collectMarkerAnchors(body, tokens);
    let matched = false;
    for (const spec of specs) {
      const open = anchors.get(spec.open)?.[0];
      const close = (anchors.get(spec.close) ?? []).find(
        (candidate) => open && isBefore(open, candidate),
      );
      if (!open || !close) continue;
      wrapMarkerPair(open, close, spec);
      matched = true;
      break;
    }
    if (!matched) break;
  }
  const leftovers = collectMarkerAnchors(body, tokens);
  for (const spec of specs) {
    const unmatched = [
      ...(leftovers.get(spec.open) ?? []),
      ...(leftovers.get(spec.close) ?? []),
    ];
    if (unmatched.length === 0) continue;
    warn?.(spec.warning);
    new Set(unmatched).forEach((element) => element.remove());
  }
  return body.innerHTML;
}
export function resolveSideImageMarkers(html: string, warn?: WarnFn): string {
  return resolveMarkers(html, SIDE_IMAGE_MARKERS, warn);
}
export function resolveAdvancedMarkers(html: string, warn?: WarnFn): string {
  return resolveMarkers(
    html,
    [...SIDE_IMAGE_MARKERS, ...CONTENT_MARKERS],
    warn,
  );
}
export function preprocess(
  html: string,
  oneBrSymbol?: string,
  warn?: WarnFn,
): string {
  html = resolveOneBrSymbol(html, oneBrSymbol);
  html = resolveAdvancedMarkers(html, warn);
  return html;
}
