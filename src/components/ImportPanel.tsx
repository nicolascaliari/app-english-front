import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  downloadImportTemplate,
  parseExcelFile,
  type ParsedExcel,
} from '../utils/excelImport';

export function ImportPanel() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [fileName, setFileName] = useState('');
  const [importCategories, setImportCategories] = useState(true);
  const [importFlashcards, setImportFlashcards] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const hasCategories = (parsed?.categories.length ?? 0) > 0;
  const hasFlashcards = (parsed?.flashcards.length ?? 0) > 0;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const data = parseExcelFile(buffer);
      setParsed(data);
      setImportCategories(data.categories.length > 0);
      setImportFlashcards(data.flashcards.length > 0);

      if (data.categories.length === 0 && data.flashcards.length === 0) {
        setError(
          `No se encontraron datos. Hojas detectadas: ${data.sheetNames.join(', ')}. ` +
            'Usá hojas llamadas "categorias" y/o "palabras".',
        );
      }
    } catch {
      setError('No se pudo leer el archivo Excel.');
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const payload: Parameters<typeof api.importData>[0] = {};
      if (importCategories && parsed.categories.length > 0) {
        payload.categories = parsed.categories;
      }
      if (importFlashcards && parsed.flashcards.length > 0) {
        payload.flashcards = parsed.flashcards;
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
        Subí un Excel con hojas <strong>categorias</strong> y/o{' '}
        <strong>palabras</strong>. Podés importar una, otra, o ambas.
      </p>

      <button
        type="button"
        className="btn btn-secondary import-template-btn"
        onClick={downloadImportTemplate}
      >
        Descargar plantilla
      </button>

      <div className="import-dropzone">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="import-file-input"
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileName || 'Elegir archivo Excel'}
        </button>
      </div>

      {parsed && (hasCategories || hasFlashcards) && (
        <div className="import-preview">
          <p className="import-preview-title">Vista previa</p>

          {hasCategories && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importCategories}
                onChange={(e) => setImportCategories(e.target.checked)}
              />
              Categorías ({parsed.categories.length})
            </label>
          )}

          {hasFlashcards && (
            <label className="import-checkbox">
              <input
                type="checkbox"
                checked={importFlashcards}
                onChange={(e) => setImportFlashcards(e.target.checked)}
              />
              Palabras ({parsed.flashcards.length})
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
                  {parsed.categories.slice(0, 5).map((c) => (
                    <tr key={c.slug}>
                      <td>{c.name}</td>
                      <td>{c.slug}</td>
                      <td>{c.icon ?? '—'}</td>
                      <td>{c.parent ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.categories.length > 5 && (
                <p className="import-more">
                  +{parsed.categories.length - 5} más...
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
                  </tr>
                </thead>
                <tbody>
                  {parsed.flashcards.slice(0, 5).map((f, i) => (
                    <tr key={`${f.category}-${f.front}-${i}`}>
                      <td>{f.category}</td>
                      <td>{f.subcategory ?? '—'}</td>
                      <td>{f.front}</td>
                      <td>{f.back}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.flashcards.length > 5 && (
                <p className="import-more">
                  +{parsed.flashcards.length - 5} más...
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
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
      )}

      {result && <p className="status success">{result}</p>}
      {error && <p className="status error">{error}</p>}

      <details className="import-format-help">
        <summary>Formato del Excel</summary>
        <div className="import-format-body">
          <p>
            <strong>Hoja "categorias":</strong> nombre, slug (opcional), icono,
            color, padre (opcional)
          </p>
          <p>
            <strong>Hoja "palabras":</strong> categoria (nombre o slug),
            subcategoria (opcional), ingles, espanol, ejemplo, pronunciacion,
            dificultad (easy/medium/hard)
          </p>
          <p>
            Las categorías duplicadas (mismo slug dentro del mismo padre) se
            omiten. Si completás "padre" en la hoja de categorías, esa fila se
            crea como subcategoría (ej: categoría "get" con padre
            "phrasal-verbs"). Las palabras requieren que la categoría (y
            subcategoría, si se indica) exista o se importe en el mismo
            archivo.
          </p>
        </div>
      </details>
    </div>
  );
}
