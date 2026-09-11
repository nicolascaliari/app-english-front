import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useI18n } from '../i18n/I18nProvider';
import {
  deleteReadingBook,
  describeError,
  importEpubFile,
  ImportEpubError,
  listReadingBooks,
  type ReadingBookMeta,
} from '../utils/readingLibrary';

export function ReadingLibraryPage() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<ReadingBookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  const refresh = async () => {
    const rows = await listReadingBooks();
    setBooks(rows);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listReadingBooks()
      .then((rows) => {
        if (!cancelled) setBooks(rows);
      })
      .catch((err: unknown) => {
        console.error('[reading] could not list books', err);
        if (cancelled) return;
        setError(t('reading.readError'));
        setErrorDetail(describeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    setErrorDetail('');
    try {
      await importEpubFile(file);
      await refresh();
    } catch (err) {
      setErrorDetail(describeError(err));
      if (err instanceof ImportEpubError) {
        const key =
          err.code === 'invalidFile'
            ? 'reading.invalidFile'
            : err.code === 'tooLarge'
              ? 'reading.tooLarge'
              : 'reading.readError';
        setError(t(key));
      } else {
        setError(t('reading.readError'));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (book: ReadingBookMeta) => {
    if (!window.confirm(t('reading.deleteConfirm', { title: book.title }))) return;
    await deleteReadingBook(book.id);
    await refresh();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <Link to="/practice" className="back-link">
        {t('common.back')}
      </Link>
      <h1 className="page-title">{t('reading.title')}</h1>
      <p className="field-hint reading-intro">{t('reading.intro')}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        hidden
        onChange={handleFile}
      />

      <button
        type="button"
        className="btn btn-primary reading-upload"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? t('reading.uploading') : t('reading.upload')}
      </button>

      {error && (
        <p className="status error">
          {error}
          {errorDetail && <small className="status-detail">{errorDetail}</small>}
        </p>
      )}

      {books.length === 0 ? (
        <div className="empty empty--enter">
          <span className="empty-icon">📚</span>
          <p>{t('reading.empty')}</p>
        </div>
      ) : (
        <ul className="reading-list">
          {books.map((book) => (
            <li key={book.id} className="reading-card">
              <Link to={`/reading/${book.id}`} className="reading-card-main">
                {book.coverDataUrl ? (
                  <img
                    src={book.coverDataUrl}
                    alt=""
                    className="reading-cover"
                  />
                ) : (
                  <span className="reading-cover reading-cover--placeholder" aria-hidden="true">
                    📖
                  </span>
                )}
                <span className="reading-card-text">
                  <span className="reading-card-title">{book.title}</span>
                  {book.author && (
                    <span className="reading-card-author">{book.author}</span>
                  )}
                  <span className="reading-card-action">
                    {book.lastCfi ? t('reading.continue') : t('reading.open')}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                className="reading-delete"
                onClick={() => void handleDelete(book)}
              >
                {t('reading.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
