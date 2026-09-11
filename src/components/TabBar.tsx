import { NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

function ReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="12" height="14" rx="2.5" />
      <rect x="8" y="3.5" width="12" height="14" rx="2.5" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M10.2 10.2 16 8l-2.2 5.8L8 16z" />
    </svg>
  );
}

function DecksIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="7" width="11" height="13" rx="2.2" />
      <path d="M9 4.8h9.2a2 2 0 0 1 2 2V16" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="3.2" />
      <path d="M6.5 18.2c1.2-2.4 3.1-3.6 5.5-3.6s4.3 1.2 5.5 3.6" />
    </svg>
  );
}

export function TabBar() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  const practiceActive =
    pathname.startsWith('/practice') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/reading');
  const decksActive =
    pathname === '/' || pathname.startsWith('/category') || pathname.startsWith('/new');

  return (
    <nav className="tabbar" aria-label={t('nav.aria')}>
      <NavLink
        to="/practice"
        className={() => `tabbar-link${practiceActive ? ' tabbar-link--active' : ''}`}
      >
        <span className="tabbar-icon">
          <ReviewIcon />
        </span>
        <span className="tabbar-label">{t('nav.practice')}</span>
      </NavLink>
      <NavLink
        to="/grammar"
        className={({ isActive }) => `tabbar-link${isActive ? ' tabbar-link--active' : ''}`}
      >
        <span className="tabbar-icon">
          <ExploreIcon />
        </span>
        <span className="tabbar-label">{t('nav.explore')}</span>
      </NavLink>
      <NavLink
        to="/"
        end
        className={() => `tabbar-link${decksActive ? ' tabbar-link--active' : ''}`}
      >
        <span className="tabbar-icon">
          <DecksIcon />
        </span>
        <span className="tabbar-label">{t('nav.decks')}</span>
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) => `tabbar-link${isActive ? ' tabbar-link--active' : ''}`}
      >
        <span className="tabbar-icon">
          <ProfileIcon />
        </span>
        <span className="tabbar-label">{t('nav.profile')}</span>
      </NavLink>
    </nav>
  );
}
