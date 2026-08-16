import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { GrammarExerciseCard } from '../components/GrammarExerciseCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ReviewProgress } from '../components/ReviewProgress';
import { useI18n } from '../i18n/I18nProvider';
import type { GrammarExercise, GrammarExercisesResult, GrammarLevel } from '../types';

interface GrammarTopic {
  id: string;
  name: string;
  icon: string;
}

interface GrammarLevelInfo {
  id: GrammarLevel;
  title: string;
  badge: string;
  description: string;
  topics: GrammarTopic[];
}

const SYLLABUS: GrammarLevelInfo[] = [
  {
    id: 'a1',
    badge: 'A1',
    title: 'Nivel Principiante (A1)',
    description: 'Segundo peldaño del inglés. Permite usar más estructuras, hablar en pasado y futuro, entender descripciones y manejarte con soltura en situaciones cotidianas.',
    topics: [
      { id: 'a1-1', name: 'Fonética del inglés', icon: '🗣️' },
      { id: 'a1-2', name: 'Categorías gramaticales', icon: '📚' },
      { id: 'a1-3', name: 'Verbos básicos esenciales (Essential Basic Verbs)', icon: '🔑' },
      { id: 'a1-4', name: 'Tiempos verbales en presente', icon: '⏰' },
      { id: 'a1-5', name: 'Tiempos verbales en pasado (Past Simple)', icon: '🕰️' },
      { id: 'a1-6', name: 'There is / There are (Hay)', icon: '🏠' },
      { id: 'a1-7', name: 'Verbos modales básicos (Basic Modal Verbs)', icon: '🛠️' },
      { id: 'a1-8', name: 'Imperativos (Imperatives)', icon: '📣' },
      { id: 'a1-9', name: 'Gustos y preferencias con -ing', icon: '❤️' },
    ],
  },
  {
    id: 'a2',
    badge: 'A2',
    title: 'Nivel Básico (A2)',
    description: 'Paso de principiante a intermedio. Puedes mantener conversaciones fluidas, comprender mejor lo que lees y expresar emociones, opiniones y experiencias.',
    topics: [
      { id: 'a2-1', name: 'Tiempos verbales en pasado (Past Tenses)', icon: '🕰️' },
      { id: 'a2-2', name: 'Futuro en inglés (Future Tenses)', icon: '🚀' },
      { id: 'a2-3', name: 'Verbos modales (Modal Verbs)', icon: '🛠️' },
      { id: 'a2-4', name: 'Verbos auxiliares y estructuras comunes', icon: '🧩' },
      { id: 'a2-5', name: 'Estructuras con infinitivo y gerundio', icon: '🔗' },
      { id: 'a2-6', name: 'Conectores y expresiones de enlace', icon: '🌉' },
      { id: 'a2-7', name: 'Comparaciones de igualdad (as…as)', icon: '⚖️' },
      { id: 'a2-8', name: 'Pronombres recíprocos (Reciprocal Pronouns)', icon: '👥' },
    ],
  },
  {
    id: 'b1',
    badge: 'B1',
    title: 'Nivel Intermedio (B1)',
    description: 'Umbral de la fluidez. El inglés se vuelve más automático y natural, dominas estructuras complejas y reduces los errores más comunes al hablar y escribir.',
    topics: [
      { id: 'b1-1', name: 'Tiempos verbales avanzados', icon: '⏰' },
      { id: 'b1-2', name: 'La voz pasiva (Passive Voice)', icon: '📢' },
      { id: 'b1-3', name: 'Estilo indirecto (Reported Speech)', icon: '💬' },
      { id: 'b1-4', name: 'Oraciones condicionales (Conditional Sentences)', icon: '❓' },
      { id: 'b1-5', name: 'Estructuras con if only y wish', icon: '💭' },
      { id: 'b1-6', name: 'Oraciones de relativo (Relative Clauses)', icon: '🔗' },
      { id: 'b1-7', name: 'Comparativos avanzados', icon: '⚖️' },
      { id: 'b1-8', name: 'Gustos, preferencias y opiniones', icon: '💬' },
      { id: 'b1-9', name: 'Verbos modales en contexto', icon: '🛠️' },
      { id: 'b1-10', name: 'Cleft Sentences (Estructuras enfáticas)', icon: '⚡' },
      { id: 'b1-11', name: 'Estructuras causativas (Causative Structures)', icon: '⚙️' },
    ],
  },
  {
    id: 'b2',
    badge: 'B2',
    title: 'Nivel Intermedio Alto (B2)',
    description: 'Dominio avanzado. Comprendes y produces textos complejos con precisión y adaptas el discurso a contextos formales e informales sin dificultad.',
    topics: [
      { id: 'b2-1', name: 'Condicionales mixtos (Mixed Conditionals)', icon: '⏰' },
      { id: 'b2-2', name: 'future in the past was/were going to', icon: '⏰' },
      { id: 'b2-3', name: 'Verbos modales avanzados', icon: '🛠️' },
      { id: 'b2-4', name: 'Estructuras con wish, if only y expresiones similares', icon: '💭' },
      { id: 'b2-5', name: 'Discurso indirecto y estructuras reportadas avanzadas', icon: '💬' },
      { id: 'b2-6', name: 'Estructuras causativas avanzadas', icon: '⚙️' },
      { id: 'b2-7', name: 'Conectores gramaticales avanzados', icon: '🌉' },
      { id: 'b2-8', name: 'Oraciones de relativo avanzadas (Relative Clauses)', icon: '🔗' },
      { id: 'b2-9', name: 'Participios y estructuras con -ing', icon: '📝' },
      { id: 'b2-10', name: 'Expresiones impersonales y estructuras formales', icon: '👔' },
    ],
  },
  {
    id: 'c1',
    badge: 'C1',
    title: 'Nivel Avanzado Superior (C1)',
    description: 'Tablas de tiempos verbales, conjugaciones de verbos, esquemas y listas esenciales para complementar el estudio de la gramática inglesa.',
    topics: [
      { id: 'c1-1', name: 'Tablas y conjugaciones verbales avanzadas', icon: '📊' },
      { id: 'c1-2', name: 'Esquemas de estructuras complejas', icon: '📐' },
      { id: 'c1-3', name: 'Modismos avanzados y colocaciones (C1 Collocations)', icon: '🗣️' },
      { id: 'c1-4', name: 'Inversión gramatical y estructuras formales de nivel superior', icon: '⚡' },
      { id: 'c1-5', name: 'Subjuntivo en inglés y cláusulas condicionales elusivas', icon: '💭' },
      { id: 'c1-6', name: 'Estilo y registro formal, académico e informal avanzado', icon: '👔' },
    ],
  },
];

