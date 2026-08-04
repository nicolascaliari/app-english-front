import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { GrammarExerciseCard } from '../components/GrammarExerciseCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ReviewProgress } from '../components/ReviewProgress';
import type { GrammarExercise, GrammarExercisesResult, GrammarLevel } from '../types';
import { GRAMMAR_LEVEL_LABELS } from '../types';

const EXAMPLE_TOPICS = [
  'Present perfect vs past simple',
  'Condicionales tipo 1 y 2',
  'Voz pasiva',
  'Phrasal verbs con "get"',
  'Preposiciones de tiempo (in, on, at)',
];

type Phase = 'setup' | 'session' | 'results';

export function GrammarPracticePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<GrammarLevel>('intermediate');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [session, setSession] = useState<GrammarExercisesResult | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const current: GrammarExercise | undefined = session?.exercises[index];

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (trimmed.length < 3) {
      setError('Escribí un tema de al menos 3 caracteres.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const result = await api.generateGrammarExercises({
        topic: trimmed,
        level,
        count,
      });
      setSession(result);
      setIndex(0);
      setScore(0);
      setAnswered(false);
      setPhase('session');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar ejercicios');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (answered) return;
    setAnswered(true);
    if (correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (!session) return;

    if (index + 1 < session.exercises.length) {
      setIndex((i) => i + 1);
      setAnswered(false);
    } else {
      setPhase('results');
    }
  };

  const handleNewSession = () => {
    setPhase('setup');
    setSession(null);
    setIndex(0);
    setScore(0);
    setAnswered(false);
    setError('');
  };

  if (phase === 'setup') {
    return (
      <div>
        <Link to="/" className="back-link">← Volver</Link>
        <h1 className="page-title page-title--with-icon">
          <span className="page-title-icon">✏️</span>
          Práctica de gramática
        </h1>
        <p className="grammar-intro">
          Elegí un tema y la IA generará ejercicios personalizados para practicar.
        </p>

        <form className="form grammar-setup-form" onSubmit={handleGenerate}>
          <label>
            Tema
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: present perfect, condicionales, voz pasiva..."
              disabled={generating}
            />
          </label>

          <div className="grammar-examples">
            <span className="grammar-examples-label">Ejemplos:</span>
            <div className="grammar-examples-list">
              {EXAMPLE_TOPICS.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="ai-example-btn"
                  onClick={() => setTopic(example)}
                  disabled={generating}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <label>
            Nivel
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as GrammarLevel)}
              disabled={generating}
            >
              {(Object.entries(GRAMMAR_LEVEL_LABELS) as [GrammarLevel, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ),
              )}
            </select>
          </label>

          <label>
            Cantidad de ejercicios
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={generating}
            >
              {[3, 5, 7, 10, 12].map((n) => (
                <option key={n} value={n}>{n} ejercicios</option>
              ))}
            </select>
          </label>

          {error && <p className="status error">{error}</p>}

          <button type="submit" className="btn btn-primary btn--wide" disabled={generating}>
            {generating ? 'Generando ejercicios...' : 'Generar ejercicios'}
          </button>
        </form>
      </div>
    );
  }

  if (generating) return <LoadingSpinner />;

  if (phase === 'results' && session) {
    const total = session.exercises.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
      <div className="empty empty--celebrate">
        <span className="empty-icon">{pct >= 70 ? '🎉' : '📖'}</span>
        <p className="grammar-results-title">
          {score} de {total} correctas ({pct}%)
        </p>
        <p className="grammar-results-topic">Tema: {session.topic}</p>
        <div className="empty-actions">
          <button type="button" className="btn btn-primary" onClick={handleNewSession}>
            Nueva sesión
          </button>
          <Link to="/" className="btn btn-secondary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  if (!current || !session) return null;

  return (
    <div>
      <ReviewProgress
        current={index + 1}
        total={session.exercises.length}
        label={session.topic}
      />

      <GrammarExerciseCard
        key={current.id}
        exercise={current}
        onAnswer={handleAnswer}
      />

      {answered && (
        <div className="review-actions review-actions--enter" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary btn--wide" onClick={handleNext}>
            {index + 1 < session.exercises.length ? 'Siguiente →' : 'Ver resultados'}
          </button>
        </div>
      )}
    </div>
  );
}
