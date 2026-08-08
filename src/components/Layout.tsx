import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AnimatedPage } from './AnimatedPage';

export function Layout() {
  const { user, logout } = useAuth();
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
          <span className="logo-text">Flashcards</span>
        </Link>
        <div className="header-actions">
          <nav aria-label="Principal">
            <NavLink to="/practice" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Repasar
            </NavLink>
            <NavLink to="/grammar" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Gramática
            </NavLink>
            <NavLink
              to="/new"
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link--cta active' : 'nav-link nav-link--cta'
              }
              aria-label="Nueva carta"
            >
              <span className="nav-cta-plus" aria-hidden="true">
                +
              </span>
              <span className="nav-cta-label">Nueva</span>
            </NavLink>
          </nav>
          {user && (
            <button
              type="button"
              className="header-logout"
              onClick={handleLogout}
              title={`Cerrar sesión (${user.name})`}
              aria-label={`Cerrar sesión (${user.name})`}
            >
              Cerrar sesión
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
