import { useState, type FormEvent } from 'react';
import type { GrammarExercise } from '../types';

interface Props {
  exercise: GrammarExercise;
  onAnswer: (correct: boolean) => void;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function GrammarExerciseCard({ exercise, onAnswer }: Props) {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const checkAnswer = (answer: string) => {
    const correct = normalizeAnswer(answer) === normalizeAnswer(exercise.correctAnswer);
    setIsCorrect(correct);
    setRevealed(true);
    onAnswer(correct);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || revealed) return;
    checkAnswer(input);
  };

  const handleOptionClick = (option: string) => {
    if (revealed) return;
    setSelected(option);
    checkAnswer(option);
  };

  return (
    <div className={`grammar-exercise${revealed ? (isCorrect ? ' grammar-exercise--correct' : ' grammar-exercise--wrong') : ''}`}>
      <span className="grammar-exercise-type">
        {exercise.type === 'fill_blank' ? 'Completar' : 'Opción múltiple'}
      </span>

      <p className="grammar-exercise-prompt">{exercise.prompt}</p>

      {exercise.type === 'fill_blank' ? (
        <form className="grammar-exercise-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="grammar-exercise-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tu respuesta..."
            disabled={revealed}
            autoFocus
          />
          {!revealed && (
            <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
              Verificar
            </button>
          )}
        </form>
      ) : (
        <div className="grammar-options">
          {exercise.options?.map((option) => {
            let className = 'grammar-option';
            if (revealed) {
              if (option === exercise.correctAnswer) {
                className += ' grammar-option--correct';
              } else if (option === selected) {
                className += ' grammar-option--wrong';
              }
            } else if (option === selected) {
              className += ' grammar-option--selected';
            }

            return (
              <button
                key={option}
                type="button"
                className={className}
                onClick={() => handleOptionClick(option)}
                disabled={revealed}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {revealed && (
        <div className="grammar-feedback">
          <p className={`grammar-feedback-result${isCorrect ? ' grammar-feedback-result--correct' : ' grammar-feedback-result--wrong'}`}>
            {isCorrect ? '✓ Correcto' : `✗ Incorrecto — respuesta: ${exercise.correctAnswer}`}
          </p>
          <p className="grammar-feedback-explanation">{exercise.explanation}</p>
        </div>
      )}
    </div>
  );
}
