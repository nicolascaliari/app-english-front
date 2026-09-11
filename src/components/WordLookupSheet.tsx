import { useEffect, useState, type MouseEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { LookupEntry, LookupResult } from '../types';
import { isSpeechSupported, speak } from '../utils/speech';

interface Props {
  word: string;
  loading: boolean;
  error: string;
  result: LookupResult | null;
  locale: string;
  onClose: () => void;
}

export function WordLookupSheet({
  word,
  loading,
  error,
  result,
  locale,
  onClose,
}: Props) {
  const { t } = useI18n();
  const [senseIndex, setSenseIndex] = useState(0);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const speechSupported = isSpeechSupported();

  useEffect(() => {
    setSenseIndex(0);
  }, [word, result]);

  const entries = result?.entries ?? [];
  const selected: LookupEntry | undefined = entries[Math.min(senseIndex, Math.max(entries.length - 1, 0))];
  const displayWord = selected?.front || result?.query || word;

  const handleSpeak = (e: MouseEvent<HTMLButtonElement>, text: string) => {
    e.stopPropagation();
    speak(text, locale, {
      onStart: () => setSpeakingText(text),
      onEnd: () => setSpeakingText(null),
    });
  };

  return (
    <div className="word-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="word-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={displayWord}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="word-sheet-handle" aria-hidden="true" />

        <div className="word-sheet-head">
          <div className="word-sheet-title-row">
            <h2 className="word-sheet-word">{displayWord}</h2>
            {speechSupported && displayWord && (
              <button
                type="button"
                className={`speak-btn${speakingText === displayWord ? ' speak-btn--active' : ''}`}
                onClick={(e) => handleSpeak(e, displayWord)}
                aria-label={t('reading.listen')}
              >
                🔊
              </button>
            )}
          </div>
          {selected?.partOfSpeech && (
            <p className="word-sheet-pos">{selected.partOfSpeech}</p>
          )}
          {selected?.pronunciation && (
            <p className="word-sheet-ipa">{selected.pronunciation}</p>
          )}
        </div>

        {loading && <p className="word-sheet-status">{t('common.loading')}</p>}
        {error && <p className="status error word-sheet-status">{error}</p>}

        {!loading && !error && !selected && (
          <p className="word-sheet-status">{t('reading.lookupEmpty', { word })}</p>
        )}

        {selected && (
          <div className="word-sheet-body">
            <section>
              <h3>{t('reading.meaning')}</h3>
              <p>{selected.back}</p>
            </section>

            {selected.example && (
              <section>
                <div className="word-sheet-example-head">
                  <h3>{t('reading.example')}</h3>
                  {speechSupported && (
                    <button
                      type="button"
                      className={`speak-btn speak-btn--inline${speakingText === selected.example ? ' speak-btn--active' : ''}`}
                      onClick={(e) => handleSpeak(e, selected.example ?? '')}
                      aria-label={t('flashcard.listenExample', { lang: 'English' })}
                    >
                      🔊
                    </button>
                  )}
                </div>
                <p className="word-sheet-example">{selected.example}</p>
              </section>
            )}

            {entries.length > 1 && (
              <section>
                <h3>{t('reading.senses')}</h3>
                <div className="word-sheet-senses">
                  {entries.map((entry, index) => (
                    <button
                      key={`${entry.front}-${entry.back}-${index}`}
                      type="button"
                      className={`word-sheet-sense${index === senseIndex ? ' word-sheet-sense--active' : ''}`}
                      onClick={() => setSenseIndex(index)}
                    >
                      {entry.partOfSpeech || entry.back}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <button type="button" className="btn btn-secondary word-sheet-close" onClick={onClose}>
          {t('reading.close')}
        </button>
      </div>
    </div>
  );
}
