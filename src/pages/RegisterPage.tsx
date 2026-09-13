import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  GoogleSignInButton,
  googleAuthEnabled,
} from '../components/GoogleSignInButton';
import { NativeLanguageSelect } from '../components/NativeLanguageSelect';
import { useI18n } from '../i18n/I18nProvider';
import type { AppLanguage } from '../utils/languages';
import { suggestedNativeLanguage } from '../utils/languages';

export function RegisterPage() {
  const { user, register, loginWithGoogle } = useAuth();
  const { t, setGuestLanguage } = useI18n();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState<AppLanguage>(() =>
    suggestedNativeLanguage(),
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // El formulario se traduce en vivo al idioma que se va eligiendo.
  useEffect(() => {
    setGuestLanguage(nativeLanguage);
  }, [nativeLanguage, setGuestLanguage]);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, email, password, nativeLanguage });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('register.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setSubmitting(true);
    try {
      // Con Google no hay formulario: el idioma se pregunta después de entrar.
      await loginWithGoogle(credential);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.googleError'));
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

          <NativeLanguageSelect
            value={nativeLanguage}
            onChange={setNativeLanguage}
            disabled={submitting}
          />
          <p className="field-hint">{t('register.languageHint')}</p>

          {error && <p className="status error">{error}</p>}

          <button type="submit" className="btn btn-primary btn--wide" disabled={submitting}>
            {submitting ? t('register.submitting') : t('register.submit')}
          </button>
        </form>

        {googleAuthEnabled && (
          <>
            <div className="auth-divider">
              <span>{t('login.or')}</span>
            </div>
            <GoogleSignInButton
              text="signup_with"
              onCredential={(credential) => void handleGoogleCredential(credential)}
              onError={() => setError(t('login.googleError'))}
            />
          </>
        )}

        <p className="auth-footer">
          {t('register.hasAccount')}{' '}
          <Link to="/login" state={{ from: location.state }}>{t('register.login')}</Link>
        </p>
      </div>
    </div>
  );
}
