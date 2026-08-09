import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import { AnimatedPage } from './AnimatedPage';

export function Layout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <div className="app-bg" aria-hidden="true" />
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-mark" aria-hidden="true">
            🃏
          </span>
          <span className="logo-text">{t('brand.name')}</span>
        </Link>
        <div className="header-actions">
          <nav aria-label={t('nav.aria')}>
            <NavLink to="/practice" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {t('nav.review')}
            </NavLink>
            <NavLink to="/grammar" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {t('nav.grammar')}
            </NavLink>
            <NavLink
              to="/new"
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link--cta active' : 'nav-link nav-link--cta'
              }
              aria-label={t('nav.newAria')}
            >
              <span className="nav-cta-plus" aria-hidden="true">
                +
              </span>
              <span className="nav-cta-label">{t('nav.new')}</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {t('nav.settings')}
            </NavLink>
          </nav>
          {user && (
            <button
              type="button"
              className="header-logout"
              onClick={handleLogout}
              title={`${t('nav.logout')} (${user.name})`}
              aria-label={`${t('nav.logout')} (${user.name})`}
            >
              {t('nav.logout')}
            </button>
          )}
        </div>
      </header>
      <main className="main">
        <AnimatedPage>
          <Outlet />
        </AnimatedPage>
      </main>
    </div>
  );
}
