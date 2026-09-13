import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * Rutas de la app de estudio. Un admin no estudia: su cuenta existe para
 * administrar, así que cualquier ruta de usuario lo manda al panel.
 * Es solo navegación; quien protege los datos es el backend.
 */
export function UserOnlyRoute() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
