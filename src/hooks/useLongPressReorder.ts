import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

// Tiempo que hay que mantener presionado antes de poder arrastrar.
const HOLD_MS = 350;
// Si el dedo se mueve más que esto antes de HOLD_MS, es un scroll y no un arrastre.
const MOVE_TOLERANCE_PX = 8;

interface Options<T> {
  items: T[];
  getId: (item: T) => string;
  enabled: boolean;
  /** Se llama en vivo mientras se arrastra. */
  onChange: (items: T[]) => void;
  /** Se llama al soltar, solo si el orden cambió. */
  onCommit: (items: T[], previous: T[]) => void;
}

interface Session<T> {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  timer: number;
  dragging: boolean;
  initial: T[];
  cleanup: () => void;
}

/**
 * Reordenar una lista manteniendo presionado un elemento y arrastrándolo.
 * Cada `<li>` debe llevar `data-reorder-id` y los props de `itemProps(id)`.
 */
export function useLongPressReorder<T>({ items, getId, enabled, onChange, onCommit }: Options<T>) {
  const listRef = useRef<HTMLUListElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Una vez que se arrastró, se apaga la animación de entrada: mover nodos del DOM la reinicia.
  const [hasDragged, setHasDragged] = useState(false);
  const session = useRef<Session<T> | null>(null);
  const suppressClick = useRef(false);
  const latest = useRef({ items, getId, onChange, onCommit });

  useEffect(() => {
    latest.current = { items, getId, onChange, onCommit };
  });

  useEffect(() => {
    // Mientras se arrastra, evita que el navegador haga scroll con el dedo.
    // Tiene que estar registrado antes del toque y no ser pasivo.
    const blockScroll = (e: TouchEvent) => {
      if (session.current?.dragging) e.preventDefault();
    };
    document.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      document.removeEventListener('touchmove', blockScroll);
      session.current?.cleanup();
    };
  }, []);

  const moveTo = (x: number, y: number) => {
    const s = session.current;
    const list = listRef.current;
    if (!s || !list) return;
    const { items: current, getId: idOf, onChange: change } = latest.current;

    const target = Array.from(list.children).find((el) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) as HTMLElement | undefined;
    const targetId = target?.dataset.reorderId;
    if (!targetId || targetId === s.id) return;

    const from = current.findIndex((item) => idOf(item) === s.id);
    const to = current.findIndex((item) => idOf(item) === targetId);
    if (from < 0 || to < 0) return;

    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    change(next);
  };

  const finish = (commit: boolean) => {
    const s = session.current;
    if (!s) return;
    s.cleanup();
    if (!s.dragging) return;

    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);
    setDraggingId(null);

    const { items: current, getId: idOf, onCommit: done } = latest.current;
    const changed = current.some((item, i) => idOf(item) !== idOf(s.initial[i]));
    if (commit && changed) done(current, s.initial);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>, id: string) => {
    if (!enabled || session.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Los botones dentro de la tarjeta (borrar) mantienen su comportamiento.
    if ((e.target as Element).closest('button')) return;

    const handleMove = (ev: globalThis.PointerEvent) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pointerId) return;
      if (!s.dragging) {
        if (Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY) > MOVE_TOLERANCE_PX) {
          finish(false);
        }
        return;
      }
      ev.preventDefault();
      moveTo(ev.clientX, ev.clientY);
    };
    const handleUp = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === session.current?.pointerId) finish(true);
    };

    const s: Session<T> = {
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      initial: latest.current.items,
      timer: window.setTimeout(() => {
        s.dragging = true;
        setDraggingId(id);
        setHasDragged(true);
        navigator.vibrate?.(20);
      }, HOLD_MS),
      cleanup: () => {
        window.clearTimeout(s.timer);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        session.current = null;
      },
    };
    session.current = s;
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  const itemProps = (id: string) => ({
    'data-reorder-id': id,
    onPointerDown: (e: PointerEvent<HTMLElement>) => onPointerDown(e, id),
    // El click que sigue a soltar no debe abrir el mazo.
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // Android abre el menú contextual del enlace con la pulsación larga.
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      if (enabled) e.preventDefault();
    },
    onDragStart: (e: MouseEvent<HTMLElement>) => e.preventDefault(),
  });

  return { listRef, draggingId, hasDragged, itemProps };
}
