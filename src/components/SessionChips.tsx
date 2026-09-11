import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';

interface Props {
  current: number;
  total: number;
}

export function SessionChips({ current, total }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <div className="session-chips">
      {user && (
        <span className="session-chip session-chip--streak" title={t('nav.streak', { count: user.streakCount })}>
          <span aria-hidden="true">🔥</span>
          {user.streakCount}
        </span>
      )}
      <span className="session-chip session-chip--progress">
        {current}/{total}
      </span>
    </div>
  );
}
