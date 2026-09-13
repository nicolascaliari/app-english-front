import { useEffect, useRef } from 'react';

/**
 * Botón oficial de Google Identity Services.
 *
 * Google renderiza el botón dentro del div y, cuando el usuario elige su
 * cuenta, devuelve un ID token (`credential`) que el backend verifica contra
 * las claves públicas de Google. El token nunca se interpreta acá.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** Sin client id no hay nada que mostrar: el login con Google queda oculto. */
export const googleAuthEnabled = Boolean(CLIENT_ID);

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      shape?: string;
      text?: string;
      width?: number;
      logo_alignment?: string;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

/** Carga el script de Google una sola vez por sesión de página. */
function loadGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('google script')));
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('google script'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface Props {
  onCredential: (credential: string) => void;
  onError: () => void;
  /** 'signin_with' para login, 'signup_with' para registro. */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export function GoogleSignInButton({ onCredential, onError, text = 'signin_with' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // En un ref para que el callback de Google use siempre el handler actual
  // sin tener que re-inicializar el botón en cada render.
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const id = window.google?.accounts?.id;
        if (!id) {
          onErrorRef.current();
          return;
        }

        id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current(response.credential);
            } else {
              onErrorRef.current();
            }
          },
        });

        id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'center',
          width: 320,
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current();
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;

  return <div className="google-signin" ref={containerRef} />;
}
