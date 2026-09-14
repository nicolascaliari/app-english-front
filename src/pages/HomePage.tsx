import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import { useI18n } from '../i18n/I18nProvider';
import type { Category } from '../types';
import { categoryIcon } from '../utils/categoryIcon';
import { ModalPortal } from '../components/ModalPortal';
import { useLongPressReorder } from '../hooks/useLongPressReorder';

export function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [deckToDelete, setDeckToDelete] = useState<Category | null>(null);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeletingDeck(true);
    setDeleteError('');
    try {
      await api.deleteCategory(deckToDelete._id);
      setCategories((prev) => prev.filter((c) => c._id !== deckToDelete._id));
      api.getDueReviews().then((due) => setDueCount(due.length)).catch(() => {});
      setDeckToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting deck');
    } finally {
      setIsDeletingDeck(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  // Con un filtro activo no se reordena: la lista visible no es la completa.
  const canReorder = !query.trim() && categories.length > 1;
  const reorder = useLongPressReorder({
    items: categories,
    getId: (c) => c._id,
    enabled: canReorder,
    onChange: setCategories,
    onCommit: (next, previous) => {
      api.reorderCategories(next.map((c) => c._id)).catch(() => setCategories(previous));
    },
  });

  useEffect(() => {
    if (authLoading || !user) {
      setCategories([]);
      setDueCount(0);
      return;
    }

    setLoading(true);
    setError('');
    Promise.all([api.getCategories(), api.getDueReviews()])
      .then(([cats, due]) => {
        setCategories(cats);
        setDueCount(due.length);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authLoading, user?.id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;

  return (
    <div>
      <Link to="/grammar" className="banner banner--grammar">
        <span className="banner-icon">✏️</span>
        <span className="banner-content">
          <span className="banner-title">{t('home.grammarTitle')}</span>
          <span className="banner-sub">{t('home.grammarSub')}</span>
        </span>
        <span className="banner-arrow">→</span>
      </Link>

      <Link to="/practice/session" className="banner banner--practice">
        <span className="banner-icon">🔄</span>
        <span className="banner-content">
          <span className="banner-title">{t('home.practiceTitle')}</span>
          <span className="banner-sub">
            {t('home.practiceSub', {
              count: user?.practiceLimit ?? 10,
            })}
          </span>
        </span>
        <span className="banner-arrow">→</span>
      </Link>

      {dueCount > 0 && (
        <Link to="/review" className="banner banner--due">
          <span className="banner-icon">📚</span>
          <span className="banner-content">
            <span className="banner-title">
              {t(dueCount === 1 ? 'home.dueOne' : 'home.dueOther', {
                count: dueCount,
              })}
            </span>
            <span className="banner-sub">{t('home.dueSub')}</span>
          </span>
          <span className="banner-badge">{dueCount}</span>
        </Link>
      )}

      <h1 className="page-title">
        {t('home.categories')}
        {categories.length > 0 && (
          <span className="page-title-count">
            {query.trim()
              ? `${filteredCategories.length} / ${categories.length}`
              : categories.length}
          </span>
        )}
      </h1>

      {categories.length === 0 ? (
        <div className="empty empty--enter">
          <span className="empty-icon">📭</span>
          <p>{t('home.empty')}</p>
          <Link to="/new" className="btn btn-primary">
            {t('home.createFirst')}
          </Link>
        </div>
      ) : (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={t('home.searchCategories')}
          />

          {canReorder && <p className="category-reorder-hint">{t('home.reorderHint')}</p>}

          {filteredCategories.length === 0 ? (
            <div className="empty empty--enter">
              <span className="empty-icon">🔍</span>
              <p>{t('home.noResults', { query })}</p>
            </div>
          ) : (
            <ul
              ref={reorder.listRef}
              className={`category-list${reorder.hasDragged ? ' category-list--static' : ''}`}
            >
              {filteredCategories.map((cat, i) => (
                <li
                  key={cat._id}
                  style={{ '--i': i } as CSSProperties}
                  className={reorder.draggingId === cat._id ? 'is-dragging' : undefined}
                  {...reorder.itemProps(cat._id)}
                >
                  <Link
                    to={`/category/${cat.slug}`}
                    draggable={false}
                    className="category-card"
                    style={
                      cat.color ? { '--cat-color': cat.color } as CSSProperties : undefined
                    }
                  >
                    <span className="category-icon">{categoryIcon(cat.icon, cat.slug)}</span>
                    <span className="category-name">{cat.name}</span>
                    <button
                      type="button"
                      className="category-delete-btn"
                      title={t('category.deleteDeck')}
                      aria-label={t('category.deleteDeck')}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteError('');
                        setDeckToDelete(cat);
                      }}
                    >
                      <svg
                        className="category-delete-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                    <span className="category-arrow">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {deckToDelete && (
        <ModalPortal>
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => !isDeletingDeck && setDeckToDelete(null)}
          >
            <div
              className="modal-content delete-deck-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeckToDelete(null)}
                disabled={isDeletingDeck}
                aria-label={t('common.cancel')}
              >
                ✕
              </button>
              <div className="delete-deck-modal-header">
                <span className="delete-deck-modal-icon">⚠️</span>
                <h2 className="modal-title">{t('category.deleteDeckConfirmTitle')}</h2>
              </div>
              <p className="delete-deck-modal-desc">
                {t('category.deleteDeckConfirmDesc', { name: deckToDelete.name })}
              </p>
              {deleteError && <p className="status error">{deleteError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeckToDelete(null)}
                  disabled={isDeletingDeck}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteDeck}
                  disabled={isDeletingDeck}
                >
                  {isDeletingDeck ? t('category.deletingDeck') : t('category.deleteDeckBtn')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

