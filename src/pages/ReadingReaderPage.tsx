import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Book, Contents, Location, Rendition } from 'epubjs';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { WordLookupSheet } from '../components/WordLookupSheet';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import type { LookupResult } from '../types';
import { getCachedLookup, setCachedLookup } from '../utils/lookupCache';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languages';
import {
  getReadingBook,
  getReadingBookFile,
  loadEpubConstructor,
  saveReadingProgress,
  touchReadingBook,
  type ReadingBookMeta,
} from '../utils/readingLibrary';
import {
  clearWordHighlights,
  highlightWordRange,
  wordFromPointerEvent,
} from '../utils/wordFromPoint';

const READER_THEME = {
  body: {
    background: '#12121f !important',
    color: '#f0f0f5 !important',
    'font-family': 'Georgia, "Times New Roman", serif !important',
    'font-size': '1.08rem !important',
    'line-height': '1.75 !important',
  },
  p: {
    'margin-bottom': '0.7em !important',
  },
  a: {
    color: '#a99eff !important',
  },
  img: {
    'max-width': '100% !important',
    height: 'auto !important',
  },
};

const HIGHLIGHT_CSS = `
  .reading-word-hit {
    background: rgba(124, 108, 255, 0.4);
    border-radius: 3px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
`;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(label));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function waitForElementSize(el: HTMLElement, minHeight = 120, maxWait = 1200): Promise<void> {
  return new Promise((resolve) => {
    if (el.clientWidth > 40 && el.clientHeight >= minHeight) {
      resolve();
      return;
    }
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 40 && el.clientHeight >= minHeight) {
        observer.disconnect();
        window.clearTimeout(timer);
        resolve();
      }
    });
    observer.observe(el);
    const timer = window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, maxWait);
  });
}

