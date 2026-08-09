import { useI18n } from '../i18n/I18nProvider';
import type { Difficulty } from '../types';
import { SearchBar } from './SearchBar';

interface CardFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  difficulty: Difficulty | null;
  onDifficultyChange: (value: Difficulty | null) => void;
  total: number;
  filtered: number;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export function CardFilters({
  query,
  onQueryChange,
  difficulty,
  onDifficultyChange,
  total,
  filtered,
}: CardFiltersProps) {
  const { t } = useI18n();
  const hasFilters = query || difficulty;

  return (
    <div className="card-filters">
      <SearchBar
        value={query}
        onChange={onQueryChange}
        placeholder={t('filters.searchCards')}
      />

      <div className="filter-pills">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            className={`filter-pill filter-pill--${d}${difficulty === d ? ' active' : ''}`}
            onClick={() => onDifficultyChange(difficulty === d ? null : d)}
          >
            {t(`difficulty.${d}`)}
          </button>
        ))}
      </div>

      {hasFilters && (
        <p className="filter-count">
          {t('filters.count', { filtered, total })}
        </p>
      )}
    </div>
  );
}
