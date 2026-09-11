import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
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
  describeError,
  getReadingBookFile,
  loadEpubConstructor,
  saveReadingLocations,
  saveReadingProgress,
  touchReadingBook,
  type ReadingBookMeta,
} from '../utils/readingLibrary';
import {
  clearWordHighlights,
  highlightWordRange,
  wordAtClientPoint,
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

// Characters per book-wide location, roughly one printed paperback page.
const CHARS_PER_BOOK_PAGE = 1400;

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

function renditionDocuments(rendition: Rendition | null): Document[] {
  const contents = rendition?.getContents() as Contents | Contents[] | undefined;
  const list = Array.isArray(contents) ? contents : contents ? [contents] : [];
  return list
    .map((item) => item?.document)
    .filter((doc): doc is Document => Boolean(doc));
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
  const gesture = useRef({ x: 0, y: 0, moved: false, active: false });

  const [meta, setMeta] = useState<ReadingBookMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [bookPages, setBookPages] = useState(0);
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

  useEffect(() => {
    let cancelled = false;
    let book: Book | null = null;
    let rendition: Rendition | null = null;
    let resizeObserver: ResizeObserver | null = null;

    // Generating locations walks the whole book (seconds on a phone), so it
    // runs after the first page shows and is cached with the book.
    const loadBookPages = async (current: Book, bookMeta: ReadingBookMeta) => {
      try {
        const cached = bookMeta.locations;
        if (cached?.chars === CHARS_PER_BOOK_PAGE) {
          current.locations.load(cached.data);
        } else {
          await current.locations.generate(CHARS_PER_BOOK_PAGE);
          if (cancelled) return;
          void saveReadingLocations(bookId, {
            chars: CHARS_PER_BOOK_PAGE,
            data: current.locations.save(),
          });
        }
        if (!cancelled) setBookPages(current.locations.length());
      } catch {
        // Page numbers are optional; the book still reads without them.
      }
    };

    const start = async () => {
      setLoading(true);
      setError('');
      setBookPages(0);
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
        // Taps and swipes are handled by .reader-touch-layer, not in here:
        // the sandboxed book iframe gets no event listeners on iOS.
        rendition.hooks.content.register((contents: Contents) => {
          void contents.addStylesheetCss(HIGHLIGHT_CSS, 'reading-highlight');
        });

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
        void loadBookPages(book, bookMeta);

        resizeObserver = new ResizeObserver(() => {
          const node = viewerRef.current;
          const current = renditionRef.current;
          if (!node || !current || node.clientWidth < 40 || node.clientHeight < 40) return;
          current.resize(node.clientWidth, node.clientHeight);
        });
        resizeObserver.observe(el);
      } catch (err) {
        console.error('[reading] could not open book', err);
        if (!cancelled) {
          setError(t('reading.readError'));
          setErrorDetail(describeError(err));
        }
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
    renditionDocuments(renditionRef.current).forEach(clearWordHighlights);
  };

  const onLayerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    gesture.current = { x: event.clientX, y: event.clientY, moved: false, active: true };
  };

  const onLayerPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g.active && Math.hypot(event.clientX - g.x, event.clientY - g.y) > 12) {
      g.moved = true;
    }
  };

  const onLayerPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.active || !event.isPrimary) return;
    g.active = false;
    const rendition = renditionRef.current;
    if (!rendition) return;

    if (g.moved) {
      const dx = event.clientX - g.x;
      const dy = event.clientY - g.y;
      if (Math.abs(dx) >= 40 && Math.abs(dx) >= Math.abs(dy)) {
        void (dx < 0 ? rendition.next() : rendition.prev());
      }
      return;
    }

    for (const doc of renditionDocuments(rendition)) {
      const hit = wordAtClientPoint(doc, event.clientX, event.clientY);
      if (hit) {
        void lookupWord(hit.word, hit.range);
        return;
      }
    }
  };

  const onLayerPointerCancel = () => {
    gesture.current.active = false;
  };

  // displayed.page/total only count screens inside the current chapter, so the
  // label waits for book-wide locations instead. epubjs types this as Location,
  // but it returns the location index (-1 when unknown).
  const locationIndex =
    location && bookPages > 0
      ? (bookRef.current?.locations.locationFromCfi(location.start.cfi) as unknown as number)
      : -1;
  const pageLabel =
    locationIndex >= 0
      ? t('reading.page', {
          page: Math.min(locationIndex + 1, bookPages),
          total: bookPages,
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
          {errorDetail && <small className="status-detail">{errorDetail}</small>}
        </p>
      )}

      <div className="reader-viewport-wrap">
        {loading && (
          <div className="reader-loading">
            <LoadingSpinner />
          </div>
        )}
        <div ref={viewerRef} className="reader-viewport" />
        <div
          className="reader-touch-layer"
          onPointerDown={onLayerPointerDown}
          onPointerMove={onLayerPointerMove}
          onPointerUp={onLayerPointerUp}
          onPointerCancel={onLayerPointerCancel}
        />
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
