import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LanguagePairFields } from '../components/LanguagePairFields';
import { useI18n } from '../i18n/I18nProvider';
import type { AppLanguage } from '../utils/languages';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languages';

export function RegisterPage() {
  const { user, register } = useAuth();
  const { t, setGuestLanguage } = useI18n();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState<AppLanguage>(
    DEFAULT_NATIVE_LANGUAGE,
  );
  const [targetLanguage, setTargetLanguage] = useState<AppLanguage>(
    DEFAULT_TARGET_LANGUAGE,
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setGuestLanguage(nativeLanguage);
  }, [nativeLanguage, setGuestLanguage]);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleNativeChange = (value: AppLanguage) => {
    setNativeLanguage(value);
    setGuestLanguage(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (nativeLanguage === targetLanguage) {
      setError(t('register.languagesMustDiffer'));
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        nativeLanguage,
        targetLanguage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('register.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card form-panel">
        <div className="auth-brand">
          <span className="logo-mark" aria-hidden="true">🃏</span>
          <h1 className="auth-title">{t('register.title')}</h1>
          <p className="auth-subtitle">{t('register.subtitle')}</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            {t('common.name')}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              minLength={2}
              required
            />
          </label>
          <label>
            {t('common.email')}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            {t('common.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <p className="field-hint">{t('register.passwordHint')}</p>

          <LanguagePairFields
            nativeLanguage={nativeLanguage}
            targetLanguage={targetLanguage}
            onNativeChange={handleNativeChange}
            onTargetChange={setTargetLanguage}
            disabled={submitting}
          />
          <p className="field-hint">{t('register.languageHint')}</p>

          {error && <p className="status error">{error}</p>}

          <button type="submit" className="btn btn-primary btn--wide" disabled={submitting}>
            {submitting ? t('register.submitting') : t('register.submit')}
          </button>
        </form>

        <p className="auth-footer">
          {t('register.hasAccount')}{' '}
          <Link to="/login" state={{ from: location.state }}>{t('register.login')}</Link>
        </p>
      </div>
    </div>
  );
}
