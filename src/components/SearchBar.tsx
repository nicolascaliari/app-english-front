interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...' }: SearchBarProps) {
  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">🔍</span>
      <input
        type="search"
        className="search-bar-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-bar-clear"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
        >
          ✕
        </button>
      )}
    </div>
  );
}
