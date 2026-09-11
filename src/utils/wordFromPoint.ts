const WORD_CHAR = /[\p{L}\p{N}\u2019\u2018'-]/u;

export function normalizeLookupWord(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\u00ad/g, '')
    .replace(/[\u2018\u2019\u2032\u02bc]/g, "'")
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')
    .trim();
}

function caretRangeAt(doc: Document, x: number, y: number): Range | null {
  const anyDoc = doc as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };

  if (typeof anyDoc.caretRangeFromPoint === 'function') {
    return anyDoc.caretRangeFromPoint(x, y);
  }

  if (typeof anyDoc.caretPositionFromPoint === 'function') {
    const pos = anyDoc.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = doc.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }

  return null;
}

function textNodeFromCaret(
  caret: Range,
): { node: Text; offset: number } | null {
  const node = caret.startContainer;
  const offset = caret.startOffset;
  if (node.nodeType === Node.TEXT_NODE) {
    return { node: node as Text, offset };
  }

  const child = node.childNodes[offset] ?? node.childNodes[Math.max(offset - 1, 0)];
  if (child?.nodeType === Node.TEXT_NODE) {
    const text = child as Text;
    return {
      node: text,
      offset: child === node.childNodes[offset] ? 0 : text.length,
    };
  }

  const scope =
    child instanceof Element ? child : node instanceof Element ? node : null;
  if (!scope) return null;
  const walker = scope.ownerDocument.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode() as Text | null;
  return first ? { node: first, offset: 0 } : null;
}

export function wordAtPoint(
  doc: Document,
  x: number,
  y: number,
): { word: string; range: Range } | null {
  const caret = caretRangeAt(doc, x, y);
  if (!caret) return null;

  const resolved = textNodeFromCaret(caret);
  if (!resolved) return null;

  const { node } = resolved;
  let index = resolved.offset;
  const text = node.textContent ?? '';
  if (!text) return null;

  if (index >= text.length) index = text.length - 1;
  if (index < 0) return null;

  const current = text[index] ?? '';
  if (!WORD_CHAR.test(current)) {
    if (index > 0 && WORD_CHAR.test(text[index - 1] ?? '')) {
      index -= 1;
    } else {
      return null;
    }
  }

  let start = index;
  let end = index + 1;
  while (start > 0 && WORD_CHAR.test(text[start - 1] ?? '')) start -= 1;
  while (end < text.length && WORD_CHAR.test(text[end] ?? '')) end += 1;

  const word = normalizeLookupWord(text.slice(start, end));
  if (word.length < 2 || /^\d+$/.test(word)) return null;

  const range = doc.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return { word, range };
}

function rangeIsUnderPoint(range: Range, point: { x: number; y: number }): boolean {
  const slop = 4;
  return Array.from(range.getClientRects()).some(
    (r) =>
      point.x >= r.left - slop &&
      point.x <= r.right + slop &&
      point.y >= r.top - slop &&
      point.y <= r.bottom + slop,
  );
}

/**
 * epub.js paginates by scrolling a very wide iframe inside a clipped
 * container, so a range can exist in the document but sit on a page that is
 * not showing.
 */
function rangeIsOnScreen(range: Range, iframe: HTMLIFrameElement | null): boolean {
  if (!iframe) return true;
  const clip = (iframe.closest('.epub-container') ?? iframe.parentElement)?.getBoundingClientRect();
  if (!clip) return true;
  const frame = iframe.getBoundingClientRect();
  const r = range.getBoundingClientRect();
  const left = frame.left + r.left;
  const top = frame.top + r.top;
  return (
    left + r.width > clip.left &&
    left < clip.right &&
    top + r.height > clip.top &&
    top < clip.bottom
  );
}

/**
 * Resolve the word under a point given in the parent window's coordinates.
 * Taps are captured outside the book iframe because epub.js sandboxes it
 * without allow-scripts, and WebKit (every iOS browser) never runs event
 * listeners in such documents, not even ones the parent registered. Plain DOM
 * calls like caretRangeFromPoint still work.
 */
