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
 * Resolve a tapped word, trying several coordinate interpretations.
 * clientX/Y is right in most browsers. Some report it in the parent window, so
 * iframe-relative and target-offset points are fallbacks. offsetX/Y is last
 * because in CSS multi-column layouts (every paginated book) it is measured in
 * the unfragmented flow, so it lands on the wrong line or page for paragraphs
 * split across pages. Each candidate must land on a visible word under the
 * point it was computed from.
 */
export function wordFromPointerEvent(
  event: PointerEvent,
  doc: Document,
): { word: string; range: Range } | null {
  const points: Array<{ x: number; y: number }> = [
    { x: event.clientX, y: event.clientY },
  ];

  const iframe = doc.defaultView?.frameElement as HTMLIFrameElement | null;
  if (iframe) {
    const rect = iframe.getBoundingClientRect();
    points.push({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  const target = event.target;
  if (target instanceof Element) {
    const rect = target.getBoundingClientRect();
    points.push({
      x: rect.left + event.offsetX,
      y: rect.top + event.offsetY,
    });
  }

  const seen = new Set<string>();
  for (const point of points) {
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = wordAtPoint(doc, point.x, point.y);
    if (hit && rangeIsUnderPoint(hit.range, point) && rangeIsOnScreen(hit.range, iframe)) {
      return hit;
    }
  }

  return null;
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

export function highlightWordRange(range: Range): void {
  const doc = range.startContainer.ownerDocument;
  if (!doc) return;
  clearWordHighlights(doc);
  try {
    const mark = doc.createElement('mark');
    mark.className = 'reading-word-hit';
    range.surroundContents(mark);
  } catch {
    // Range crossed element boundaries; skip the visual highlight.
  }
}
