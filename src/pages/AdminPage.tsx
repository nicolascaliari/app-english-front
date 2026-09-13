import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useI18n } from '../i18n/I18nProvider';
import type { AdminUser } from '../types';

export function AdminPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getUsers()
      .then(setUsers)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t('admin.error')),
      )
      .finally(() => setLoading(false));
  }, [t]);

  // El backend igual lo bloquea; esto evita mostrar la pantalla a quien no va.
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleToggleBlock = async (target: AdminUser) => {
    const id = target._id ?? target.id ?? '';
    setSavingId(id);
    setError('');
    try {
      const updated = await api.updateUser(id, { isActive: !target.isActive });
      setUsers((prev) =>
        prev.map((u) =>
          (u._id ?? u.id) === id ? { ...u, isActive: updated.isActive } : u,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.error'));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page">
      <h1 className="page-title">{t('admin.title')}</h1>
      <p className="import-hint">{t('admin.subtitle')}</p>

      {error && <p className="status error">{error}</p>}

      {users.length === 0 ? (
        <p className="status">{t('admin.empty')}</p>
      ) : (
        <div className="import-table-wrap">
          <table className="import-table admin-table">
            <thead>
              <tr>
                <th>{t('admin.user')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.status')}</th>
                <th aria-label={t('admin.actions')} />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const id = u._id ?? u.id ?? '';
                const isSelf = id === user?.id;
                return (
                  <tr key={id}>
                    <td>
                      <span className="admin-name">{u.name}</span>
                      <span className="admin-email">{u.email}</span>
                    </td>
                    <td>{u.role}</td>
                    <td>
                      <span
                        className={
                          u.isActive
                            ? 'admin-badge admin-badge--active'
                            : 'admin-badge admin-badge--blocked'
                        }
                      >
                        {u.isActive ? t('admin.active') : t('admin.blocked')}
                      </span>
                    </td>
                    <td>
                      {isSelf ? (
                        <span className="admin-self">{t('admin.you')}</span>
                      ) : (
                        <button
                          type="button"
                          className={
                            u.isActive
                              ? 'btn btn-danger btn--small'
                              : 'btn btn--small'
                          }
                          disabled={savingId === id}
                          onClick={() => void handleToggleBlock(u)}
                        >
                          {savingId === id
                            ? t('common.saving')
                            : u.isActive
                              ? t('admin.block')
                              : t('admin.unblock')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
