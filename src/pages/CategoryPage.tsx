import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { CardFilters } from '../components/CardFilters';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import type { Category, Difficulty, Flashcard } from '../types';
import { categoryIcon } from '../utils/categoryIcon';

export function CategoryPage() {
  const { slug, subSlug } = useParams<{ slug: string; subSlug?: string }>();
  const { user, loading: authLoading } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subQuery, setSubQuery] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | null>(null);

  useEffect(() => {
    if (!slug || authLoading || !user) return;
    setLoading(true);
    setError('');

    if (subSlug) {
      Promise.all([
        api.getCategory(slug),
        api.getSubcategory(slug, subSlug),
        api.getSubcategoryFlashcards(slug, subSlug),
      ])
        .then(([cat, sub, flashcards]) => {
          setCategory(cat);
          setSubcategory(sub);
          setSubcategories([]);
          setCards(flashcards);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        api.getCategory(slug),
        api.getSubcategories(slug),
        api.getFlashcards(slug),
      ])
        .then(([cat, subs, flashcards]) => {
          setCategory(cat);
          setSubcategory(null);
          setSubcategories(subs);
          setCards(flashcards);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [slug, subSlug, authLoading, user]);

  useEffect(() => {
    setSubQuery('');
    setCardQuery('');
    setDifficultyFilter(null);
  }, [slug, subSlug]);

  const filteredSubcategories = useMemo(() => {
    const q = subQuery.trim().toLowerCase();
    if (!q) return subcategories;
    return subcategories.filter((s) => s.name.toLowerCase().includes(q));
  }, [subcategories, subQuery]);

  const filteredCards = useMemo(() => {
    const q = cardQuery.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesQuery =
        !q ||
        [card.front, card.back, card.example, card.pronunciation, ...card.tags]
          .some((field) => field?.toLowerCase().includes(q));
      const matchesDifficulty = !difficultyFilter || card.difficulty === difficultyFilter;
      return matchesQuery && matchesDifficulty;
    });
  }, [cards, cardQuery, difficultyFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta carta?')) return;
    await api.deleteFlashcard(id);
    setCards((prev) => prev.filter((c) => c._id !== id));
  };

  const handleDifficultyChange = async (id: string, difficulty: Difficulty) => {
    const updated = await api.updateFlashcard(id, { difficulty });
    setCards((prev) => prev.map((c) => (c._id === id ? updated : c)));
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="status error">{error}</p>;
  if (!category) return null;

  const current = subcategory ?? category;
  const currentId = current._id;
  const hasSubcategories = !subcategory && subcategories.length > 0;

  return (
    <div>
      <Link to={subcategory ? `/category/${category.slug}` : '/'} className="back-link">
        ← Volver
      </Link>

      {subcategory && (
        <p className="breadcrumb">
          <Link to="/">Categorías</Link> / <Link to={`/category/${category.slug}`}>{category.name}</Link>
        </p>
      )}

      <h1 className="page-title page-title--with-icon">
        <span className="page-title-icon">
          {categoryIcon(current.icon ?? category.icon, current.slug ?? category.slug)}
        </span>
        {current.name}
      </h1>

      {hasSubcategories && (
        <>
          <SearchBar
            value={subQuery}
            onChange={setSubQuery}
            placeholder="Buscar subcategorías..."
          />

          {filteredSubcategories.length === 0 ? (
            <div className="empty empty--enter">
              <span className="empty-icon">🔍</span>
              <p>No se encontraron subcategorías para "{subQuery}".</p>
            </div>
          ) : (
            <ul className="category-list">
              {filteredSubcategories.map((sub, i) => (
                <li key={sub._id} style={{ '--i': i } as CSSProperties}>
                  <Link
                    to={`/category/${category.slug}/${sub.slug}`}
                    className="category-card"
                    style={
                      (sub.color ?? category.color)
                        ? ({ '--cat-color': sub.color ?? category.color } as CSSProperties)
                        : undefined
                    }
                  >
                    <span className="category-icon">
                      {categoryIcon(sub.icon ?? category.icon, sub.slug)}
                    </span>
                    <span className="category-name">{sub.name}</span>
                    <span className="category-arrow">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {cards.length > 0 && (
            <h2 className="section-title">Cartas en esta categoría</h2>
          )}
        </>
      )}

      {cards.length > 0 && (
        <CardFilters
          query={cardQuery}
          onQueryChange={setCardQuery}
          difficulty={difficultyFilter}
          onDifficultyChange={setDifficultyFilter}
          total={cards.length}
          filtered={filteredCards.length}
        />
      )}

      {cards.length === 0 ? (
        hasSubcategories ? null : (
          <div className="empty empty--enter">
            <span className="empty-icon">🃏</span>
            <p>No hay cartas en esta categoría.</p>
            <Link
              to="/new"
              state={{ categoryId: currentId }}
              className="btn btn-primary"
            >
              Agregar carta
            </Link>
          </div>
        )
      ) : filteredCards.length === 0 ? (
        <div className="empty empty--enter">
          <span className="empty-icon">🔍</span>
          <p>No se encontraron cartas con esos filtros.</p>
        </div>
      ) : (
        <ul className="flashcard-grid">
          {filteredCards.map((card, i) => (
            <li key={card._id} style={{ '--i': i } as CSSProperties}>
              <FlashcardView
                card={card}
                compact
                showDifficultyPicker
                onDifficultyChange={(d) => handleDifficultyChange(card._id, d)}
                onDelete={() => handleDelete(card._id)}
              />
            </li>
          ))}
        </ul>
      )}

      {!subcategory && (
        <Link
          to="/new"
          state={{ parentSlug: category.slug }}
          className="btn btn-secondary add-subcategory-link"
        >
          + Agregar subcategoría
        </Link>
      )}
    </div>
  );
}
