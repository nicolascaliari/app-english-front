import { DIFFICULTY_LABELS, type Difficulty } from '../types';
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
  const hasFilters = query || difficulty;

  return (
    <div className="card-filters">
      <SearchBar value={query} onChange={onQueryChange} placeholder="Buscar cartas..." />

      <div className="filter-pills">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            className={`filter-pill filter-pill--${d}${difficulty === d ? ' active' : ''}`}
            onClick={() => onDifficultyChange(difficulty === d ? null : d)}
          >
            {DIFFICULTY_LABELS[d]}
          </button>
        ))}
      </div>

      {hasFilters && (
        <p className="filter-count">
          {filtered} de {total} carta{total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
