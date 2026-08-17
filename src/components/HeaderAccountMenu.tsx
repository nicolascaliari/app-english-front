import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';

export function HeaderAccountMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="header-account" ref={rootRef}>
      <button
        type="button"
        className={`header-icon-btn${open ? ' header-icon-btn--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('nav.accountAria')}
        title={t('nav.accountAria')}
      >
        <span className="header-icon-btn__glyph" aria-hidden="true">
          👤
        </span>
      </button>

      {open && (
        <div className="header-dropdown" role="menu">
          <p className="header-dropdown__user">{user.name}</p>
          <Link
            to="/settings"
            className="header-dropdown__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {t('nav.settings')}
          </Link>
          <button
            type="button"
            className="header-dropdown__item header-dropdown__item--danger"
            role="menuitem"
            onClick={handleLogout}
          >
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
