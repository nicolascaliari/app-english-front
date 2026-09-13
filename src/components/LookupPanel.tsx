import { type FormEvent, type MouseEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { useI18n } from '../i18n/I18nProvider';
import type { Difficulty, LookupEntry, LookupResult } from '../types';
import {
  APP_LANGUAGE_LOCALE,
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languages';
import { isSpeechSupported, speak } from '../utils/speech';
import {
  categoryLabel,
  firstLeafId,
  resolveCategoryId,
  type CategoryNode,
} from '../utils/categoryTree';
import { CategorySelect } from './CategorySelect';
import { useErrorDialog } from './ErrorDialogProvider';

interface Props {
  tree: CategoryNode[];
  defaultCategoryId: string;
}

export function LookupPanel({ tree, defaultCategoryId }: Props) {
  const { user } = useAuth();
  const { t, languageName } = useI18n();
  const { showError } = useErrorDialog();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [example, setExample] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);

  const speechSupported = isSpeechSupported();
  const targetLanguage = user?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE;
  const nativeLanguage = user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE;
  const targetLabel = languageName(targetLanguage);
  const nativeLabel = languageName(nativeLanguage);
  const targetLocale = APP_LANGUAGE_LOCALE[targetLanguage];
  const selected = result?.entries[selectedIndex];

  useEffect(() => {
    setCategoryId((prev) => prev || defaultCategoryId || firstLeafId(tree));
  }, [defaultCategoryId, tree]);

  const applyEntry = (entry: LookupEntry) => {
    setFront(entry.front);
    setBack(entry.back);
    setExample(entry.example ?? '');
    setPronunciation(entry.pronunciation ?? '');
    setDifficulty(entry.difficulty ?? 'medium');
    setCategoryId(
      resolveCategoryId(
        tree,
        entry.suggestedCategory,
        entry.suggestedSubcategory,
        defaultCategoryId || firstLeafId(tree),
      ),
    );
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError(t('lookup.minQuery'));
      return;
    }

    setSearching(true);
    setError('');
    setSuccess('');
    setResult(null);

    try {
      // The backend tries its cache, then Wiktionary + translation, and only
      // then falls back to Gemini.
      const data = await api.lookupTerm(trimmed);
      setResult(data);
      setSelectedIndex(0);
      if (data.entries[0]) applyEntry(data.entries[0]);
    } catch (err) {
      showError(err, t('lookup.error'));
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (index: number) => {
    const entry = result?.entries[index];
    if (!entry) return;
    setSelectedIndex(index);
    applyEntry(entry);
    setSuccess('');
  };

  const handleSpeak = (e: MouseEvent<HTMLButtonElement>, text: string) => {
    e.preventDefault();
    speak(text, targetLocale, {
      onStart: () => setSpeakingText(text),
      onEnd: () => setSpeakingText(null),
    });
  };

  const selectedCategoryName = categoryLabel(tree, categoryId);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId || !front.trim() || !back.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const tags = [result?.kind, selected?.partOfSpeech].filter(
        (tag): tag is string => Boolean(tag),
      );

      await api.createFlashcard({
        categoryId,
        front: front.trim(),
        back: back.trim(),
        example: example.trim() || undefined,
        pronunciation: pronunciation.trim() || undefined,
        difficulty,
        tags,
      });
      setSuccess(
        t('lookup.added', {
          word: front.trim(),
          category: selectedCategoryName || t('new.category'),
        }),
      );
    } catch (err) {
      showError(err, t('new.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lookup">
      <p className="field-hint">{t('lookup.hint')}</p>

      <form className="lookup-search" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('lookup.placeholder')}
          autoComplete="off"
          autoFocus
          type="search"
          enterKeyHint="search"
        />
        <button type="submit" className="btn btn-primary" disabled={searching}>
          {searching ? t('lookup.searching') : t('lookup.search')}
        </button>
      </form>

      {error && <p className="status error">{error}</p>}
      {success && <p className="status success">{success}</p>}

      {result && result.entries.length > 0 && (
        <>
          <p className="lookup-kind">
            {result.kind === 'phrase' ? t('lookup.kindPhrase') : t('lookup.kindWord')}
            {result.query && result.query.toLowerCase() !== query.trim().toLowerCase()
              ? ` · ${result.query}`
              : ''}
          </p>

          <ul className="lookup-results">
            {result.entries.map((entry, index) => (
              <li key={`${entry.front}-${entry.back}-${index}`}>
                <button
                  type="button"
                  className={`lookup-result${index === selectedIndex ? ' lookup-result--active' : ''}`}
                  onClick={() => handleSelect(index)}
                >
                  <span className="lookup-result-front">{entry.front}</span>
                  {entry.partOfSpeech && (
                    <span className="lookup-result-pos">{entry.partOfSpeech}</span>
                  )}
                  <span className="lookup-result-back">{entry.back}</span>
                </button>
              </li>
            ))}
          </ul>

          <form className="form lookup-add" onSubmit={handleAdd}>
            <label>
              {t('new.front', { lang: targetLabel })}
              <div className="lookup-field-row">
                <input
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  required
                />
                {speechSupported && front && (
                  <button
                    type="button"
                    className={`speak-btn${speakingText === front ? ' speak-btn--active' : ''}`}
                    onClick={(e) => handleSpeak(e, front)}
                    aria-label={t('flashcard.listen', { lang: targetLabel })}
                  >
                    🔊
                  </button>
                )}
              </div>
            </label>

            <label>
              {t('new.back', { lang: nativeLabel })}
              <input
                value={back}
                onChange={(e) => setBack(e.target.value)}
                required
              />
            </label>

            {selected?.partOfSpeech && (
              <p className="lookup-meta">
                {t('lookup.partOfSpeech')}: {selected.partOfSpeech}
              </p>
            )}

            <label>
              {t('new.example')}
              <input
                value={example}
                onChange={(e) => setExample(e.target.value)}
              />
            </label>

            <label>
              {t('new.pronunciation')}
              <input
                value={pronunciation}
                onChange={(e) => setPronunciation(e.target.value)}
              />
            </label>

            <label>
              {t('new.category')}
              <CategorySelect tree={tree} value={categoryId} onChange={setCategoryId} />
            </label>

            {selected?.suggestedCategory && (
              <p className="field-hint">{t('lookup.suggested')}</p>
            )}

            <label>
              {t('common.difficulty')}
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">{t('difficulty.easy')}</option>
                <option value="medium">{t('difficulty.medium')}</option>
                <option value="hard">{t('difficulty.hard')}</option>
              </select>
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !categoryId}
            >
              {saving ? t('common.saving') : t('lookup.add')}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
