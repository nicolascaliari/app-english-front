import { useI18n } from '../i18n/I18nProvider';

interface Props {
  current: number;
  total: number;
  label?: string;
}

export function ReviewProgress({ current, total, label }: Props) {
  const { t } = useI18n();
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="review-progress-wrap">
      <div className="review-progress-header">
        <span className="review-progress-count">
          {current} <span className="review-progress-of">{t('common.of')}</span> {total}
        </span>
        {label && <span className="review-progress-label">{label}</span>}
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
