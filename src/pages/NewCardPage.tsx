import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AiGeneratePanel } from '../components/AiGeneratePanel';
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

interface CategoryNode {
  root: Category;
  subs: Category[];
}

function firstLeafId(tree: CategoryNode[]): string {
  for (const node of tree) {
    if (node.subs.length === 0) return node.root._id;
    if (node.subs[0]) return node.subs[0]._id;
  }
  return '';
}

export function NewCardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as
    | { categoryId?: string; parentSlug?: string }
    | undefined;
  const preselectedCategoryId = locationState?.categoryId;
  const preselectedParentSlug = locationState?.parentSlug;

  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [mode, setMode] = useState<'card' | 'category' | 'import' | 'ai'>(
    preselectedParentSlug ? 'category' : 'card',
  );
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
  const [catParentSlug, setCatParentSlug] = useState(preselectedParentSlug ?? '');

  useEffect(() => {
    api
      .getCategories()
      .then(async (roots) => {
        const withSubs = await Promise.all(
          roots.map(async (root) => ({
            root,
            subs: await api.getSubcategories(root.slug).catch(() => []),
          })),
        );
        setTree(withSubs);
        setCategoryId((prev) => prev || firstLeafId(withSubs));
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
      const payload = {
        name: catName.trim(),
        slug: catSlug.trim() || slugify(catName),
        icon: catIcon.trim() || undefined,
        color: catColor,
      };

      if (catParentSlug) {
        const sub = await api.createSubcategory(catParentSlug, payload);
        setTree((prev) =>
          prev.map((node) =>
            node.root.slug === catParentSlug
              ? { ...node, subs: [...node.subs, sub] }
              : node,
          ),
        );
        setCategoryId(sub._id);
      } else {
        const cat = await api.createCategory(payload);
        setTree((prev) => [...prev, { root: cat, subs: [] }]);
        setCategoryId(cat._id);
      }

      setMode('card');
      setCatName('');
      setCatSlug('');
      setCatIcon('');
      setCatParentSlug('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const hasAnyLeaf = tree.length > 0;

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
        <button
          type="button"
          className={mode === 'ai' ? 'tab active' : 'tab'}
          onClick={() => setMode('ai')}
        >
          Generar con IA
        </button>
      </div>

      {error && <p className="status error">{error}</p>}

      <div key={mode} className="form-panel">
        {mode === 'import' ? (
          <ImportPanel />
        ) : mode === 'ai' ? (
          <AiGeneratePanel />
        ) : mode === 'card' ? (
          <form className="form" onSubmit={handleCreateCard}>
            <label>
              Categoría
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {!hasAnyLeaf && (
                  <option value="">Sin categorías — creá una primero</option>
                )}
                {tree.map((node) =>
                  node.subs.length === 0 ? (
                    <option key={node.root._id} value={node.root._id}>
                      {node.root.icon} {node.root.name}
                    </option>
                  ) : (
                    <optgroup key={node.root._id} label={`${node.root.icon ?? ''} ${node.root.name}`.trim()}>
                      {node.subs.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.icon ?? node.root.icon} {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ),
                )}
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
              disabled={saving || !categoryId}
            >
              {saving ? 'Guardando...' : 'Guardar carta'}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={handleCreateCategory}>
            <label>
              Categoría padre (opcional)
              <select
                value={catParentSlug}
                onChange={(e) => setCatParentSlug(e.target.value)}
              >
                <option value="">Ninguna (categoría principal)</option>
                {tree.map((node) => (
                  <option key={node.root._id} value={node.root.slug}>
                    {node.root.icon} {node.root.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-hint">
              Elegí una categoría padre para crear una subcategoría dentro de
              ella (ej: "Phrasal Verbs" → "get").
            </p>

            <label>
              Nombre
              <input
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  setCatSlug(slugify(e.target.value));
                }}
                placeholder={catParentSlug ? 'e.g. get' : 'e.g. Phrasal Verbs'}
                required
              />
            </label>

            <label>
              Slug (URL)
              <input
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="e.g. get"
                required
              />
            </label>

            <label>
              Ícono (emoji)
              <input
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="e.g. 🏃"
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
              {saving
                ? 'Guardando...'
                : catParentSlug
                  ? 'Crear subcategoría'
                  : 'Crear categoría'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
