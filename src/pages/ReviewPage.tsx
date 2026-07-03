import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ReviewProgress } from '../components/ReviewProgress';
import type { Difficulty, DueReview } from '../types';

export function ReviewPage() {
  const [queue, setQueue] = useState<DueReview[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getDueReviews()
      .then(setQueue)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const current = queue[index];

  const handleResult = async (correct: boolean) => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await api.submitReview(current.flashcard._id, correct);
      if (index + 1 < queue.length) {
        setIndex((i) => i + 1);
      } else {
        setQueue([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDifficultyChange = async (difficulty: Difficulty) => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      const updated = await api.updateFlashcard(current.flashcard._id, {
        difficulty,
      });
      setQueue((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, flashcard: updated } : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;

  if (!current) {
    return (
      <div className="empty empty--celebrate">
        <span className="empty-icon">🎉</span>
        <p>No hay cartas para repasar hoy.</p>
        <Link to="/" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ReviewProgress current={index + 1} total={queue.length} label="SM-2" />
      <FlashcardView
        key={current.flashcard._id}
        card={current.flashcard}
        showActions
        showDifficultyPicker
        onDifficultyChange={handleDifficultyChange}
        onResult={handleResult}
      />
    </div>
  );
}
