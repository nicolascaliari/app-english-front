import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export function AnimatedPage({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  );
}
