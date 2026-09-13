import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import { DEFAULT_PRACTICE_LIMIT } from '../utils/practice';

export function PracticeHubPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <div>
      <h1 className="page-title">{t('practice.hubTitle')}</h1>

      <Link to="/practice/session" className="banner banner--practice">
        <span className="banner-icon">🔄</span>
        <span className="banner-content">
          <span className="banner-title">{t('practice.hubReviewTitle')}</span>
          <span className="banner-sub">
            {t('practice.hubReviewSub', {
              count: user?.practiceLimit ?? DEFAULT_PRACTICE_LIMIT,
            })}
          </span>
        </span>
        <span className="banner-arrow">→</span>
      </Link>

      <Link to="/reading" className="banner banner--reading">
        <span className="banner-icon">📖</span>
        <span className="banner-content">
          <span className="banner-title">{t('practice.hubReadingTitle')}</span>
          <span className="banner-sub">{t('practice.hubReadingSub')}</span>
        </span>
        <span className="banner-arrow">→</span>
      </Link>

      <Link to="/practice/pinned" className="banner banner--pinned">
        <span className="banner-icon">⭐</span>
        <span className="banner-content">
          <span className="banner-title">{t('practice.hubPinnedTitle')}</span>
          <span className="banner-sub">{t('practice.hubPinnedSub')}</span>
        </span>
        <span className="banner-arrow">→</span>
      </Link>
    </div>
  );
}
