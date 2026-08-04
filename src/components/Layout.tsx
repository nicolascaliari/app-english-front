import { Link, NavLink, Outlet } from 'react-router-dom';
import { AnimatedPage } from './AnimatedPage';

export function Layout() {
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
      </header>
      <main className="main">
        <AnimatedPage>
          <Outlet />
        </AnimatedPage>
      </main>
    </div>
  );
}
