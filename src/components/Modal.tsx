import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  closeLabel: string;
  onClose: () => void;
  /** Marca el diálogo como un error (borde y título en rojo). */
  tone?: 'error' | 'neutral';
  /**
   * Si es false, ni Escape ni el clic afuera lo cierran: solo el botón. Para
   * pasos que el usuario no puede saltear, como elegir su idioma.
   */
  dismissible?: boolean;
}

/**
 * Diálogo modal reutilizable. No usa <dialog> nativo para no depender del
 * soporte de showModal en WebKit, que es el navegador donde más se usa la app.
 */
export function Modal({
  open,
  title,
  children,
  closeLabel,
  onClose,
  tone = 'neutral',
  dismissible = true,
}: Props) {
  useEffect(() => {
    if (!open || !dismissible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      // Cerrar al tocar fuera, pero no cuando el clic nace dentro del diálogo.
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal${tone === 'error' ? ' modal--error' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 className="modal-title" id="modal-title">
          {title}
        </h2>
        <div className="modal-body">{children}</div>
        <button
          type="button"
          className="btn btn-primary btn--wide"
          onClick={onClose}
          autoFocus
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
