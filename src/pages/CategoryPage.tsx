import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { FlashcardView } from '../components/FlashcardView';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Category, Difficulty, Flashcard } from '../types';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    Promise.all([api.getCategory(slug), api.getFlashcards(slug)])
      .then(([cat, flashcards]) => {
        setCategory(cat);
        setCards(flashcards);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

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

  return (
    <div>
      <Link to="/" className="back-link">
        ← Volver
      </Link>
      <h1 className="page-title page-title--with-icon">
        <span className="page-title-icon">{category.icon}</span>
        {category.name}
      </h1>

      {cards.length === 0 ? (
        <div className="empty empty--enter">
          <span className="empty-icon">🃏</span>
          <p>No hay cartas en esta categoría.</p>
          <Link
            to="/new"
            state={{ categoryId: category._id }}
            className="btn btn-primary"
          >
            Agregar carta
          </Link>
        </div>
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
    </div>
  );
}
