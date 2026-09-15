import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastTouchNav = useRef(Number.NEGATIVE_INFINITY);

  const practiceActive =
    pathname.startsWith('/practice') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/reading');
  const decksActive =
    pathname === '/' || pathname.startsWith('/category') || pathname.startsWith('/new');

  // iOS sometimes drops the click that should follow a tap — e.g. when the tap
  // first has to stop the momentum scroll of a long decks list — so a tab
  // could need several taps. Navigate on the touch itself, and ignore the
  // click that may still arrive right after it.
  const tapHandlers = (to: string) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      touchStart.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null;
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
      lastTouchNav.current = e.timeStamp;
      navigate(to, { replace: pathname === to });
    },
    onPointerCancel: () => {
      touchStart.current = null;
    },
    onClick: (e: ReactMouseEvent) => {
      if (e.timeStamp - lastTouchNav.current < 800) e.preventDefault();
    },
  });

  return (
    <nav className="tabbar" aria-label={t('nav.aria')}>
      <NavLink
        to="/practice"
        data-tour="tab-practice"
        {...tapHandlers('/practice')}
        className={() => `tabbar-link${practiceActive ? ' tabbar-link--active' : ''}`}
      >
        <span className="tabbar-icon">
          <ReviewIcon />
        </span>
        <span className="tabbar-label">{t('nav.practice')}</span>
      </NavLink>
      <NavLink
        to="/grammar"
        data-tour="tab-grammar"
        {...tapHandlers('/grammar')}
        className={({ isActive }) => `tabbar-link${isActive ? ' tabbar-link--active' : ''}`}
      >
        <span className="tabbar-icon">
          <ExploreIcon />
        </span>
        <span className="tabbar-label">{t('nav.grammar')}</span>
      </NavLink>
      <NavLink
        to="/"
        end
        data-tour="tab-decks"
        {...tapHandlers('/')}
        className={() => `tabbar-link${decksActive ? ' tabbar-link--active' : ''}`}
      >
        <span className="tabbar-icon">
          <DecksIcon />
        </span>
        <span className="tabbar-label">{t('nav.decks')}</span>
      </NavLink>
      <NavLink
        to="/settings"
        data-tour="tab-profile"
        {...tapHandlers('/settings')}
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
