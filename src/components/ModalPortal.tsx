import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Cuelga el modal de <body> en vez de dejarlo dentro de la página.
 *
 * `position: fixed` no se posiciona respecto de la pantalla si algún ancestro
 * tiene transform, filter o backdrop-filter: ese ancestro pasa a ser el marco
 * de referencia. Con una página larga, el overlay terminaba midiendo lo que
 * mide el documento y el modal aparecía centrado ahí, fuera de la vista.
 *
 * Los eventos siguen burbujeando por el árbol de React, así que los onClick
 * de cierre funcionan igual estando el nodo en otro lado del DOM.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
