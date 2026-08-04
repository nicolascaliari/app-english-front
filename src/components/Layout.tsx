import { Link, NavLink, Outlet } from 'react-router-dom';
import { AnimatedPage } from './AnimatedPage';

export function Layout() {
  return (
    <div className="app">
      <div className="app-bg" aria-hidden="true" />
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-flag">🇬</span>
          <span className="logo-text">Flashcards</span>🇺🇸
        </Link>
        <nav>
          <NavLink to="/practice" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Repasar
          </NavLink>
          <NavLink to="/grammar" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Gramática
          </NavLink>
          <NavLink to="/new" className={({ isActive }) => (isActive ? 'nav-link nav-link--cta active' : 'nav-link nav-link--cta')}>
            + Nueva
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
