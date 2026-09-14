import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useI18n } from '../i18n/I18nProvider';
import type { Difficulty, Flashcard } from '../types';

export function PinnedPracticePage() {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    api
      .getPinnedFlashcards()
      .then((cards) => {
        setQueue(cards);
        setIndex(0);
        setFinished(false);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDifficultyChange = async (difficulty: Difficulty) => {
    const current = queue[index];
    if (!current) return;
    try {
      const updated = await api.updateFlashcard(current._id, { difficulty });
      setQueue((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
    } catch {
      // non-critical
    }
  };

  // Quita la palabra de Mis Palabras (la marca como aprendida)
  const removeCard = async (id: string) => {
    try {
      const updated = await api.updateFlashcard(id, { pinned: false });
      setQueue((prev) => {
        const next = prev.filter((c) => c._id !== updated._id);
        setIndex((i) => (i >= next.length && next.length > 0 ? next.length - 1 : i));
        return next;
      });
    } catch {
      // non-critical
    }
  };

  const handleTogglePin = () => {
    const current = queue[index];
    if (current) void removeCard(current._id);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;

  const current = queue[index];

  if (showList && queue.length > 0) {
    return (
      <div className="pinned-list-page">
        <p className="pinned-list-count">
          {t('practice.pinnedLearnedCount', { count: queue.length })}
        </p>
        <ul className="pinned-list">
          {queue.map((card, i) => (
            <li key={card._id} className="pinned-list-item">
              <button
                type="button"
                className="pinned-list-word"
                onClick={() => {
                  setIndex(i);
                  setFinished(false);
                  setShowList(false);
                }}
              >
                <span className="pinned-list-front">{card.front}</span>
                <span className="pinned-list-back">{card.back}</span>
              </button>
              <button
                type="button"
                className="btn btn-correct pinned-list-learned"
                onClick={() => void removeCard(card._id)}
              >
                {t('practice.pinnedLearned')}
              </button>
            </li>
          ))}
        </ul>
        <div className="empty-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setShowList(false)}>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  if (!current || finished) {
    return (
      <div className="empty empty--celebrate">
        <span className="empty-icon">⭐</span>
        <p>{queue.length === 0 ? t('practice.pinnedEmpty') : t('practice.pinnedDone')}</p>
        <div className="empty-actions">
          {queue.length > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowList(true)}>
              {t('practice.pinnedList')}
            </button>
          )}
          {queue.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setIndex(0);
                setFinished(false);
              }}
            >
              {t('category.restartReview')}
            </button>
          )}
          <Link to="/practice" className="btn btn-secondary">
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="review-session review-session--pinned">
      <FlashcardView
        key={current._id}
        card={current}
        showDifficultyPicker
        onDifficultyChange={handleDifficultyChange}
        onTogglePin={handleTogglePin}
        progress={`${index + 1}/${queue.length}`}
        reviewing
      />

      <div className="pinned-session-actions">
        <button type="button" className="btn btn-correct" onClick={handleTogglePin}>
          {t('practice.pinnedLearned')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setShowList(true)}>
          {t('practice.pinnedList')}
        </button>
      </div>

      <div className="review-navigation-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          {t('category.prev')}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setFinished(true)}
        >
          {t('category.exitReview')}
        </button>

        {index < queue.length - 1 ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIndex((i) => i + 1)}
          >
            {t('category.next')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-correct"
            onClick={() => setFinished(true)}
          >
            {t('grammar.seeResults')}
          </button>
        )}
      </div>
    </div>
  );
}
