import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Guide } from '../types';

let pending: Promise<Guide[]> | null = null;

/**
 * Los carteles, pedidos una sola vez por sesión y compartidos entre el modal
 * de sección y el tour. Si la petición falla se devuelve una lista vacía: sin
 * guías la app funciona igual y no vale la pena molestar con un error.
 *
 * El fallo no se cachea. Guardar la promesa rechazada dejaba la app sin
 * carteles hasta recargar, y alcanzaba con que el primer pedido saliera antes
 * de tiempo o con el backend frío.
 */
export function loadGuides(): Promise<Guide[]> {
  pending ??= api.getGuides().catch(() => {
    pending = null;
    return [];
  });
  return pending;
}

export function useGuides(active: boolean): Guide[] | null {
  const [guides, setGuides] = useState<Guide[] | null>(null);

  // Mientras no haya lista se vuelve a intentar, así un pedido que salió antes
  // de tiempo no deja la sesión entera sin carteles.
  useEffect(() => {
    if (!active || guides) return;

    let cancelled = false;
    void loadGuides().then((data) => {
      if (!cancelled) setGuides(data);
    });

    return () => {
      cancelled = true;
    };
  }, [active, guides]);

  return guides;
}

/** El tour vive en inicio: es la pantalla donde están todos los elementos. */
export const TOUR_ROUTE = '/';

/**
 * Los pasos del tour que faltan, en orden. La bienvenida va primero: hasta
 * cerrarla, el tour no arranca.
 */
export function pendingTourSteps(
  guides: Guide[],
  pathname: string,
  seenGuides: string[],
): Guide[] {
  if (pathname !== TOUR_ROUTE) return [];

  const welcome = guides.find((guide) => !guide.anchor && !guide.route);
  if (welcome && !seenGuides.includes(welcome.id)) return [];

  return guides.filter(
    (guide) => guide.anchor && !seenGuides.includes(guide.id),
  );
}

/**
 * El cartel de pantalla que toca mostrar ahora, o null si no hay ninguno.
 *
 * Solo coincidencias exactas de ruta: en medio de una sesión de práctica o
 * leyendo un libro, un modal sería una molestia.
 *
 * El orden es bienvenida → tour → cartel de pantalla. El tour va antes porque
 * ubica al usuario en lo que ya tiene a la vista; el cartel de pantalla
 * profundiza después.
 */
export function pendingModal(
  guides: Guide[],
  pathname: string,
  seenGuides: string[],
): Guide | null {
  const modals = guides.filter((guide) => !guide.anchor);

  const section = modals.find((guide) => guide.route === pathname);
  if (!section) return null;

  const welcome = modals.find((guide) => !guide.route);
  if (welcome && !seenGuides.includes(welcome.id)) return welcome;

  if (pendingTourSteps(guides, pathname, seenGuides).length > 0) return null;

  return seenGuides.includes(section.id) ? null : section;
}