type Phase = 'setup' | 'session' | 'results';

export function GrammarPracticePage() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('setup');
  const [activeTab, setActiveTab] = useState<GrammarLevel>('a1');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<GrammarLevel>('a1');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [session, setSession] = useState<GrammarExercisesResult | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const current: GrammarExercise | undefined = session?.exercises[index];

  const handleGenerate = async (topicName: string, levelName: GrammarLevel) => {
    setGenerating(true);
    setError('');
    setTopic(topicName);
    setLevel(levelName);

    try {
      const result = await api.generateGrammarExercises({
        topic: topicName,
        level: levelName,
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
    const activeLevelInfo = SYLLABUS.find((s) => s.id === activeTab) || SYLLABUS[0];

    return (
      <div className="grammar-setup-container">
        <Link to="/" className="back-link">{t('common.back')}</Link>
        <h1 className="page-title page-title--with-icon">
          <span className="page-title-icon">✏️</span>
          {t('grammar.title')}
        </h1>
        <p className="grammar-intro">Elegí un módulo pre-armado y la IA generará ejercicios personalizados.</p>

        {error && <p className="status error" style={{ marginBottom: '1.5rem' }}>{error}</p>}

        {/* Bar de configuración discreta */}
        <div className="grammar-settings-bar">
          <span className="settings-label">Ejercicios por sesión:</span>
          <div className="settings-options">
            {[3, 5, 8, 10, 12].map((n) => (
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
            {SYLLABUS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                className={`grammar-tab-btn grammar-tab-btn--${lvl.id} ${activeTab === lvl.id ? 'active' : ''}`}
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
            <h2>{activeLevelInfo.title}</h2>
          </div>
          <p className="level-card-desc">{activeLevelInfo.description}</p>
        </div>

        {/* Cuadrícula de temas */}
        <div className="grammar-topics-grid">
          {activeLevelInfo.topics.map((topicItem) => (
            <button
              key={topicItem.id}
              type="button"
              className="grammar-topic-card"
              onClick={() => handleGenerate(topicItem.name, activeLevelInfo.id)}
              disabled={generating}
            >
              <span className="topic-icon">{topicItem.icon}</span>
              <div className="topic-content">
                <h3>{topicItem.name}</h3>
                <span className="topic-action-label">Comenzar práctica →</span>
              </div>
            </button>
          ))}
        </div>
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
          {t('grammar.topicLabel', { topic: session.topic })} ({level.toUpperCase()})
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
        label={`${session.topic} (${level.toUpperCase()})`}
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
