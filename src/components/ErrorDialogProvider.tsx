import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, AuthError } from '../api/client';
import { useI18n } from '../i18n/I18nProvider';
import { formatDuration } from '../utils/duration';
import { Modal } from './Modal';

interface ErrorDialogValue {
  /** Muestra un error de la API en el modal. `fallback` se usa si no trae mensaje. */
  showError: (error: unknown, fallback?: string) => void;
}

const ErrorDialogContext = createContext<ErrorDialogValue | null>(null);

interface DialogState {
  message: string;
  detail?: string;
}

export function ErrorDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const showError = useCallback(
    (error: unknown, fallback?: string) => {
      // La sesión expirada ya se maneja sola (redirige al login): un modal ahí
      // solo sería ruido encima de una pantalla que está por cambiar.
      if (error instanceof AuthError) return;

      const message =
        error instanceof Error && error.message
          ? error.message
          : (fallback ?? t('error.generic'));

      // Cuando es la cuota diaria, el backend manda cuánto falta y acá se
      // traduce a algo legible en el idioma del usuario.
      const detail =
        error instanceof ApiError && error.quota
          ? t('error.resetsIn', {
              time: formatDuration(error.quota.resetsInSeconds, t),
            })
          : undefined;

      setDialog({ message, detail });
    },
    [t],
  );

  const value = useMemo(() => ({ showError }), [showError]);

  return (
    <ErrorDialogContext.Provider value={value}>
      {children}
      <Modal
        open={dialog !== null}
        tone="error"
        title={t('error.title')}
        closeLabel={t('error.close')}
        onClose={() => setDialog(null)}
      >
        <p>{dialog?.message}</p>
        {dialog?.detail && <p className="modal-detail">{dialog.detail}</p>}
      </Modal>
    </ErrorDialogContext.Provider>
  );
}

export function useErrorDialog(): ErrorDialogValue {
  const ctx = useContext(ErrorDialogContext);
  if (!ctx) {
    throw new Error('useErrorDialog debe usarse dentro de ErrorDialogProvider');
  }
  return ctx;
}
