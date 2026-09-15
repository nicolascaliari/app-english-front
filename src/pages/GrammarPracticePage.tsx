import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useErrorDialog } from '../components/ErrorDialogProvider';
import { GrammarExerciseCard } from '../components/GrammarExerciseCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ReviewProgress } from '../components/ReviewProgress';
import { useI18n } from '../i18n/I18nProvider';
import { useRecordStreak } from '../hooks/useRecordStreak';
import type {
  GrammarExercise,
  GrammarExercisesResult,
  GrammarLevel,
  GrammarSyllabus,
  GrammarTopic,
} from '../types';
import { localize } from '../utils/localizedText';

type Phase = 'setup' | 'session' | 'results';

export function GrammarPracticePage() {
  const { t, language } = useI18n();
  const { showError } = useErrorDialog();
  const recordStreak = useRecordStreak();
  const streakRecorded = useRef(false);
  const [phase, setPhase] = useState<Phase>('setup');

  // El temario, las cantidades y los prompts vienen de la colección parameters.
  const [syllabus, setSyllabus] = useState<GrammarSyllabus | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [count, setCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [practiced, setPracticed] = useState<{ level: GrammarLevel; topic: GrammarTopic } | null>(null);
  const [session, setSession] = useState<GrammarExercisesResult | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const current: GrammarExercise | undefined = session?.exercises[index];

  useEffect(() => {
    let cancelled = false;

    api
      .getGrammarSyllabus()
      .then((data) => {
        if (cancelled) return;
        setSyllabus(data);
        setActiveTab(data.levels[0]?.id ?? '');
        setCount(data.defaultCount);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingSyllabus(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase === 'results' && !streakRecorded.current) {
      streakRecorded.current = true;
      void recordStreak();
    }
  }, [phase, recordStreak]);

  const handleGenerate = async (level: GrammarLevel, topic: GrammarTopic) => {
    setGenerating(true);
    setError('');

    try {
      const result = await api.generateGrammarExercises({
        level: level.id,
        topicId: topic.id,
        count,
      });
      setPracticed({ level, topic });
      setSession(result);
      setIndex(0);
      setScore(0);
      setAnswered(false);
      setPhase('session');
    } catch (err) {
      showError(err, t('grammar.error'));
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
    streakRecorded.current = false;
    setPhase('setup');
    setSession(null);
    setPracticed(null);
    setIndex(0);
    setScore(0);
    setAnswered(false);
    setError('');
  };

  if (loadingSyllabus) return <LoadingSpinner />;

  if (phase === 'setup') {
    const activeLevelInfo =
      syllabus?.levels.find((s) => s.id === activeTab) ?? syllabus?.levels[0];

    return (
      <div className="grammar-setup-container">
        <Link to="/" className="back-link">{t('common.back')}</Link>
        <h1 className="page-title page-title--with-icon">
          <span className="page-title-icon">✏️</span>
          {t('grammar.title')}
        </h1>
        <p className="grammar-intro">Elegí un módulo pre-armado y la IA generará ejercicios personalizados.</p>

        {error && <p className="status error" style={{ marginBottom: '1.5rem' }}>{error}</p>}

        {syllabus && activeLevelInfo && (
          <>
            {/* Bar de configuración discreta */}
            <div className="grammar-settings-bar">
              <span className="settings-label">cantidad:</span>
              <div className="settings-options">
                {syllabus.countOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`settings-btn ${count === n ? 'active' : ''}`}
                    onClick={() => setCount(n)}
                    disabled={generating}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de nivel (Pills) */}
            <div className="grammar-tabs-container">
              <div className="grammar-tabs">
                {syllabus.levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    className={`grammar-tab-btn grammar-tab-btn--${lvl.id} ${activeLevelInfo.id === lvl.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(lvl.id)}
                    disabled={generating}
                  >
                    {lvl.badge}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista detallada del nivel seleccionado */}
            <div className={`grammar-level-card grammar-level-card--${activeLevelInfo.id}`}>
              <div className="level-card-header">
                <h2>{localize(activeLevelInfo.title, language)}</h2>
              </div>
              <p className="level-card-desc">{localize(activeLevelInfo.description, language)}</p>
            </div>

            {/* Cuadrícula de temas */}
            <div className="grammar-topics-grid">
              {activeLevelInfo.topics.map((topicItem) => (
                <button
                  key={topicItem.id}
                  type="button"
                  className="grammar-topic-card"
                  onClick={() => handleGenerate(activeLevelInfo, topicItem)}
                  disabled={generating}
                >
                  <span className="topic-icon">{topicItem.icon}</span>
                  <div className="topic-content">
                    <h3>{localize(topicItem.name, language)}</h3>
                    <span className="topic-action-label">Comenzar práctica →</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (generating) return <LoadingSpinner />;

  if (!session || !practiced) return null;

  const topicName = localize(practiced.topic.name, language);
  const badge = practiced.level.badge;

  if (phase === 'results') {
    const total = session.exercises.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
      <div className="empty empty--celebrate">
        <span className="empty-icon">{pct >= 70 ? '🎉' : '📖'}</span>
        <p className="grammar-results-title">
          {t('grammar.results', { score, total, pct })}
        </p>
        <p className="grammar-results-topic">
          {t('grammar.topicLabel', { topic: topicName })} ({badge})
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

  if (!current) return null;

  return (
    <div>
      <ReviewProgress
        current={index + 1}
        total={session.exercises.length}
        label={`${topicName} (${badge})`}
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
