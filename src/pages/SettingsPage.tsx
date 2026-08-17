import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LanguagePairFields } from '../components/LanguagePairFields';
import { useI18n } from '../i18n/I18nProvider';
import type { UiMode } from '../i18n/types';
import type { AppLanguage } from '../utils/languages';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languages';

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { t, languageName, uiMode, setUiMode } = useI18n();
  const [name, setName] = useState(user?.name ?? '');
  const [nativeLanguage, setNativeLanguage] = useState<AppLanguage>(
    user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE,
  );
  const [targetLanguage, setTargetLanguage] = useState<AppLanguage>(
    user?.targetLanguage ?? DEFAULT_TARGET_LANGUAGE,
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
    setNativeLanguage(user.nativeLanguage);
    setTargetLanguage(user.targetLanguage);
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (nativeLanguage === targetLanguage) {
      setError(t('register.languagesMustDiffer'));
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name, nativeLanguage, targetLanguage });
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
            target: languageName(targetLanguage),
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

          <LanguagePairFields
            nativeLanguage={nativeLanguage}
            targetLanguage={targetLanguage}
            onNativeChange={setNativeLanguage}
            onTargetChange={setTargetLanguage}
            disabled={saving}
          />

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
                  lang: languageName(targetLanguage),
                })}
              </span>
            </label>
            <p className="field-hint">{t('settings.uiHint')}</p>
          </fieldset>

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
    </div>
  );
}
