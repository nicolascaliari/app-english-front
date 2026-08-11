import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import type { ImportPayload } from '../types';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languages';

export function AiGeneratePanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, languageName } = useI18n();
  const targetLabel = languageName(user?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE);
  const nativeLabel = languageName(user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE);
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState<ImportPayload | null>(null);
  const [importCategories, setImportCategories] = useState(true);
  const [importFlashcards, setImportFlashcards] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const examplePrompts = [t('ai.example1'), t('ai.example2'), t('ai.example3')];

  const hasCategories = (generated?.categories?.length ?? 0) > 0;
  const hasFlashcards = (generated?.flashcards?.length ?? 0) > 0;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      setError(t('ai.minPrompt'));
      return;
    }

    setGenerating(true);
    setError('');
    setResult(null);
    setGenerated(null);

    try {
      const data = await api.generateWithAi(trimmed);
      setGenerated(data);
      setImportCategories((data.categories?.length ?? 0) > 0);
      setImportFlashcards((data.flashcards?.length ?? 0) > 0);

      if (!data.categories?.length && !data.flashcards?.length) {
        setError(t('ai.noData'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!generated) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const payload: ImportPayload = {};
      if (importCategories && generated.categories?.length) {
        payload.categories = generated.categories;
      }
      if (importFlashcards && generated.flashcards?.length) {
        payload.flashcards = generated.flashcards;
      }

      if (!payload.categories?.length && !payload.flashcards?.length) {
        setError(t('import.selectSomething'));
        return;
      }

      const res = await api.importData(payload);
      setResult(
        t('import.result', {
          cats: res.categories.created,
          cards: res.flashcards.created,
          skipped: res.flashcards.skipped,
        }),
      );

      if (res.flashcards.errors.length > 0) {
        setError(res.flashcards.errors.slice(0, 5).join('\n'));
      } else if (res.categories.created > 0 || res.flashcards.created > 0) {
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="import-panel">
      <p className="import-hint">
        {t('ai.hint', { target: targetLabel, native: nativeLabel })}
      </p>

      <form className="ai-generate-form" onSubmit={handleGenerate}>
        <label>
          {t('ai.prompt')}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('ai.placeholder')}
            rows={4}
            disabled={generating}
          />
        </label>

        <div className="ai-example-prompts">
          <span className="ai-example-label">{t('ai.examples')}</span>
          {examplePrompts.map((example) => (
            <button
              key={example}
              type="button"
              className="ai-example-btn"
              disabled={generating}
              onClick={() => setPrompt(example)}
            >
              {example}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={generating || prompt.trim().length < 3}
        >
          {generating ? t('ai.generating') : t('ai.generate')}
        </button>
      </form>

      {generated && (hasCategories || hasFlashcards) && (
        <div className="import-preview">
          <p className="import-preview-title">{t('import.preview')}</p>

          {hasCategories && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importCategories}
                onChange={(e) => setImportCategories(e.target.checked)}
              />
              {t('import.categoriesN', { n: generated.categories!.length })}
            </label>
          )}

          {hasFlashcards && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importFlashcards}
                onChange={(e) => setImportFlashcards(e.target.checked)}
              />
              {t('import.wordsN', { n: generated.flashcards!.length })}
            </label>
          )}

          {hasCategories && importCategories && (
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>{t('import.name')}</th>
                    <th>{t('import.slug')}</th>
                    <th>{t('import.icon')}</th>
                    <th>{t('import.parent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {generated.categories!.slice(0, 5).map((c) => (
                    <tr key={c.slug}>
                      <td>{c.name}</td>
                      <td>{c.slug}</td>
                      <td>{c.icon ?? '—'}</td>
                      <td>{c.parent ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {generated.categories!.length > 5 && (
                <p className="import-more">
                  {t('import.more', { n: generated.categories!.length - 5 })}
                </p>
              )}
            </div>
          )}

          {hasFlashcards && importFlashcards && (
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>{t('import.category')}</th>
                    <th>{t('import.subcategory')}</th>
                    <th>{targetLabel}</th>
                    <th>{nativeLabel}</th>
                    <th>{t('common.difficulty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {generated.flashcards!.slice(0, 5).map((f, i) => (
                    <tr key={`${f.category}-${f.front}-${i}`}>
                      <td>{f.category}</td>
                      <td>{f.subcategory ?? '—'}</td>
                      <td>{f.front}</td>
                      <td>{f.back}</td>
                      <td>{f.difficulty ?? 'medium'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {generated.flashcards!.length > 5 && (
                <p className="import-more">
                  {t('import.more', { n: generated.flashcards!.length - 5 })}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            disabled={importing}
            onClick={handleImport}
          >
            {importing ? t('common.saving') : t('ai.confirm')}
          </button>
        </div>
      )}

      {result && <p className="status success">{result}</p>}
      {error && <p className="status error">{error}</p>}

      <details className="import-format-help">
        <summary>{t('ai.tipsTitle')}</summary>
        <div className="import-format-body">
          <p>{t('ai.tip1')}</p>
          <p>{t('ai.tip2')}</p>
          <p>{t('ai.tip3')}</p>
        </div>
      </details>
    </div>
  );
}
