import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { GrammarExerciseCard } from '../components/GrammarExerciseCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ReviewProgress } from '../components/ReviewProgress';
import { useI18n } from '../i18n/I18nProvider';
import type { GrammarExercise, GrammarExercisesResult, GrammarLevel } from '../types';

const LEVEL_KEYS: Record<GrammarLevel, 'grammar.levelBeginner' | 'grammar.levelIntermediate' | 'grammar.levelAdvanced'> = {
  beginner: 'grammar.levelBeginner',
  intermediate: 'grammar.levelIntermediate',
  advanced: 'grammar.levelAdvanced',
};

type Phase = 'setup' | 'session' | 'results';

export function GrammarPracticePage() {
  const { t } = useI18n();
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

  const exampleTopics = [
    t('grammar.ex1'),
    t('grammar.ex2'),
    t('grammar.ex3'),
    t('grammar.ex4'),
    t('grammar.ex5'),
  ];

  const current: GrammarExercise | undefined = session?.exercises[index];

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (trimmed.length < 3) {
      setError(t('grammar.minTopic'));
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
      setError(err instanceof Error ? err.message : t('grammar.error'));
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
        <Link to="/" className="back-link">{t('common.back')}</Link>
        <h1 className="page-title page-title--with-icon">
          <span className="page-title-icon">✏️</span>
          {t('grammar.title')}
        </h1>
        <p className="grammar-intro">{t('grammar.intro')}</p>

        <form className="form grammar-setup-form" onSubmit={handleGenerate}>
          <label>
            {t('grammar.topic')}
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('grammar.topicPlaceholder')}
              disabled={generating}
            />
          </label>

          <div className="grammar-examples">
            <span className="grammar-examples-label">{t('grammar.examples')}</span>
            <div className="grammar-examples-list">
              {exampleTopics.map((example) => (
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
            {t('grammar.level')}
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as GrammarLevel)}
              disabled={generating}
            >
              {(Object.keys(LEVEL_KEYS) as GrammarLevel[]).map((value) => (
                <option key={value} value={value}>
                  {t(LEVEL_KEYS[value])}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t('grammar.count')}
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={generating}
            >
              {[3, 5, 7, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {t('grammar.nExercises', { n })}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="status error">{error}</p>}

          <button type="submit" className="btn btn-primary btn--wide" disabled={generating}>
            {generating ? t('grammar.generating') : t('grammar.generate')}
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
          {t('grammar.results', { score, total, pct })}
        </p>
        <p className="grammar-results-topic">
          {t('grammar.topicLabel', { topic: session.topic })}
        </p>
        <div className="empty-actions">
          <button type="button" className="btn btn-primary" onClick={handleNewSession}>
            {t('grammar.newSession')}
          </button>
          <Link to="/" className="btn btn-secondary">
            {t('common.backHome')}
          </Link>
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
            {index + 1 < session.exercises.length
              ? t('grammar.next')
              : t('grammar.seeResults')}
          </button>
        </div>
      )}
    </div>
  );
}
