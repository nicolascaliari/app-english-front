import { type FormEvent, type MouseEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import type { Difficulty, Flashcard } from '../types';
import {
  APP_LANGUAGE_LOCALE,
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languages';
import {
  isSpeechRecognitionSupported,
  isSpeechSupported,
  listenOnce,
  speak,
} from '../utils/speech';
import { CardScene } from './CardScene';

interface Props {
  card: Flashcard;
  onResult?: (correct: boolean) => void;
  showActions?: boolean;
  showDifficultyPicker?: boolean;
  onDifficultyChange?: (difficulty: Difficulty) => void;
  compact?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  reviewing?: boolean;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function sentenceUsesWord(sentence: string, word: string): boolean {
  const needle = word.trim().toLowerCase();
  if (!needle) return false;
  const hay = sentence.trim().toLowerCase();
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}])${escaped}(?:$|[^\\p{L}])`, 'iu').test(hay);
}

export function FlashcardView({
  card,
  onResult,
  showActions = false,
  showDifficultyPicker = false,
  onDifficultyChange,
  compact = false,
  onDelete,
  onEdit,
  onNext,
  nextLabel,
  reviewing = false,
}: Props) {
  const { user } = useAuth();
  const { t, languageName } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<'idle' | 'type' | 'say'>('idle');
  const [quizDraft, setQuizDraft] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<'good' | 'try' | null>(null);
  const [listening, setListening] = useState(false);
  const stopListenRef = useRef<(() => void) | null>(null);
  const difficulty = card.difficulty ?? 'medium';
  const speechSupported = isSpeechSupported();
  const recognitionSupported = isSpeechRecognitionSupported();
  const immersive = !compact;

  const targetLanguage = user?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE;
  const nativeLanguage = user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE;
  const targetLabel = languageName(targetLanguage);
  const nativeLabel = languageName(nativeLanguage);
  const targetLocale = APP_LANGUAGE_LOCALE[targetLanguage];

  useEffect(() => {
    setFlipped(false);
    setExiting(false);
    setQuizMode('idle');
    setQuizDraft('');
    setQuizFeedback(null);
    setListening(false);
    stopListenRef.current?.();
    stopListenRef.current = null;
  }, [card._id]);

  useEffect(() => {
    return () => {
      stopListenRef.current?.();
    };
  }, []);

  const handleResult = (correct: boolean) => {
    if (!onResult) return;
    setExiting(true);
    window.setTimeout(() => onResult(correct), 280);
  };

  const handleSpeak = (e: MouseEvent<HTMLButtonElement>, text: string) => {
    e.stopPropagation();
    speak(text, targetLocale, {
      onStart: () => setSpeakingText(text),
      onEnd: () => setSpeakingText(null),
    });
  };

  const evaluateSentence = (sentence: string) => {
    const ok = sentenceUsesWord(sentence, card.front);
    setQuizFeedback(ok ? 'good' : 'try');
    if (ok) setQuizDraft(sentence);
  };

  const handleQuizSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    evaluateSentence(quizDraft);
  };

  const startListening = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!recognitionSupported) {
      setQuizMode('say');
      setQuizFeedback(null);
      return;
    }
    stopListenRef.current?.();
    setQuizMode('say');
    setQuizFeedback(null);
    setListening(true);
    stopListenRef.current = listenOnce(targetLocale, {
      onResult: (transcript) => {
        setQuizDraft(transcript);
        evaluateSentence(transcript);
      },
      onError: () => setListening(false),
      onEnd: () => {
        setListening(false);
        stopListenRef.current = null;
      },
    });
  };

  const stopListening = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    stopListenRef.current?.();
    stopListenRef.current = null;
    setListening(false);
  };

  return (
    <div
      className={`flashcard-container${compact ? ' flashcard-container--compact' : ' flashcard-container--immersive'}${exiting ? ' flashcard-container--exit' : ''}`}
    >
      {compact && onEdit && (
        <button
          type="button"
          className="flashcard-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label={t('flashcard.edit')}
        >
          ✎
        </button>
      )}
      {compact && onDelete && (
        <button
          type="button"
          className="flashcard-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={t('flashcard.delete')}
        >
          ✕
        </button>
      )}
      <div
        className={`flashcard${compact ? ' flashcard--compact' : ' flashcard--immersive'} ${flipped ? 'flipped' : ''}`}
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
            {immersive && <CardScene imageUrl={card.imageUrl} />}
            {immersive && (
              <div className="flashcard-chrome">
                {speechSupported && (
                  <button
                    type="button"
                    className={`flashcard-chrome-btn${speakingText === card.front ? ' speak-btn--active' : ''}`}
                    onClick={(e) => handleSpeak(e, card.front)}
                    aria-label={t('flashcard.listenPronunciation', { lang: targetLabel })}
                  >
                    <SpeakerIcon />
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    className="flashcard-chrome-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    aria-label={t('flashcard.edit')}
                  >
                    <GearIcon />
                  </button>
                )}
                {reviewing && (
                  <span className="flashcard-status">{t('flashcard.reviewing')}</span>
                )}
              </div>
            )}
            <div className="flashcard-body">
              {compact && (
                <span className={`difficulty-dot difficulty-${difficulty}`} />
              )}
              {!immersive && <p className="label">{targetLabel}</p>}
              {compact && card.imageUrl && (
                <img
                  src={card.imageUrl}
                  alt={card.front}
                  className="flashcard-image"
                  loading="lazy"
                />
              )}
              <div className="word-row">
                <h2>{card.front}</h2>
                {speechSupported && !immersive && (
                  <button
                    type="button"
                    className={`speak-btn${speakingText === card.front ? ' speak-btn--active' : ''}`}
                    onClick={(e) => handleSpeak(e, card.front)}
                    aria-label={t('flashcard.listenPronunciation', { lang: targetLabel })}
                    title={t('flashcard.listen', { lang: targetLabel })}
                  >
                    🔊
                  </button>
                )}
              </div>
              {card.pronunciation && (
                <p className={`pronunciation${immersive ? ' pronunciation--hero' : ''}`}>
                  {card.pronunciation}
                  {immersive && speechSupported && (
                    <button
                      type="button"
                      className={`speak-btn speak-btn--inline${speakingText === card.front ? ' speak-btn--active' : ''}`}
                      onClick={(e) => handleSpeak(e, card.front)}
                      aria-label={t('flashcard.listenPronunciation', { lang: targetLabel })}
                    >
                      🔊
                    </button>
                  )}
                </p>
              )}
            </div>
            {immersive && !flipped && (
              <div
                className="flashcard-quiz"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <p className="quiz-kicker">✦ {t('flashcard.quiz')}</p>
                <p className="quiz-prompt">{t('flashcard.quizPrompt')}</p>
                {quizMode === 'type' ? (
                  <form className="quiz-form" onSubmit={handleQuizSubmit}>
                    <input
                      className="quiz-input"
                      value={quizDraft}
                      onChange={(e) => {
                        setQuizDraft(e.target.value);
                        setQuizFeedback(null);
                      }}
                      placeholder={t('flashcard.quizPlaceholder')}
                      autoFocus
                    />
                    <div className="quiz-form-actions">
                      <button type="submit" className="quiz-btn quiz-btn--solid">
                        {t('flashcard.quizCheck')}
                      </button>
                      <button
                        type="button"
                        className="quiz-btn"
                        onClick={() => {
                          setQuizMode('idle');
                          setQuizFeedback(null);
                        }}
                      >
                        {t('common.back')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="quiz-actions">
                    <button
                      type="button"
                      className="quiz-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuizMode('type');
                        setQuizFeedback(null);
                      }}
                    >
                      {t('flashcard.typeAnswer')}
                    </button>
                    <button
                      type="button"
                      className={`quiz-btn${listening ? ' quiz-btn--live' : ''}`}
                      onClick={listening ? stopListening : startListening}
                    >
                      {listening ? t('flashcard.quizListening') : t('flashcard.sayAnswer')}
                    </button>
                  </div>
                )}
                {quizMode === 'say' && !recognitionSupported && (
                  <p className="quiz-feedback">{t('flashcard.quizSpeechUnsupported')}</p>
                )}
                {quizMode === 'say' && quizDraft && (
                  <p className="quiz-transcript">“{quizDraft}”</p>
                )}
                {quizFeedback === 'good' && (
                  <p className="quiz-feedback quiz-feedback--good">{t('flashcard.quizGood')}</p>
                )}
                {quizFeedback === 'try' && (
                  <p className="quiz-feedback quiz-feedback--try">{t('flashcard.quizTryAgain')}</p>
                )}
              </div>
            )}
            {!compact && (
              <p className="hint">{t('flashcard.tapToFlip')}</p>
            )}
          </div>
          <div className="flashcard-back">
            {immersive && <CardScene imageUrl={card.imageUrl} />}
            <p className="label">{nativeLabel}</p>
            <h2>{card.back}</h2>
            {card.example && (
              <p className="example">
                &ldquo;{card.example}&rdquo;
                {speechSupported && (
                  <button
                    type="button"
                    className={`speak-btn speak-btn--inline${speakingText === card.example ? ' speak-btn--active' : ''}`}
                    onClick={(e) => handleSpeak(e, card.example!)}
                    aria-label={t('flashcard.listenExample', { lang: targetLabel })}
                    title={t('flashcard.listenExample', { lang: targetLabel })}
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
          <p className="difficulty-picker-label">{t('flashcard.difficulty')}</p>
          <div className="difficulty-picker-buttons">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn-difficulty btn-difficulty-${d}${difficulty === d ? ' active' : ''}`}
                onClick={() => onDifficultyChange(d)}
              >
                {t(`difficulty.${d}`)}
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
            {t('flashcard.wrong')}
          </button>
          <button
            type="button"
            className="btn btn-correct"
            onClick={() => handleResult(true)}
          >
            {t('flashcard.correct')}
          </button>
        </div>
      )}

      {onNext && flipped && (
        <div className="review-actions review-actions--enter">
          <button type="button" className="btn btn-primary btn--wide" onClick={onNext}>
            {nextLabel ?? t('practice.next')}
          </button>
        </div>
      )}
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10v4h3.2L12 17.6V6.4L7.2 10H4z" />
      <path d="M15.5 9a3.4 3.4 0 0 1 0 6" />
      <path d="M17.6 7a6 6 0 0 1 0 10" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.6 6.6l1.4 1.4M16 16l1.4 1.4M17.4 6.6 16 8M8 16l-1.4 1.4" />
    </svg>
  );
}
