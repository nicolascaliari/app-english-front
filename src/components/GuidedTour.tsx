import { useLayoutEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import { pendingTourSteps, useGuides } from '../utils/guides';
import { pendingLanguageChoice } from '../utils/languageChoice';
import { localize } from '../utils/localizedText';
import { ModalPortal } from './ModalPortal';

const BUBBLE_WIDTH = 300;
/** Aire mínimo contra los bordes de la pantalla. */
const GUTTER = 16;
/** Separación entre el elemento iluminado y el globo. */
const GAP = 14;
/** Cuánto se agranda el recorte alrededor del elemento. */
const PADDING = 6;

interface Spot {
  guideId: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Tour de primera vez sobre los elementos de la interfaz.
 *
 * Los carteles anclados (`anchor` en el documento "guides") no tienen pantalla
 * propia: señalan algo que ya está a la vista, como el botón + o la racha. El
 * documento nombra el elemento y acá se traduce a un selector `[data-tour]`;
 * esa correspondencia vive en el código porque depende del marcado.
 *
 * Corre solo en inicio, y solo cuando no quedó ningún modal pendiente, para no
 * apilar dos cosas encima del usuario.
 */
export function GuidedTour() {
  const { user, markGuideSeen } = useAuth();
  const { t, language, guestLanguage, uiMode } = useI18n();
  const { pathname } = useLocation();

  const active =
    Boolean(user) &&
    user?.role !== 'admin' &&
    !user?.needsLanguageSetup &&
    !pendingLanguageChoice(user ?? null, guestLanguage, uiMode);
  const guides = useGuides(active);
  const [spot, setSpot] = useState<Spot | null>(null);

  const seenGuides = user?.seenGuides;
  const anchored = useMemo(
    () => (guides ?? []).filter((guide) => guide.anchor),
    [guides],
  );
  const steps = useMemo(
    () => pendingTourSteps(guides ?? [], pathname, seenGuides ?? []),
    [guides, pathname, seenGuides],
  );
  const step = steps[0] ?? null;
  const running = active && Boolean(step);

  // useLayoutEffect y no useEffect: corre antes de pintar, así el globo entra
  // en el mismo cuadro en que se cierra el modal de bienvenida, sin que se vea
  // la pantalla vacía en el medio.
  useLayoutEffect(() => {
    if (!running || !step) {
      setSpot(null);
      return;
    }

    let frame = 0;
    const resolve = () => {
      const element = document.querySelector(`[data-tour='${step.anchor}']`);
      const box = element?.getBoundingClientRect();

      // Si todavía no se puede medir, la pantalla sigue acomodándose: se
      // reintenta en el próximo cuadro. Saltear el paso haría desaparecer un
      // cartel sin que se note, que es justo lo que pasaba con el botón +.
      if (!box || (box.width === 0 && box.height === 0)) {
        frame = requestAnimationFrame(resolve);
        return;
      }

      setSpot({
        guideId: step.id,
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    };

    resolve();
    window.addEventListener('resize', resolve);
    window.addEventListener('scroll', resolve, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resolve);
      window.removeEventListener('scroll', resolve, true);
    };
  }, [running, step]);

  if (!running || !step || !spot || spot.guideId !== step.id) return null;

  // El globo va del lado donde hay lugar: debajo si el elemento está arriba.
  const below = spot.top + spot.height / 2 < window.innerHeight / 2;
  const width = Math.min(BUBBLE_WIDTH, window.innerWidth - GUTTER * 2);
  const centre = spot.left + spot.width / 2;
  const left = Math.min(
    Math.max(centre - width / 2, GUTTER),
    Math.max(window.innerWidth - width - GUTTER, GUTTER),
  );
  // La flecha apunta al elemento aunque el globo se haya corrido por el borde.
  const arrow = Math.min(Math.max(centre - left, 18), width - 18);

  const isLast = steps.length === 1;
  const position = anchored.findIndex((guide) => guide.id === step.id) + 1;

  return (
    <ModalPortal>
      <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div
          className="tour-hole"
          style={{
            top: spot.top - PADDING,
            left: spot.left - PADDING,
            width: spot.width + PADDING * 2,
            height: spot.height + PADDING * 2,
          }}
        />
        <div
          className={`tour-bubble${below ? '' : ' tour-bubble--above'}`}
          style={
            below
              ? { top: spot.top + spot.height + GAP, left, width }
              : { bottom: window.innerHeight - spot.top + GAP, left, width }
          }
        >
          <span className="tour-arrow" style={{ left: arrow }} aria-hidden="true" />
          <h2 className="tour-title" id="tour-title">
            {localize(step.title, language)}
          </h2>
          <p className="tour-body">{localize(step.body, language)}</p>
          <div className="tour-actions">
            <span className="tour-progress">
              {t('tour.progress', { current: position, total: anchored.length })}
            </span>
            {!isLast && (
              <button
                type="button"
                className="tour-skip"
                onClick={() => steps.forEach((guide) => markGuideSeen(guide.id))}
              >
                {t('tour.skip')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => markGuideSeen(step.id)}
              autoFocus
            >
              {isLast ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
