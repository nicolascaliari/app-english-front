import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ImportPayload } from '../types';

const EXAMPLE_PROMPTS = [
  'Agregá 20 palabras de la cocina, nivel medio, con ejemplo',
  '10 phrasal verbs con get, difícil, con pronunciación IPA',
  'Creá la categoría Deportes con 15 palabras fáciles',
];

export function AiGeneratePanel() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState<ImportPayload | null>(null);
  const [importCategories, setImportCategories] = useState(true);
  const [importFlashcards, setImportFlashcards] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const hasCategories = (generated?.categories?.length ?? 0) > 0;
  const hasFlashcards = (generated?.flashcards?.length ?? 0) > 0;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      setError('Escribí un pedido de al menos 3 caracteres.');
      return;
    }

    setGenerating(true);
    setError('');
    setResult(null);
    setGenerated(null);

    try {
      const data = await api.generateWithAi(trimmed);
      setGenerated(data);
      setImportCategories((data.categories?.length ?? 0) > 0);
      setImportFlashcards((data.flashcards?.length ?? 0) > 0);

      if (!data.categories?.length && !data.flashcards?.length) {
        setError(
          'La IA no generó datos. Probá ser más específico (categoría, cantidad, dificultad).',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar');
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!generated) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const payload: ImportPayload = {};
      if (importCategories && generated.categories?.length) {
        payload.categories = generated.categories;
      }
      if (importFlashcards && generated.flashcards?.length) {
        payload.flashcards = generated.flashcards;
      }

      if (!payload.categories?.length && !payload.flashcards?.length) {
        setError('Seleccioná al menos un tipo de dato para importar.');
        return;
      }

      const res = await api.importData(payload);
      const parts: string[] = [];
      if (payload.categories?.length) {
        parts.push(
          `${res.categories.created} categoría(s) creada(s), ${res.categories.skipped} omitida(s)`,
        );
      }
      if (payload.flashcards?.length) {
        parts.push(
          `${res.flashcards.created} carta(s) creada(s), ${res.flashcards.skipped} omitida(s)`,
        );
      }
      setResult(parts.join('. ') + '.');

      if (res.flashcards.errors.length > 0) {
        setError(res.flashcards.errors.slice(0, 5).join('\n'));
      } else if (res.categories.created > 0 || res.flashcards.created > 0) {
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="import-panel">
      <p className="import-hint">
        Describí qué querés agregar en lenguaje natural. La IA genera una vista
        previa y vos confirmás antes de guardar.
      </p>

      <form className="ai-generate-form" onSubmit={handleGenerate}>
        <label>
          Pedido
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Agregá 20 palabras de la categoría casa, nivel medio, con ejemplo y pronunciación"
            rows={4}
            disabled={generating}
          />
        </label>

        <div className="ai-example-prompts">
          <span className="ai-example-label">Ejemplos:</span>
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              className="ai-example-btn"
              disabled={generating}
              onClick={() => setPrompt(example)}
            >
              {example}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={generating || prompt.trim().length < 3}
        >
          {generating ? 'Generando...' : 'Generar con IA'}
        </button>
      </form>

      {generated && (hasCategories || hasFlashcards) && (
        <div className="import-preview">
          <p className="import-preview-title">Vista previa</p>

          {hasCategories && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importCategories}
                onChange={(e) => setImportCategories(e.target.checked)}
              />
              Categorías ({generated.categories!.length})
            </label>
          )}

          {hasFlashcards && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importFlashcards}
                onChange={(e) => setImportFlashcards(e.target.checked)}
              />
              Palabras ({generated.flashcards!.length})
            </label>
          )}

          {hasCategories && importCategories && (
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Slug</th>
                    <th>Ícono</th>
                    <th>Padre</th>
                  </tr>
                </thead>
                <tbody>
                  {generated.categories!.slice(0, 5).map((c) => (
                    <tr key={c.slug}>
                      <td>{c.name}</td>
                      <td>{c.slug}</td>
                      <td>{c.icon ?? '—'}</td>
                      <td>{c.parent ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {generated.categories!.length > 5 && (
                <p className="import-more">
                  +{generated.categories!.length - 5} más...
                </p>
              )}
            </div>
          )}

          {hasFlashcards && importFlashcards && (
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Subcategoría</th>
                    <th>Inglés</th>
                    <th>Español</th>
                    <th>Dificultad</th>
                  </tr>
                </thead>
                <tbody>
                  {generated.flashcards!.slice(0, 5).map((f, i) => (
                    <tr key={`${f.category}-${f.front}-${i}`}>
                      <td>{f.category}</td>
                      <td>{f.subcategory ?? '—'}</td>
                      <td>{f.front}</td>
                      <td>{f.back}</td>
                      <td>{f.difficulty ?? 'medium'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {generated.flashcards!.length > 5 && (
                <p className="import-more">
                  +{generated.flashcards!.length - 5} más...
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            disabled={importing}
            onClick={handleImport}
          >
            {importing ? 'Guardando...' : 'Confirmar e importar'}
          </button>
        </div>
      )}

      {result && <p className="status success">{result}</p>}
      {error && <p className="status error">{error}</p>}

      <details className="import-format-help">
        <summary>Consejos para mejores resultados</summary>
        <div className="import-format-body">
          <p>
            Indicá la <strong>categoría</strong> (ej: casa, cocina, phrasal
            verbs), la <strong>cantidad</strong> de palabras y la{' '}
            <strong>dificultad</strong> (fácil, media, difícil).
          </p>
          <p>
            Podés pedir categorías nuevas, subcategorías, ejemplos en inglés y
            pronunciación IPA.
          </p>
          <p>
            Siempre revisá la vista previa antes de confirmar. Nada se guarda
            hasta que apretás &quot;Confirmar e importar&quot;.
          </p>
        </div>
      </details>
    </div>
  );
}
