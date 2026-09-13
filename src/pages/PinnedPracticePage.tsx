import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SessionChips } from '../components/SessionChips';
import { useI18n } from '../i18n/I18nProvider';
import type { Difficulty, Flashcard } from '../types';

export function PinnedPracticePage() {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);

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

  const handleTogglePin = async () => {
    const current = queue[index];
    if (!current) return;
    try {
      const updated = await api.updateFlashcard(current._id, { pinned: false });
      setQueue((prev) => {
        const next = prev.filter((c) => c._id !== updated._id);
        setIndex((i) => (i >= next.length && next.length > 0 ? next.length - 1 : i));
        return next;
      });
    } catch {
      // non-critical
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;

  const current = queue[index];

  if (!current || finished) {
    return (
      <div className="empty empty--celebrate">
        <span className="empty-icon">⭐</span>
        <p>{queue.length === 0 ? t('practice.pinnedEmpty') : t('practice.pinnedDone')}</p>
        <div className="empty-actions">
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
    <div className="review-session">
      <SessionChips current={index + 1} total={queue.length} />

      <FlashcardView
        key={current._id}
        card={current}
        showDifficultyPicker
        onDifficultyChange={handleDifficultyChange}
        onTogglePin={handleTogglePin}
        reviewing
      />

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
