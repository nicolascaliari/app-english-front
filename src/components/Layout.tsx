import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import { APP_LANGUAGE_FLAGS } from '../utils/languages';
import { AnimatedPage } from './AnimatedPage';
import { HeaderAccountMenu } from './HeaderAccountMenu';
import { LanguageSetupModal } from './LanguageSetupModal';
import { SectionGuide } from './SectionGuide';
import { TabBar } from './TabBar';

export function Layout() {
  const { user } = useAuth();
  const { t, uiMode, setUiMode } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Un admin no ve nada de la app de estudio: ni tabs, ni racha, ni "+".
  const isAdmin = user?.role === 'admin';

  const reading = pathname.startsWith('/reading/');
  const immersive =
    pathname.startsWith('/practice/session') ||
    pathname.startsWith('/review') ||
    reading;

  const toggleUiLanguage = () => {
    setUiMode(uiMode === 'target' ? 'native' : 'target');
  };

  const targetFlag = user
    ? APP_LANGUAGE_FLAGS[user.targetLanguage]
    : APP_LANGUAGE_FLAGS.en;

  return (
    <div className={`app${immersive ? ' app--immersive' : ''}${reading ? ' app--reading' : ''}`}>
      <div className="app-bg" aria-hidden="true" />
      <header className="header">
        <div className="header-start">
          <Link to={isAdmin ? '/admin' : '/'} className="logo">
            <span className="logo-mark" aria-hidden="true">
              🃏
            </span>
            <span className="logo-text">{t('brand.name')}</span>
          </Link>

          {user && !isAdmin && (
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
          {!isAdmin && (
            <button
              type="button"
              className="header-icon-btn header-icon-btn--cta"
              onClick={() => navigate('/new')}
              aria-label={t('nav.newAria')}
              title={t('nav.new')}
            >
              <span className="header-icon-btn__glyph" aria-hidden="true">
                +
              </span>
            </button>
          )}
          <HeaderAccountMenu />
        </div>
      </header>
      <main
        className={`main${immersive ? ' main--immersive' : ''}${reading ? ' main--reading' : ''}`}
      >
        <AnimatedPage>
          <Outlet />
        </AnimatedPage>
      </main>
      {!isAdmin && <TabBar />}
      {/* Primero el idioma: las guías tienen que salir ya traducidas. */}
      <LanguageSetupModal />
      <SectionGuide />
    </div>
  );
}