export function wordAtClientPoint(
  doc: Document,
  clientX: number,
  clientY: number,
): { word: string; range: Range } | null {
  const iframe = doc.defaultView?.frameElement as HTMLIFrameElement | null;
  if (!iframe) return null;
  const frame = iframe.getBoundingClientRect();
  const point = { x: clientX - frame.left, y: clientY - frame.top };
  if (point.x < 0 || point.y < 0 || point.x > frame.width || point.y > frame.height) {
    return null;
  }

  const hit = wordAtPoint(doc, point.x, point.y);
  if (!hit || !rangeIsUnderPoint(hit.range, point) || !rangeIsOnScreen(hit.range, iframe)) {
    return null;
  }
  return hit;
}

export function clearWordHighlights(doc: Document): void {
  doc.querySelectorAll('mark.reading-word-hit').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

/**
 * One or more words, kept as character offsets into their block's
 * textContent. Highlighting wraps text in <mark>s and clearing normalizes the
 * DOM, which breaks stored Ranges; these offsets survive both.
 */
export interface WordSelection {
  block: Element;
  start: number;
  end: number;
}

const BLOCK_SELECTOR =
  'p, li, blockquote, h1, h2, h3, h4, h5, h6, dd, dt, td, th, figcaption, div';

function offsetInBlock(block: Element, node: Node, offset: number): number {
  const range = block.ownerDocument.createRange();
  range.setStart(block, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

export function selectionFromRange(range: Range): WordSelection | null {
  const container = range.startContainer;
  const el =
    container.nodeType === Node.ELEMENT_NODE
      ? (container as Element)
      : container.parentElement;
  const block = el?.closest(BLOCK_SELECTOR) ?? el?.ownerDocument.body;
  if (!block) return null;
  return {
    block,
    start: offsetInBlock(block, range.startContainer, range.startOffset),
    end: offsetInBlock(block, range.endContainer, range.endOffset),
  };
}

function rangeFromSelection(sel: WordSelection): Range | null {
  const doc = sel.block.ownerDocument;
  const walker = doc.createTreeWalker(sel.block, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  let pos = 0;
  let startSet = false;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const len = node.data.length;
    if (!startSet && sel.start < pos + len) {
      range.setStart(node, sel.start - pos);
      startSet = true;
    }
    if (startSet && sel.end <= pos + len) {
      range.setEnd(node, sel.end - pos);
      return range;
    }
    pos += len;
  }
  return null;
}

export function selectionText(sel: WordSelection): string {
  const raw = (sel.block.textContent ?? '').slice(sel.start, sel.end);
  return normalizeLookupWord(raw.replace(/\s+/g, ' '));
}

/**
 * The selection grown by one word before or after it. Only whitespace may sit
 * between words, so a phrase never swallows a comma or runs into the next
 * sentence. Returns null when there is no such word.
 */
export function extendSelection(
  sel: WordSelection,
  direction: 'prev' | 'next',
): WordSelection | null {
  const text = sel.block.textContent ?? '';
  if (direction === 'next') {
    let from = sel.end;
    while (from < text.length && /\s/.test(text[from] ?? '')) from += 1;
    let end = from;
    while (end < text.length && WORD_CHAR.test(text[end] ?? '')) end += 1;
    return from > sel.end && end > from ? { ...sel, end } : null;
  }

  let to = sel.start;
  while (to > 0 && /\s/.test(text[to - 1] ?? '')) to -= 1;
  let start = to;
  while (start > 0 && WORD_CHAR.test(text[start - 1] ?? '')) start -= 1;
  return to < sel.start && start < to ? { ...sel, start } : null;
}

export function highlightSelection(sel: WordSelection): void {
  const doc = sel.block.ownerDocument;
  clearWordHighlights(doc);
  const range = rangeFromSelection(sel);
  if (!range) return;

  // Each text node's slice gets its own <mark>, so a selection that crosses
  // inline elements ("give <i>up</i>") still highlights; surroundContents
  // throws on those.
  const root = range.commonAncestorContainer;
  const nodes: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) {
    nodes.push(root as Text);
  } else {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (range.intersectsNode(node)) nodes.push(node as Text);
    }
  }

  const segments = nodes
    .map((node) => ({
      node,
      start: node === range.startContainer ? range.startOffset : 0,
      end: node === range.endContainer ? range.endOffset : node.data.length,
    }))
    .filter((s) => s.end > s.start);

  for (const { node, start, end } of segments) {
    const middle = node.splitText(start);
    middle.splitText(end - start);
    const mark = doc.createElement('mark');
    mark.className = 'reading-word-hit';
    middle.parentNode?.insertBefore(mark, middle);
    mark.appendChild(middle);
  }
}
