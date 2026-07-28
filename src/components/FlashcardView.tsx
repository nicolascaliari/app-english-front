import { type MouseEvent, useEffect, useState } from 'react';
import type { Difficulty, Flashcard } from '../types';
import { DIFFICULTY_LABELS } from '../types';
import { isSpeechSupported, speakEnglish } from '../utils/speech';

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
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const difficulty = card.difficulty ?? 'medium';
  const speechSupported = isSpeechSupported();

  useEffect(() => {
    setFlipped(false);
    setExiting(false);
  }, [card._id]);

  const handleResult = (correct: boolean) => {
    if (!onResult) return;
    setExiting(true);
    window.setTimeout(() => onResult(correct), 280);
  };

  const handleSpeak = (e: MouseEvent<HTMLButtonElement>, text: string) => {
    e.stopPropagation();
    speakEnglish(text, {
      onStart: () => setSpeakingText(text),
      onEnd: () => setSpeakingText(null),
    });
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
      <div
        className={`flashcard${compact ? ' flashcard--compact' : ''} ${flipped ? 'flipped' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">
            {compact && (
              <span className={`difficulty-dot difficulty-${difficulty}`} />
            )}
            <p className="label">English</p>
            <div className="word-row">
              <h2>{card.front}</h2>
              {speechSupported && (
                <button
                  type="button"
                  className={`speak-btn${speakingText === card.front ? ' speak-btn--active' : ''}`}
                  onClick={(e) => handleSpeak(e, card.front)}
                  aria-label="Escuchar pronunciación en inglés americano"
                  title="Escuchar (inglés americano)"
                >
                  🔊
                </button>
              )}
            </div>
            {card.pronunciation && (
              <p className="pronunciation">{card.pronunciation}</p>
            )}
            <p className="hint">Tocá para voltear</p>
          </div>
          <div className="flashcard-back">
            <p className="label">Español</p>
            <h2>{card.back}</h2>
            {card.example && (
              <p className="example">
                &ldquo;{card.example}&rdquo;
                {speechSupported && (
                  <button
                    type="button"
                    className={`speak-btn speak-btn--inline${speakingText === card.example ? ' speak-btn--active' : ''}`}
                    onClick={(e) => handleSpeak(e, card.example!)}
                    aria-label="Escuchar ejemplo en inglés americano"
                    title="Escuchar ejemplo (inglés americano)"
                  >
                    🔊
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

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
