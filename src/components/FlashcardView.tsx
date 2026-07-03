import { useEffect, useState } from 'react';
import type { Difficulty, Flashcard } from '../types';
import { DIFFICULTY_LABELS } from '../types';

interface Props {
  card: Flashcard;
  onResult?: (correct: boolean) => void;
  showActions?: boolean;
  showDifficultyPicker?: boolean;
  onDifficultyChange?: (difficulty: Difficulty) => void;
  compact?: boolean;
  onDelete?: () => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export function FlashcardView({
  card,
  onResult,
  showActions = false,
  showDifficultyPicker = false,
  onDifficultyChange,
  compact = false,
  onDelete,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState(false);
  const difficulty = card.difficulty ?? 'medium';

  useEffect(() => {
    setFlipped(false);
    setExiting(false);
  }, [card._id]);

  const handleResult = (correct: boolean) => {
    if (!onResult) return;
    setExiting(true);
    window.setTimeout(() => onResult(correct), 280);
  };

  return (
    <div
      className={`flashcard-container${compact ? ' flashcard-container--compact' : ''}${exiting ? ' flashcard-container--exit' : ''}`}
    >
      {onDelete && (
        <button
          type="button"
          className="flashcard-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Eliminar carta"
        >
          ✕
        </button>
      )}
      {!compact && (
        <span className={`difficulty-badge difficulty-${difficulty}`}>
          {DIFFICULTY_LABELS[difficulty]}
        </span>
      )}
      <button
        type="button"
        className={`flashcard${compact ? ' flashcard--compact' : ''} ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            {compact && (
              <span className={`difficulty-dot difficulty-${difficulty}`} />
            )}
            <p className="label">English</p>
            <h2>{card.front}</h2>
            {card.pronunciation && (
              <p className="pronunciation">{card.pronunciation}</p>
            )}
            <p className="hint">Tocá para voltear</p>
          </div>
          <div className="flashcard-back">
            <p className="label">Español</p>
            <h2>{card.back}</h2>
            {card.example && <p className="example">&ldquo;{card.example}&rdquo;</p>}
          </div>
        </div>
      </button>

      {showDifficultyPicker && flipped && onDifficultyChange && (
        <div className="difficulty-picker difficulty-picker--enter">
          <p className="difficulty-picker-label">Dificultad:</p>
          <div className="difficulty-picker-buttons">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn-difficulty btn-difficulty-${d}${difficulty === d ? ' active' : ''}`}
                onClick={() => onDifficultyChange(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      )}

      {showActions && flipped && onResult && (
        <div className="review-actions review-actions--enter">
          <button
            type="button"
            className="btn btn-wrong"
            onClick={() => handleResult(false)}
          >
            No la sabía
          </button>
          <button
            type="button"
            className="btn btn-correct"
            onClick={() => handleResult(true)}
          >
            La sabía
          </button>
        </div>
      )}
    </div>
  );
}
