import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useI18n } from '../i18n/I18nProvider';
import type { ImageCandidate } from '../types';

interface Props {
  /**
   * Escena sugerida por la IA. `''` significa que decidió que la palabra no
   * se ilustra: no se busca sola, pero el usuario puede escribir la suya.
   */
  suggestedQuery: string;
  /** URL elegida, o undefined para "sin imagen". */
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  /**
   * Al crear una tarjeta conviene preseleccionar la primera foto: es la que
   * se hubiera guardado sola. Al editar una que ya tiene foto, no, porque
   * pisaría en silencio la que el usuario eligió antes.
   */
  autoSelectFirst?: boolean;
}

/**
 * Tira de fotos candidatas + la opción de dejar la tarjeta sin foto.
 *
 * El query arranca en la escena que escribió la IA (no en la palabra: buscar
 * "give up" en un banco de fotos devuelve cualquier cosa) y es editable,
 * porque cuando el resultado no convence, reformular la búsqueda es la única
 * salida que no depende de adivinar de nuevo.
 */
export function ImagePicker({
  suggestedQuery,
  value,
  onChange,
  autoSelectFirst = true,
}: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState(suggestedQuery);
  const [photos, setPhotos] = useState<ImageCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // La foto que ya tenía la tarjeta al abrir el selector: se muestra como una
  // opción más para que se vea cuál está elegida, aunque no venga en la tanda.
  const [initialUrl] = useState(value);
  const autoPickRef = useRef(autoSelectFirst);
  // Sin esto, una búsqueda lenta que vuelve tarde pisa a una más nueva.
  const runIdRef = useRef(0);

  const runSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setPhotos([]);
      return;
    }
    const runId = ++runIdRef.current;
    setLoading(true);
    setFailed(false);
    try {
      const { photos: found } = await api.searchImages(trimmed);
      if (runId !== runIdRef.current) return;
      setPhotos(found);
      if (autoPickRef.current) {
        onChange(found[0]?.url);
        autoPickRef.current = false;
      }
    } catch {
      if (runId !== runIdRef.current) return;
      setPhotos([]);
      setFailed(true);
    } finally {
      if (runId === runIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    autoPickRef.current = autoSelectFirst;
    setQuery(suggestedQuery);
    if (suggestedQuery.trim()) {
      void runSearch(suggestedQuery);
    } else {
      // La IA dijo que no lleva foto: se respeta y no se gasta una búsqueda.
      autoPickRef.current = false;
      setPhotos([]);
      if (autoSelectFirst) onChange(undefined);
    }
    // Se re-busca solo cuando cambia la palabra que se está guardando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedQuery]);

  const extras =
    initialUrl && !photos.some((p) => p.url === initialUrl)
      ? [{ url: initialUrl, thumbUrl: initialUrl, alt: '', photographer: '' }]
      : [];
  const tiles = [...extras, ...photos];

  return (
    <div className="image-picker">
      <span className="image-picker-label">{t('image.label')}</span>

      <div className="image-picker-strip">
        <button
          type="button"
          className={`image-picker-tile image-picker-none${value === undefined ? ' is-selected' : ''}`}
          onClick={() => onChange(undefined)}
          aria-pressed={value === undefined}
        >
          <span aria-hidden="true">✕</span>
          <span className="image-picker-none-text">{t('image.none')}</span>
        </button>

        {tiles.map((photo) => (
          <button
            key={photo.url}
            type="button"
            className={`image-picker-tile${value === photo.url ? ' is-selected' : ''}`}
            onClick={() => onChange(photo.url)}
            aria-pressed={value === photo.url}
            title={
              photo.photographer
                ? t('image.by', { author: photo.photographer })
                : photo.alt
            }
          >
            <img src={photo.thumbUrl} alt={photo.alt} loading="lazy" />
          </button>
        ))}
      </div>

      {loading && <p className="field-hint">{t('image.searching')}</p>}
      {!loading && failed && <p className="field-hint">{t('image.unavailable')}</p>}
      {!loading && !failed && tiles.length === 0 && query.trim() !== '' && (
        <p className="field-hint">{t('image.empty')}</p>
      )}

      {/* Va sin <form>: este selector se usa dentro de otros formularios y
          anidarlos es HTML inválido. Enter dispara la búsqueda a mano. */}
      <div className="image-picker-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            void runSearch(query);
          }}
          placeholder={t('image.queryPlaceholder')}
          aria-label={t('image.queryPlaceholder')}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void runSearch(query)}
          disabled={loading || query.trim() === ''}
        >
          {t('image.search')}
        </button>
      </div>
    </div>
  );
}
