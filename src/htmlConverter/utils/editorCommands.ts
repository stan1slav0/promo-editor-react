import type { HeadingTag } from "../markers";

const HEADING_TAGS: readonly string[] = ["h1", "h4", "h5", "h6"];

/**
 * Дії тулбара/гарячих клавіш над contenteditable-редактором.
 * Заголовки мають стати справжніми <h1>/<h4>/<h5>/<h6> (форматер матчить теги),
 * а wrapper-маркери — літеральним текстом, кожен на своєму рядку
 * (processStyles конвертує div → p, форматер матчить open([\s\S]*?)close).
 *
 * Основний шлях — document.execCommand (сам диспатчить `input`, який слухає
 * useEditorSync); Range-fallback для середовищ без execCommand (jsdom) диспатчить
 * `input` вручну.
 */

export function dispatchInput(editorEl: HTMLElement): void {
  editorEl.dispatchEvent(new Event("input", { bubbles: true }));
}

function execCommandSafe(command: string, value?: string): boolean {
  try {
    if (typeof document.execCommand !== "function") return false;
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

/** Найближчий heading-предок selection anchor у межах редактора. */
export function getActiveHeading(editorEl: HTMLElement): HeadingTag | null {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode || !editorEl.contains(sel.anchorNode)) return null;
  let node: Node | null = sel.anchorNode;
  while (node && node !== editorEl) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase();
      if (HEADING_TAGS.includes(tag)) return tag as HeadingTag;
    }
    node = node.parentNode;
  }
  return null;
}

/** Піднімається до прямого нащадка editorEl, який містить node. */
function topLevelBlock(editorEl: HTMLElement, node: Node): Node | null {
  if (node === editorEl) return null;
  let cur = node;
  while (cur.parentNode && cur.parentNode !== editorEl) cur = cur.parentNode;
  return cur.parentNode === editorEl ? cur : null;
}

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "UL", "OL", "BLOCKQUOTE", "TABLE", "TR", "TD", "PRE"]);

/**
 * Найближчий блоковий предок node (P/DIV/заголовки/LI/...), незалежно від глибини
 * вкладеності. На відміну від topLevelBlock, коректно працює й тоді, коли
 * параграфи НЕ є прямими дітьми editorEl — типовий випадок реальної вставки
 * з Google Docs, яка огортає весь вміст у <b id="docs-internal-guid-...">
 * (те саме, що normalize.ts:156 вирізає для Advanced-конвеєра, але тут — для
 * живого DOM редактора). Без цього topLevelBlock резолвить у сам wrapper і
 * маркери охоплюють весь вставлений блок замість одного параграфа.
 * Фолбек на topLevelBlock — для голого тексту без жодного блокового предка.
 */
export function nearestBlock(editorEl: HTMLElement, node: Node): Node | null {
  let cur: Node | null = node;
  while (cur && cur !== editorEl) {
    if (cur.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((cur as Element).tagName)) return cur;
    cur = cur.parentNode;
  }
  return topLevelBlock(editorEl, node);
}

function fallbackFormatBlock(editorEl: HTMLElement, tag: string): void {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode || !editorEl.contains(sel.anchorNode)) return;
  const block = nearestBlock(editorEl, sel.anchorNode);
  if (!block) return;

  const replacement = document.createElement(tag);
  if (block.nodeType === Node.TEXT_NODE) {
    block.parentNode?.replaceChild(replacement, block);
    replacement.appendChild(block);
  } else {
    const el = block as Element;
    while (el.firstChild) replacement.appendChild(el.firstChild);
    el.replaceWith(replacement);
  }

  const range = document.createRange();
  range.selectNodeContents(replacement);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Перемикає блок під курсором на <tag>; повторний виклик на активному тегу повертає <p>. */
export function toggleHeading(editorEl: HTMLElement, tag: HeadingTag): void {
  editorEl.focus();
  const target = getActiveHeading(editorEl) === tag ? "p" : tag;
  if (!execCommandSafe("formatBlock", `<${target}>`)) {
    fallbackFormatBlock(editorEl, target);
    dispatchInput(editorEl);
  }
}

/** Вставляє літеральний текст (oneBrSymbol) у позицію курсора. */
export function insertTextAtCaret(editorEl: HTMLElement, text: string): void {
  editorEl.focus();
  if (execCommandSafe("insertText", text)) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !editorEl.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  dispatchInput(editorEl);
}

/**
 * Обгортає виділені блоки парою маркерів: <div>open</div> перед блоком початку
 * виділення і <div>close</div> після блоку кінця — кожен маркер на своєму рядку.
 */
export function wrapSelectionWithMarkers(editorEl: HTMLElement, open: string, close: string): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editorEl.contains(range.startContainer) || !editorEl.contains(range.endContainer)) return;

  // Контейнером може бути сам editorEl (triple-click / select all) — тоді блок за offset.
  const resolveBlock = (container: Node, offset: number, isEnd: boolean): Node | null => {
    if (container !== editorEl) return nearestBlock(editorEl, container);
    const children = editorEl.childNodes;
    if (children.length === 0) return null;
    const idx = isEnd ? Math.min(offset, children.length) - 1 : Math.min(offset, children.length - 1);
    return children[Math.max(0, idx)];
  };

  const startBlock = resolveBlock(range.startContainer, range.startOffset, false);
  const endBlock = resolveBlock(range.endContainer, range.endOffset, true);
  if (!startBlock || !endBlock || !startBlock.parentNode || !endBlock.parentNode) return;

  const openEl = document.createElement("div");
  openEl.textContent = open;
  const closeEl = document.createElement("div");
  closeEl.textContent = close;

  // Вставляємо відносно РЕАЛЬНОГО батька резолвленого блока, не завжди editorEl —
  // block може бути вкладеним глибше за прямих дітей (див. nearestBlock).
  startBlock.parentNode.insertBefore(openEl, startBlock);
  if (endBlock.nextSibling) {
    endBlock.parentNode.insertBefore(closeEl, endBlock.nextSibling);
  } else {
    endBlock.parentNode.appendChild(closeEl);
  }
  dispatchInput(editorEl);
}
