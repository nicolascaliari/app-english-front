import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { NativeLanguageSelect } from '../components/NativeLanguageSelect';
import { useI18n } from '../i18n/I18nProvider';
import type { UiMode } from '../i18n/types';
import type { AppLanguage } from '../utils/languages';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  NATIVE_LANGUAGES,
} from '../utils/languages';
import {
  clampPracticeLimit,
  DEFAULT_PRACTICE_LIMIT,
  PRACTICE_LIMIT_OPTIONS,
} from '../utils/practice';

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { t, languageName, uiMode, setUiMode } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [nativeLanguage, setNativeLanguage] = useState<AppLanguage>(
    user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE,
  );
  const [practiceLimit, setPracticeLimit] = useState(
    clampPracticeLimit(user?.practiceLimit ?? DEFAULT_PRACTICE_LIMIT),
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{
    updated: number;
    remaining: number;
  } | null>(null);
  const [backfillResult, setBackfillResult] = useState('');
  const [backfillError, setBackfillError] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    // Una cuenta vieja podría tener guardado un nativo que ya no es elegible.
    setNativeLanguage(
      NATIVE_LANGUAGES.includes(user.nativeLanguage)
        ? user.nativeLanguage
        : DEFAULT_NATIVE_LANGUAGE,
    );
    setPracticeLimit(clampPracticeLimit(user.practiceLimit));
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateProfile({
        name,
        nativeLanguage,
        practiceLimit: clampPracticeLimit(practiceLimit),
      });
      setSuccess(t('settings.success'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleBackfillImages = async () => {
    setBackfilling(true);
    setBackfillError('');
    setBackfillResult('');
    setBackfillProgress(null);

    let totalUpdated = 0;
    let totalNotFound = 0;

    try {
      while (true) {
        const result = await api.backfillFlashcardImages(20);
        totalUpdated += result.updated;
        totalNotFound += result.notFound;
        setBackfillProgress({
          updated: totalUpdated,
          remaining: result.remaining,
        });
        if (result.remaining === 0 || result.processed === 0) break;
      }

      setBackfillResult(
        t('settings.imagesBackfillDone', {
          updated: totalUpdated,
          notFound: totalNotFound,
        }),
      );
    } catch (err) {
      setBackfillError(
        err instanceof Error ? err.message : t('settings.imagesBackfillError'),
      );
    } finally {
      setBackfilling(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="page-title">{t('settings.title')}</h1>
      <div className="form-panel">
        <p className="field-hint" style={{ marginBottom: '1rem' }}>
          {t('settings.pairHint', {
            target: languageName(DEFAULT_TARGET_LANGUAGE),
            native: languageName(nativeLanguage),
          })}
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            {t('common.name')}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              required
            />
          </label>

          <label>
            {t('common.email')}
            <input type="email" value={user.email} disabled />
          </label>

          <NativeLanguageSelect
            value={nativeLanguage}
            onChange={setNativeLanguage}
            disabled={saving}
          />

          {/* Modo inmersión: la interfaz entera en inglés, para quien lo quiera. */}
          <fieldset className="ui-lang-fieldset">
            <legend>{t('settings.uiLanguage')}</legend>
            <label className="ui-lang-option">
              <input
                type="radio"
                name="uiMode"
                checked={uiMode === 'native'}
                onChange={() => setUiMode('native' satisfies UiMode)}
              />
              <span>
                {t('settings.uiNative', {
                  lang: languageName(nativeLanguage),
                })}
              </span>
            </label>
            <label className="ui-lang-option">
              <input
                type="radio"
                name="uiMode"
                checked={uiMode === 'target'}
                onChange={() => setUiMode('target' satisfies UiMode)}
              />
              <span>
                {t('settings.uiTarget', {
                  lang: languageName(DEFAULT_TARGET_LANGUAGE),
                })}
              </span>
            </label>
            <p className="field-hint">{t('settings.uiHint')}</p>
          </fieldset>

          <label>
            {t('settings.practiceLimit')}
            <select
              value={practiceLimit}
              onChange={(e) => setPracticeLimit(Number(e.target.value))}
              disabled={saving}
            >
              {PRACTICE_LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              {!PRACTICE_LIMIT_OPTIONS.some((n) => n === practiceLimit) && (
                <option value={practiceLimit}>{practiceLimit}</option>
              )}
            </select>
            <span className="field-hint">{t('settings.practiceLimitHint')}</span>
          </label>

          {error && <p className="status error">{error}</p>}
          {success && <p className="status success">{success}</p>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('common.saving') : t('settings.save')}
          </button>
        </form>
      </div>

      <div className="form-panel" style={{ marginTop: '1.25rem' }}>
        <h2 className="section-title">{t('settings.imagesTitle')}</h2>
        <p className="field-hint">{t('settings.imagesHint')}</p>

        {backfillProgress && backfilling && (
          <p className="status">
            {t('settings.imagesProgress', {
              updated: backfillProgress.updated,
              remaining: backfillProgress.remaining,
            })}
          </p>
        )}
        {backfillResult && <p className="status success">{backfillResult}</p>}
        {backfillError && <p className="status error">{backfillError}</p>}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleBackfillImages}
          disabled={backfilling || saving}
          style={{ marginTop: '0.75rem' }}
        >
          {backfilling
            ? t('settings.imagesBackfilling')
            : t('settings.imagesBackfill')}
        </button>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn--wide"
        style={{ marginTop: '1.25rem' }}
        onClick={async () => {
          await logout();
          navigate('/login', { replace: true });
        }}
      >
        {t('nav.logout')}
      </button>
    </div>
  );
}
