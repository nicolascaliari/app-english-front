import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  downloadImportTemplate,
  parseExcelFile,
  type ParsedExcel,
} from '../utils/excelImport';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languages';

export function ImportPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, languageName } = useI18n();
  const targetLabel = languageName(user?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE);
  const nativeLabel = languageName(user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [fileName, setFileName] = useState('');
  const [importCategories, setImportCategories] = useState(true);
  const [importFlashcards, setImportFlashcards] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const hasCategories = (parsed?.categories.length ?? 0) > 0;
  const hasFlashcards = (parsed?.flashcards.length ?? 0) > 0;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const data = parseExcelFile(buffer);
      setParsed(data);
      setImportCategories(data.categories.length > 0);
      setImportFlashcards(data.flashcards.length > 0);

      if (data.categories.length === 0 && data.flashcards.length === 0) {
        setError(t('import.noData'));
      }
    } catch {
      setError(t('import.readError'));
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const payload: Parameters<typeof api.importData>[0] = {};
      if (importCategories && parsed.categories.length > 0) {
        payload.categories = parsed.categories;
      }
      if (importFlashcards && parsed.flashcards.length > 0) {
        payload.flashcards = parsed.flashcards;
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
      <p className="import-hint">{t('import.hint')}</p>

      <button
        type="button"
        className="btn btn-secondary import-template-btn"
        onClick={downloadImportTemplate}
      >
        {t('import.downloadTemplate')}
      </button>

      <div className="import-dropzone">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="import-file-input"
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileName || t('import.chooseFile')}
        </button>
      </div>

      {parsed && (hasCategories || hasFlashcards) && (
        <div className="import-preview">
          <p className="import-preview-title">{t('import.preview')}</p>

          {hasCategories && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importCategories}
                onChange={(e) => setImportCategories(e.target.checked)}
              />
              {t('import.categoriesN', { n: parsed.categories.length })}
            </label>
          )}

          {hasFlashcards && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importFlashcards}
                onChange={(e) => setImportFlashcards(e.target.checked)}
              />
              {t('import.wordsN', { n: parsed.flashcards.length })}
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
                  {parsed.categories.slice(0, 5).map((c) => (
                    <tr key={c.slug}>
                      <td>{c.name}</td>
                      <td>{c.slug}</td>
                      <td>{c.icon ?? '—'}</td>
                      <td>{c.parent ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.categories.length > 5 && (
                <p className="import-more">
                  {t('import.more', { n: parsed.categories.length - 5 })}
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
                  </tr>
                </thead>
                <tbody>
                  {parsed.flashcards.slice(0, 5).map((f, i) => (
                    <tr key={`${f.category}-${f.front}-${i}`}>
                      <td>{f.category}</td>
                      <td>{f.subcategory ?? '—'}</td>
                      <td>{f.front}</td>
                      <td>{f.back}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.flashcards.length > 5 && (
                <p className="import-more">
                  {t('import.more', { n: parsed.flashcards.length - 5 })}
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
            {importing ? t('import.importing') : t('import.import')}
          </button>
        </div>
      )}

      {result && <p className="status success">{result}</p>}
      {error && <p className="status error">{error}</p>}

      <details className="import-format-help">
        <summary>{t('import.formatTitle')}</summary>
        <div className="import-format-body">
          <p>{t('import.formatCats')}</p>
          <p>
            {t('import.formatWords', {
              target: targetLabel,
              native: nativeLabel,
            })}
          </p>
          <p>{t('import.formatRules')}</p>
        </div>
      </details>
    </div>
  );
}
