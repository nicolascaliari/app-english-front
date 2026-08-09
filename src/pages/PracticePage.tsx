import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ReviewProgress } from '../components/ReviewProgress';
import { useI18n } from '../i18n/I18nProvider';
import type { Difficulty, Flashcard } from '../types';

export function PracticePage() {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadPractice = () => {
    setLoading(true);
    setError('');
    setIndex(0);
    api
      .getPracticeFlashcards(10)
      .then(setQueue)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPractice();
  }, []);

  const current = queue[index];

  const handleDifficultyChange = async (difficulty: Difficulty) => {
    if (!current || updating) return;
    setUpdating(true);
    try {
      const updated = await api.updateFlashcard(current._id, { difficulty });
      setQueue((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('new.saveError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleNext = () => {
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else {
      setQueue([]);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;

  if (!current) {
    return (
      <div className="empty empty--celebrate">
        <span className="empty-icon">🎉</span>
        <p>
          {queue.length === 0 && index === 0
            ? t('practice.empty')
            : t('practice.done')}
        </p>
        <div className="empty-actions">
          <button type="button" className="btn btn-primary" onClick={loadPractice}>
            {t('practice.again')}
          </button>
          <Link to="/" className="btn btn-secondary">
            {t('common.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ReviewProgress
        current={index + 1}
        total={queue.length}
        label={t('practice.label')}
      />
      <FlashcardView
        key={current._id}
        card={current}
        showDifficultyPicker
        onDifficultyChange={handleDifficultyChange}
      />
      <div className="review-actions review-actions--enter" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn btn-primary btn--wide"
          onClick={handleNext}
          disabled={updating}
        >
          {t('practice.next')}
        </button>
      </div>
    </div>
  );
}
