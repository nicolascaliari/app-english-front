import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SessionChips } from '../components/SessionChips';
import { useI18n } from '../i18n/I18nProvider';
import { useRecordStreak } from '../hooks/useRecordStreak';
import type { Difficulty, Flashcard } from '../types';
import {
  clampPracticeLimit,
  DEFAULT_PRACTICE_LIMIT,
  PRACTICE_LIMIT_OPTIONS,
} from '../utils/practice';

export function PracticePage() {
  const { t } = useI18n();
  const { user, updateProfile } = useAuth();
  const recordStreak = useRecordStreak();
  const sessionStarted = useRef(false);
  const streakRecorded = useRef(false);
  const [limit, setLimit] = useState(() =>
    clampPracticeLimit(user?.practiceLimit ?? DEFAULT_PRACTICE_LIMIT),
  );
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLimit(clampPracticeLimit(user?.practiceLimit ?? DEFAULT_PRACTICE_LIMIT));
  }, [user?.practiceLimit]);

  const loadPractice = (count = limit) => {
    sessionStarted.current = false;
    streakRecorded.current = false;
    setLoading(true);
    setError('');
    setIndex(0);
    api
      .getPracticeFlashcards(count)
      .then(setQueue)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPractice(limit);
  }, []);

  const handleLimitChange = (value: number) => {
    const next = clampPracticeLimit(value);
    setLimit(next);
    if (user && next !== user.practiceLimit) {
      void updateProfile({ practiceLimit: next });
    }
  };

  const current = queue[index];

  useEffect(() => {
    if (queue.length > 0) {
      sessionStarted.current = true;
    }
  }, [queue.length]);

  useEffect(() => {
    if (
      !loading &&
      sessionStarted.current &&
      queue.length === 0 &&
      !streakRecorded.current
    ) {
      streakRecorded.current = true;
      void recordStreak();
    }
  }, [loading, queue.length, recordStreak]);

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
          <label className="practice-limit-picker">
            {t('practice.limitLabel')}
            <select
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
            >
              {PRACTICE_LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              {!PRACTICE_LIMIT_OPTIONS.some((n) => n === limit) && (
                <option value={limit}>{limit}</option>
              )}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={() => loadPractice(limit)}>
            {t('practice.again', { count: limit })}
          </button>
          <Link to="/" className="btn btn-secondary">
            {t('common.backHome')}
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
        onNext={handleNext}
        nextLabel={t('practice.next')}
        reviewing
      />
    </div>
  );
}
