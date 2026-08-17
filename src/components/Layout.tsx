import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import { APP_LANGUAGE_FLAGS } from '../utils/languages';
import { AnimatedPage } from './AnimatedPage';
import { HeaderAccountMenu } from './HeaderAccountMenu';

function navIconClass(isActive: boolean): string {
  return isActive ? 'header-icon-btn header-icon-btn--active' : 'header-icon-btn';
}

export function Layout() {
  const { user, logout } = useAuth();
  const { t, uiMode, setUiMode } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const toggleUiLanguage = () => {
    setUiMode(uiMode === 'target' ? 'native' : 'target');
  };

  const targetFlag = user
    ? APP_LANGUAGE_FLAGS[user.targetLanguage]
    : APP_LANGUAGE_FLAGS.en;

  return (
    <div className="app">
      <div className="app-bg" aria-hidden="true" />
      <header className="header">
        <div className="header-start">
          <Link to="/" className="logo logo--desktop">
            <span className="logo-mark" aria-hidden="true">
              🃏
            </span>
            <span className="logo-text">{t('brand.name')}</span>
          </Link>

          {user && (
            <div className="header-badges">
              <button
                type="button"
                className="header-lang-toggle"
                onClick={toggleUiLanguage}
                title={t('nav.uiLanguageToggle')}
                aria-label={t('nav.uiLanguageToggle')}
              >
                <span className="logo-flag" aria-hidden="true">
                  {targetFlag}
                </span>
              </button>
              <div
                className="header-streak"
                title={t('nav.streak', { count: user.streakCount })}
                aria-label={t('nav.streak', { count: user.streakCount })}
              >
                <span className="streak-icon" aria-hidden="true">
                  🔥
                </span>
                <span className="streak-count">{user.streakCount}</span>
              </div>
            </div>
          )}
        </div>

        <div className="header-actions">
          <nav className="header-nav header-nav--desktop" aria-label={t('nav.aria')}>
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

          <nav className="header-nav header-nav--mobile" aria-label={t('nav.aria')}>
            <NavLink
              to="/practice"
              className={({ isActive }) => navIconClass(isActive)}
              aria-label={t('nav.review')}
              title={t('nav.review')}
            >
              <span className="header-icon-btn__glyph" aria-hidden="true">
                🔄
              </span>
            </NavLink>
            <NavLink
              to="/grammar"
              className={({ isActive }) => navIconClass(isActive)}
              aria-label={t('nav.grammar')}
              title={t('nav.grammar')}
            >
              <span className="header-icon-btn__glyph" aria-hidden="true">
                ✏️
              </span>
            </NavLink>
            <NavLink
              to="/new"
              className={({ isActive }) =>
                isActive
                  ? 'header-icon-btn header-icon-btn--cta header-icon-btn--active'
                  : 'header-icon-btn header-icon-btn--cta'
              }
              aria-label={t('nav.newAria')}
              title={t('nav.new')}
            >
              <span className="header-icon-btn__glyph" aria-hidden="true">
                +
              </span>
            </NavLink>
          </nav>

          <HeaderAccountMenu />

          {user && (
            <button
              type="button"
              className="header-logout header-logout--desktop"
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
