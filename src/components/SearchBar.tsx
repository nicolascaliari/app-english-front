import { useI18n } from '../i18n/I18nProvider';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('common.search');

  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">🔍</span>
      <input
        type="search"
        className="search-bar-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        aria-label={resolvedPlaceholder}
      />
      {value && (
        <button
          type="button"
          className="search-bar-clear"
          onClick={() => onChange('')}
          aria-label={t('common.clearSearch')}
        >
          ✕
        </button>
      )}
    </div>
  );
}
