import { useI18n } from '../i18n/I18nProvider';

export function LoadingSpinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="loading-screen">
      <div className="loading-spinner" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="loading-label">{label ?? t('common.loading')}</p>
    </div>
  );
}
