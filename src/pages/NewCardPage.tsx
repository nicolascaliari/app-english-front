import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ImportPanel } from '../components/ImportPanel';
import type { Category, Difficulty } from '../types';

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function NewCardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedCategoryId = (location.state as { categoryId?: string })
    ?.categoryId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [mode, setMode] = useState<'card' | 'category' | 'import'>('card');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [categoryId, setCategoryId] = useState(preselectedCategoryId ?? '');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [example, setExample] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catColor, setCatColor] = useState('#6c63ff');

  useEffect(() => {
    api
      .getCategories()
      .then((cats) => {
        setCategories(cats);
        setCategoryId((prev) => prev || (cats.length > 0 ? cats[0]._id : ''));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateCard = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createFlashcard({
        categoryId,
        front: front.trim(),
        back: back.trim(),
        example: example.trim() || undefined,
        pronunciation: pronunciation.trim() || undefined,
        difficulty,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const cat = await api.createCategory({
        name: catName.trim(),
        slug: catSlug.trim() || slugify(catName),
        icon: catIcon.trim() || undefined,
        color: catColor,
      });
      setCategories((prev) => [...prev, cat]);
      setCategoryId(cat._id);
      setMode('card');
      setCatName('');
      setCatSlug('');
      setCatIcon('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="page-title">Crear</h1>

      <div className="tabs">
        <button
          type="button"
          className={mode === 'card' ? 'tab active' : 'tab'}
          onClick={() => setMode('card')}
        >
          Nueva carta
        </button>
        <button
          type="button"
          className={mode === 'category' ? 'tab active' : 'tab'}
          onClick={() => setMode('category')}
        >
          Nueva categoría
        </button>
        <button
          type="button"
          className={mode === 'import' ? 'tab active' : 'tab'}
          onClick={() => setMode('import')}
        >
          Importar Excel
        </button>
      </div>

      {error && <p className="status error">{error}</p>}

      <div key={mode} className="form-panel">
        {mode === 'import' ? (
          <ImportPanel />
        ) : mode === 'card' ? (
          <form className="form" onSubmit={handleCreateCard}>
            <label>
              Categoría
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.length === 0 && (
                  <option value="">Sin categorías — creá una primero</option>
                )}
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Inglés (frente)
              <input
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="e.g. nevertheless"
                required
              />
            </label>

            <label>
              Español (dorso)
              <input
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="e.g. sin embargo"
                required
              />
            </label>

            <label>
              Ejemplo (opcional)
              <input
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder='e.g. Nevertheless, we continued.'
              />
            </label>

            <label>
              Pronunciación (opcional)
              <input
                value={pronunciation}
                onChange={(e) => setPronunciation(e.target.value)}
                placeholder="e.g. /ˌnev.ə.ðəˈles/"
              />
            </label>

            <label>
              Dificultad
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">Fácil</option>
                <option value="medium">Media</option>
                <option value="hard">Difícil</option>
              </select>
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || categories.length === 0}
            >
              {saving ? 'Guardando...' : 'Guardar carta'}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={handleCreateCategory}>
            <label>
              Nombre
              <input
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  setCatSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Cocina"
                required
              />
            </label>

            <label>
              Slug (URL)
              <input
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="e.g. cocina"
                required
              />
            </label>

            <label>
              Ícono (emoji)
              <input
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="e.g. 🍳"
              />
            </label>

            <label>
              Color
              <input
                type="color"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear categoría'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