export function ReadingReaderPage() {
  const { bookId = '' } = useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const lookupGen = useRef(0);
  const saveTimer = useRef<number | null>(null);
  const wordHandlerRef = useRef<(word: string, range: Range) => void>(() => {});

  const [meta, setMeta] = useState<ReadingBookMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookup, setLookup] = useState<LookupResult | null>(null);

  const nativeLanguage = user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE;
  const targetLanguage = user?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE;

  const lookupWord = useCallback(
    async (word: string, range: Range) => {
      highlightWordRange(range);
      setSelectedWord(word);
      setLookupError('');
      const cached = getCachedLookup(word, nativeLanguage, targetLanguage);
      if (cached) {
        setLookup(cached);
        setLookupLoading(false);
        return;
      }

      const gen = ++lookupGen.current;
      setLookup(null);
      setLookupLoading(true);
      try {
        const data = await api.lookupTerm(word);
        if (gen !== lookupGen.current) return;
        setCachedLookup(word, nativeLanguage, targetLanguage, data);
        setLookup(data);
      } catch (err) {
        if (gen !== lookupGen.current) return;
        setLookupError(err instanceof Error ? err.message : t('reading.lookupError'));
      } finally {
        if (gen === lookupGen.current) setLookupLoading(false);
      }
    },
    [nativeLanguage, targetLanguage, t],
  );

  wordHandlerRef.current = lookupWord;

  useEffect(() => {
    let cancelled = false;
    let book: Book | null = null;
    let rendition: Rendition | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const attachContentHooks = (current: Rendition) => {
      current.hooks.content.register((contents: Contents) => {
        const doc = contents.document as Document & { __readingBound?: boolean };
        if (doc.__readingBound) return;
        doc.__readingBound = true;
        void contents.addStylesheetCss(HIGHLIGHT_CSS, 'reading-highlight');
        let startX = 0;
        let startY = 0;
        let moved = false;
        let multiTouch = false;

        const trackStart = (x: number, y: number) => {
          startX = x;
          startY = y;
          moved = false;
        };
        const trackMove = (x: number, y: number) => {
          if (Math.hypot(x - startX, y - startY) > 12) moved = true;
        };
        const turnPage = (x: number, y: number) => {
          const dx = x - startX;
          const dy = y - startY;
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
          if (dx < 0) void current.next();
          else void current.prev();
        };

        // Mobile browsers often fire pointercancel mid-swipe, so touch swipes
        // are read from touch events; pointer events handle taps and mouse drags.
        const onTouchStart = (event: TouchEvent) => {
          const touch = event.touches[0];
          multiTouch = event.touches.length > 1;
          if (touch && !multiTouch) trackStart(touch.clientX, touch.clientY);
        };
        const onTouchMove = (event: TouchEvent) => {
          const touch = event.touches[0];
          if (!touch || multiTouch) return;
          trackMove(touch.clientX, touch.clientY);
          const horizontal =
            Math.abs(touch.clientX - startX) > Math.abs(touch.clientY - startY);
          if (horizontal && event.cancelable) event.preventDefault();
        };
        const onTouchEnd = (event: TouchEvent) => {
          const touch = event.changedTouches[0];
          if (touch && moved && !multiTouch) turnPage(touch.clientX, touch.clientY);
        };

        const onPointerDown = (event: PointerEvent) => {
          trackStart(event.clientX, event.clientY);
        };
        const onPointerMove = (event: PointerEvent) => {
          trackMove(event.clientX, event.clientY);
        };
        const onPointerUp = (event: PointerEvent) => {
          if (moved || multiTouch) {
            if (event.pointerType !== 'touch') turnPage(event.clientX, event.clientY);
            return;
          }

          const target = event.target as Element | null;
          if (target?.closest('a')) {
            event.preventDefault();
          }

          const hit = wordFromPointerEvent(event, doc);
          if (!hit) return;
          event.preventDefault();
          event.stopPropagation();
          wordHandlerRef.current(hit.word, hit.range);
        };

        doc.addEventListener('touchstart', onTouchStart, { passive: true });
        doc.addEventListener('touchmove', onTouchMove, { passive: false });
        doc.addEventListener('touchend', onTouchEnd);
        doc.addEventListener('pointerdown', onPointerDown);
        doc.addEventListener('pointermove', onPointerMove);
        doc.addEventListener('pointerup', onPointerUp);
      });
    };

    const start = async () => {
      setLoading(true);
      setError('');
      try {
        const bookMeta = await getReadingBook(bookId);
        const file = await getReadingBookFile(bookId);
        if (!bookMeta || !file) {
          throw new Error('missing');
        }
        if (cancelled) return;
        setMeta(bookMeta);
        void touchReadingBook(bookId);

        const ePub = await loadEpubConstructor();
        const buffer = await file.arrayBuffer();
        if (cancelled) return;

        book = ePub(buffer, { replacements: 'blobUrl' });
        bookRef.current = book;
        await withTimeout(book.opened, 12000, 'open');
        if (cancelled) return;

        const el = viewerRef.current;
        if (!el) throw new Error('viewer');
        await waitForElementSize(el);
        if (cancelled) return;

        const width = Math.max(el.clientWidth, 280);
        const height = Math.max(el.clientHeight, 360);

        rendition = book.renderTo(el, {
          width,
          height,
          spread: 'none',
          flow: 'paginated',
          allowScriptedContent: false,
          // Untyped in epubjs but read by its view manager; the default
          // (width / 12) wastes too much of a phone screen on margins.
          ...(width < 600 ? { gap: 20 } : {}),
        });
        renditionRef.current = rendition;
        rendition.themes.default(READER_THEME);
        attachContentHooks(rendition);

        rendition.on('relocated', (loc: Location) => {
          setLocation(loc);
          if (saveTimer.current) window.clearTimeout(saveTimer.current);
          saveTimer.current = window.setTimeout(() => {
            void saveReadingProgress(bookId, loc.start.cfi);
          }, 400);
        });

        try {
          await withTimeout(
            rendition.display(bookMeta.lastCfi || undefined),
            12000,
            'display',
          );
        } catch {
          await withTimeout(rendition.display(), 12000, 'display');
        }
        if (cancelled) return;

        resizeObserver = new ResizeObserver(() => {
          const node = viewerRef.current;
          const current = renditionRef.current;
          if (!node || !current || node.clientWidth < 40 || node.clientHeight < 40) return;
          current.resize(node.clientWidth, node.clientHeight);
        });
        resizeObserver.observe(el);
      } catch {
        if (!cancelled) setError(t('reading.readError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      resizeObserver?.disconnect();
      try {
        rendition?.destroy();
      } catch {
        /* epubjs can throw if destroy races an open */
      }
      try {
        book?.destroy();
      } catch {
        /* ignore */
      }
      if (renditionRef.current === rendition) renditionRef.current = null;
      if (bookRef.current === book) bookRef.current = null;
    };
  }, [bookId, t]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') void renditionRef.current?.next();
      if (event.key === 'ArrowLeft') void renditionRef.current?.prev();
      if (event.key === 'Escape') closeLookup();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closeLookup = () => {
    lookupGen.current += 1;
    setSelectedWord(null);
    setLookup(null);
    setLookupError('');
    setLookupLoading(false);
    const contents = renditionRef.current?.getContents();
    const docs = Array.isArray(contents) ? contents : contents ? [contents] : [];
    docs.forEach((item) => {
      const doc = (item as Contents)?.document;
      if (doc) clearWordHighlights(doc);
    });
  };

  const pageLabel =
    location && location.start.displayed.total > 0
      ? t('reading.page', {
          page: location.start.displayed.page,
          total: location.start.displayed.total,
        })
      : '';

  return (
    <div className="reader">
      <div className="reader-toolbar">
        <Link to="/reading" className="reader-back">
          {t('common.back')}
        </Link>
        <p className="reader-title">{meta?.title ?? t('reading.untitled')}</p>
        <span className="reader-page">{pageLabel}</span>
      </div>

      {error && (
        <p className="status error">
          {error}{' '}
          <Link to="/reading">{t('reading.title')}</Link>
        </p>
      )}

      <div className="reader-viewport-wrap">
        {loading && (
          <div className="reader-loading">
            <LoadingSpinner />
          </div>
        )}
        <div ref={viewerRef} className="reader-viewport" />
      </div>

      <div className="reader-nav">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!location || location.atStart}
          onClick={() => void renditionRef.current?.prev()}
        >
          {t('reading.prevPage')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!location || location.atEnd}
          onClick={() => void renditionRef.current?.next()}
        >
          {t('reading.nextPage')}
        </button>
      </div>

      {selectedWord && (
        <WordLookupSheet
          word={selectedWord}
          loading={lookupLoading}
          error={lookupError}
          result={lookup}
          locale="en-US"
          onClose={closeLookup}
        />
      )}
    </div>
  );
}
