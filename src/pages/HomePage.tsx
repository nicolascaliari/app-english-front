import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import type { Category } from '../types';
import { categoryIcon } from '../utils/categoryIcon';

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getDueReviews()])
      .then(([cats, due]) => {
        setCategories(cats);
        setDueCount(due.length);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;

  return (
    <div>
      <Link to="/grammar" className="banner banner--grammar">
        <span className="banner-icon">✏️</span>
        <span className="banner-content">
          <span className="banner-title">Práctica de gramática</span>
          <span className="banner-sub">Ejercicios generados con IA</span>
        </span>
        <span className="banner-arrow">→</span>
      </Link>

      <Link to="/practice" className="banner banner--practice">
        <span className="banner-icon">🔄</span>
        <span className="banner-content">
          <span className="banner-title">Repaso rápido</span>
          <span className="banner-sub">10 cartas media / difícil</span>
        </span>
        <span className="banner-arrow">→</span>
      </Link>

      {dueCount > 0 && (
        <Link to="/review" className="banner banner--due">
          <span className="banner-icon">📚</span>
          <span className="banner-content">
            <span className="banner-title">
              {dueCount} carta{dueCount !== 1 ? 's' : ''} pendientes
            </span>
            <span className="banner-sub">Repetición espaciada (SM-2)</span>
          </span>
          <span className="banner-badge">{dueCount}</span>
        </Link>
      )}

      <h1 className="page-title">Categorías</h1>

      {categories.length === 0 ? (
        <div className="empty empty--enter">
          <span className="empty-icon">📭</span>
          <p>No hay categorías todavía.</p>
          <Link to="/new" className="btn btn-primary">
            Crear tu primera carta
          </Link>
        </div>
      ) : (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar categorías..."
          />

          {filteredCategories.length === 0 ? (
            <div className="empty empty--enter">
              <span className="empty-icon">🔍</span>
              <p>No se encontraron categorías para "{query}".</p>
            </div>
          ) : (
            <ul className="category-list">
              {filteredCategories.map((cat, i) => (
                <li key={cat._id} style={{ '--i': i } as CSSProperties}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="category-card"
                    style={
                      cat.color ? { '--cat-color': cat.color } as CSSProperties : undefined
                    }
                  >
                    <span className="category-icon">{categoryIcon(cat.icon, cat.slug)}</span>
                    <span className="category-name">{cat.name}</span>
                    <span className="category-arrow">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
