import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { CardFilters } from '../components/CardFilters';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SessionChips } from '../components/SessionChips';
import { SearchBar } from '../components/SearchBar';
import { useI18n } from '../i18n/I18nProvider';
import type { Category, Difficulty, Flashcard } from '../types';
import { categoryIcon } from '../utils/categoryIcon';

export function CategoryPage() {
  const { slug, subSlug } = useParams<{ slug: string; subSlug?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subQuery, setSubQuery] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | null>(null);

  // Edit modal state
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editExample, setEditExample] = useState('');
  const [editPronunciation, setEditPronunciation] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>('medium');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Slideshow Review state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [reviewFinished, setReviewFinished] = useState(false);

  useEffect(() => {
    if (!slug || authLoading || !user) return;
    setLoading(true);
    setError('');

    if (subSlug) {
      Promise.all([
        api.getCategory(slug),
        api.getSubcategory(slug, subSlug),
        api.getSubcategoryFlashcards(slug, subSlug),
      ])
        .then(([cat, sub, flashcards]) => {
          setCategory(cat);
          setSubcategory(sub);
          setSubcategories([]);
          setCards(flashcards);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        api.getCategory(slug),
        api.getSubcategories(slug),
        api.getFlashcards(slug),
      ])
        .then(([cat, subs, flashcards]) => {
          setCategory(cat);
          setSubcategory(null);
          setSubcategories(subs);
          setCards(flashcards);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [slug, subSlug, authLoading, user]);

  useEffect(() => {
    setSubQuery('');
    setCardQuery('');
    setDifficultyFilter(null);
  }, [slug, subSlug]);

  useEffect(() => {
    document.body.classList.toggle('category-reviewing', isReviewing);
    return () => document.body.classList.remove('category-reviewing');
  }, [isReviewing]);

  const filteredSubcategories = useMemo(() => {
    const q = subQuery.trim().toLowerCase();
    if (!q) return subcategories;
    return subcategories.filter((s) => s.name.toLowerCase().includes(q));
  }, [subcategories, subQuery]);

  const filteredCards = useMemo(() => {
    const q = cardQuery.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesQuery =
        !q ||
        [card.front, card.back, card.example, card.pronunciation, ...card.tags]
          .some((field) => field?.toLowerCase().includes(q));
      const matchesDifficulty = !difficultyFilter || card.difficulty === difficultyFilter;
      return matchesQuery && matchesDifficulty;
    });
  }, [cards, cardQuery, difficultyFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('category.deleteConfirm'))) return;
    await api.deleteFlashcard(id);
    setCards((prev) => prev.filter((c) => c._id !== id));
  };

  const handleDifficultyChange = async (id: string, difficulty: Difficulty) => {
    const updated = await api.updateFlashcard(id, { difficulty });
    setCards((prev) => prev.map((c) => (c._id === id ? updated : c)));
    // If reviewing, update the queue card too!
    setReviewQueue((prev) => prev.map((c) => (c._id === id ? updated : c)));
  };

  const handleStartEdit = (card: Flashcard) => {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditExample(card.example ?? '');
    setEditPronunciation(card.pronunciation ?? '');
    setEditDifficulty(card.difficulty ?? 'medium');
    setEditError('');
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const updated = await api.updateFlashcard(editingCard._id, {
        front: editFront.trim(),
        back: editBack.trim(),
        example: editExample.trim() || undefined,
        pronunciation: editPronunciation.trim() || undefined,
        difficulty: editDifficulty,
      });
      setCards((prev) => prev.map((c) => (c._id === editingCard._id ? updated : c)));
      setReviewQueue((prev) => prev.map((c) => (c._id === editingCard._id ? updated : c)));
      setEditingCard(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t('new.saveError'));
    } finally {
      setSavingEdit(false);
    }
  };

  const startReview = (queue: Flashcard[]) => {
    setReviewQueue(queue);
    setReviewIndex(0);
    setIsReviewing(true);
    setReviewFinished(false);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;
  if (!category) return null;

  const current = subcategory ?? category;
  const currentId = current._id;
  const hasSubcategories = !subcategory && subcategories.length > 0;

  if (isReviewing) {
    if (reviewFinished || reviewQueue.length === 0) {
      return (
        <div>
          <h1 className="page-title">{current.name}</h1>
          <div className="empty empty--celebrate">
            <span className="empty-icon">🎉</span>
            <p>{t('category.reviewDone')}</p>
            <div className="empty-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setReviewIndex(0);
                  setReviewFinished(false);
                }}
              >
                {t('category.restartReview')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsReviewing(false);
                  setReviewFinished(false);
                }}
              >
                {t('common.back')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const currentCard = reviewQueue[reviewIndex];

    return (
      <div className="review-session">
        <SessionChips current={reviewIndex + 1} total={reviewQueue.length} />

        <FlashcardView
          key={currentCard._id}
          card={currentCard}
          showDifficultyPicker
          onDifficultyChange={(d) => handleDifficultyChange(currentCard._id, d)}
          reviewing
        />

        <div className="review-navigation-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
            disabled={reviewIndex === 0}
          >
            {t('category.prev')}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsReviewing(false)}
          >
            {t('category.exitReview')}
          </button>

          {reviewIndex < reviewQueue.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setReviewIndex((i) => i + 1)}
            >
              {t('category.next')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-correct"
              onClick={() => setReviewFinished(true)}
            >
              {t('grammar.seeResults')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to={subcategory ? `/category/${category.slug}` : '/'} className="back-link">
        {t('common.back')}
      </Link>

      {subcategory && (
        <p className="breadcrumb">
          <Link to="/">{t('category.breadcrumb')}</Link> /{' '}
          <Link to={`/category/${category.slug}`}>{category.name}</Link>
        </p>
      )}

      <h1 className="page-title page-title--with-icon">
        <span className="page-title-icon">
          {categoryIcon(current.icon ?? category.icon, current.slug ?? category.slug)}
        </span>
        {current.name}
      </h1>

      {hasSubcategories && (
        <>
          <SearchBar
            value={subQuery}
            onChange={setSubQuery}
            placeholder={t('category.searchSubs')}
          />

          {filteredSubcategories.length === 0 ? (
            <div className="empty empty--enter">
              <span className="empty-icon">🔍</span>
              <p>{t('category.noSubs', { query: subQuery })}</p>
            </div>
          ) : (
            <ul className="category-list">
              {filteredSubcategories.map((sub, i) => (
                <li key={sub._id} style={{ '--i': i } as CSSProperties}>
                  <Link
                    to={`/category/${category.slug}/${sub.slug}`}
                    className="category-card"
                    style={
                      (sub.color ?? category.color)
                        ? ({ '--cat-color': sub.color ?? category.color } as CSSProperties)
                        : undefined
                    }
                  >
                    <span className="category-icon">
                      {categoryIcon(sub.icon ?? category.icon, sub.slug)}
                    </span>
                    <span className="category-name">{sub.name}</span>
                    <span className="category-arrow">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {cards.length > 0 && (
            <h2 className="section-title">{t('category.cardsSection')}</h2>
          )}
        </>
      )}

      {cards.length > 0 && (
        <>
          <CardFilters
            query={cardQuery}
            onQueryChange={setCardQuery}
            difficulty={difficultyFilter}
            onDifficultyChange={setDifficultyFilter}
            total={cards.length}
            filtered={filteredCards.length}
          />
          {filteredCards.length > 0 && (
            <button
              type="button"
              className="btn btn-primary review-category-btn"
              style={{ width: '100%', marginBottom: '1.25rem' }}
              onClick={() => startReview(filteredCards)}
            >
              🗂️ {t('category.review')} ({filteredCards.length})
            </button>
          )}
        </>
      )}

      {cards.length === 0 ? (
        hasSubcategories ? null : (
          <div className="empty empty--enter">
            <span className="empty-icon">🃏</span>
            <p>{t('category.empty')}</p>
            <Link
              to="/new"
              state={{ categoryId: currentId }}
              className="btn btn-primary"
            >
              {t('category.addCard')}
            </Link>
          </div>
        )
      ) : filteredCards.length === 0 ? (
        <div className="empty empty--enter">
          <span className="empty-icon">🔍</span>
          <p>{t('category.noFilterResults')}</p>
        </div>
      ) : (
        <ul className="flashcard-grid">
          {filteredCards.map((card, i) => (
            <li key={card._id} style={{ '--i': i } as CSSProperties}>
              <FlashcardView
                card={card}
                compact
                showDifficultyPicker
                onDifficultyChange={(d) => handleDifficultyChange(card._id, d)}
                onDelete={() => handleDelete(card._id)}
                onEdit={() => handleStartEdit(card)}
              />
            </li>
          ))}
        </ul>
      )}

      {!subcategory && (
        <Link
          to="/new"
          state={{ parentSlug: category.slug }}
          className="btn btn-secondary add-subcategory-link"
        >
          {t('category.addSub')}
        </Link>
      )}

      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setEditingCard(null)}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 className="modal-title">{t('editCard.title')}</h2>
            {editError && <p className="status error">{editError}</p>}
            <form className="form" onSubmit={handleSaveEdit}>
              <label>
                {t('new.front')}
                <input
                  type="text"
                  required
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                />
              </label>

              <label>
                {t('new.back')}
                <input
                  type="text"
                  required
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                />
              </label>

              <label>
                {t('new.pronunciation')}
                <input
                  type="text"
                  value={editPronunciation}
                  onChange={(e) => setEditPronunciation(e.target.value)}
                  placeholder={t('new.pronunciationPlaceholder')}
                />
              </label>

              <label>
                {t('new.example')}
                <input
                  type="text"
                  value={editExample}
                  onChange={(e) => setEditExample(e.target.value)}
                  placeholder={t('new.examplePlaceholder')}
                />
              </label>

              <label>
                {t('common.difficulty')}
                <select
                  value={editDifficulty}
                  onChange={(e) => setEditDifficulty(e.target.value as Difficulty)}
                >
                  <option value="easy">{t('difficulty.easy')}</option>
                  <option value="medium">{t('difficulty.medium')}</option>
                  <option value="hard">{t('difficulty.hard')}</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingCard(null)}
                  disabled={savingEdit}
                >
                  {t('common.back')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? t('common.saving') : t('editCard.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
