import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Category, Difficulty, Flashcard } from '../types';

export function CategoryPage() {
  const { slug, subSlug } = useParams<{ slug: string; subSlug?: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
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
  }, [slug, subSlug]);

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
        <span className="page-title-icon">{current.icon ?? category.icon}</span>
        {current.name}
      </h1>

      {hasSubcategories && (
        <>
          <ul className="category-list">
            {subcategories.map((sub, i) => (
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
                  <span className="category-icon">{sub.icon ?? category.icon ?? '📁'}</span>
                  <span className="category-name">{sub.name}</span>
                  <span className="category-arrow">→</span>
                </Link>
              </li>
            ))}
          </ul>

          {cards.length > 0 && (
            <h2 className="section-title">Cartas en esta categoría</h2>
          )}
        </>
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
      ) : (
        <ul className="flashcard-grid">
          {cards.map((card, i) => (
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
