import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';

export function LoginPage() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card form-panel">
        <div className="auth-brand">
          <span className="logo-mark" aria-hidden="true">🃏</span>
          <h1 className="auth-title">{t('login.title')}</h1>
          <p className="auth-subtitle">{t('login.subtitle')}</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="status error">{error}</p>}

          <button type="submit" className="btn btn-primary btn--wide" disabled={submitting}>
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p className="auth-footer">
          {t('login.noAccount')}{' '}
          <Link to="/register" state={{ from: location.state }}>{t('login.register')}</Link>
        </p>
      </div>
    </div>
  );
}
