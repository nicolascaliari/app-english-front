import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import type { AppLanguage } from '../utils/languages';
import {
  APP_LANGUAGES,
  DEFAULT_NATIVE_LANGUAGE,
  GUEST_UI_LANGUAGE,
  isAppLanguage,
} from '../utils/languages';
import { catalog } from './catalog';
import type { MessageKey, UiMode } from './types';

const UI_MODE_KEY = 'flashcards_ui_mode';
const GUEST_LANG_KEY = 'flashcards_guest_ui_lang';

type Vars = Record<string, string | number>;

interface I18nContextValue {
  language: AppLanguage;
  /** El idioma elegido antes de entrar, si se eligió alguno. */
  guestLanguage: AppLanguage | null;
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
  /** Temporary override (e.g. while picking native language on register). */
  setGuestLanguage: (lang: AppLanguage | null) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  /**
   * Traduce en un idioma puntual, sin importar el de la interfaz. Es para
   * hablarle a alguien en el idioma que acaba de pedir, cuando la interfaz
   * todavía está en otro.
   */
  translateIn: (language: AppLanguage, key: MessageKey, vars?: Vars) => string;
  languageName: (code: AppLanguage) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_NATIVE_LANGUAGE;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const raw of candidates) {
    const code = raw.toLowerCase().split('-')[0];
    if (isAppLanguage(code)) return code;
  }
  return DEFAULT_NATIVE_LANGUAGE;
}

function readUiMode(): UiMode {
  const raw = localStorage.getItem(UI_MODE_KEY);
  return raw === 'target' ? 'target' : 'native';
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [uiMode, setUiModeState] = useState<UiMode>(() => readUiMode());
  const [guestLanguage, setGuestLanguageState] = useState<AppLanguage | null>(
    () => {
      const stored = localStorage.getItem(GUEST_LANG_KEY);
      return isAppLanguage(stored) ? stored : null;
    },
  );

  const setUiMode = useCallback((mode: UiMode) => {
    localStorage.setItem(UI_MODE_KEY, mode);
    setUiModeState(mode);
  }, []);

  const setGuestLanguage = useCallback((lang: AppLanguage | null) => {
    if (lang) {
      localStorage.setItem(GUEST_LANG_KEY, lang);
    } else {
      localStorage.removeItem(GUEST_LANG_KEY);
    }
    setGuestLanguageState(lang);
  }, []);

  const language: AppLanguage = useMemo(() => {
    if (user) {
      // Cuenta nueva que todavía no eligió idioma: se usa el que está eligiendo
      // en el modal (o el del navegador), no el nativo por defecto.
      if (user.needsLanguageSetup) {
        return guestLanguage ?? detectBrowserLanguage();
      }
      const preferred =
        uiMode === 'target' ? user.targetLanguage : user.nativeLanguage;
      return APP_LANGUAGES.includes(preferred)
        ? preferred
        : user.nativeLanguage;
    }
    // Sin sesión no adivinamos por navegador: se muestra inglés hasta que el
    // visitante elija otro idioma en el login.
    return guestLanguage ?? GUEST_UI_LANGUAGE;
  }, [user, uiMode, guestLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => {
      const table = catalog[language] ?? catalog.en;
      const fallback = catalog.en[key];
      return interpolate(table[key] ?? fallback ?? key, vars);
    },
    [language],
  );

  const translateIn = useCallback(
    (target: AppLanguage, key: MessageKey, vars?: Vars) => {
      const table = catalog[target] ?? catalog.en;
      return interpolate(table[key] ?? catalog.en[key] ?? key, vars);
    },
    [],
  );

  const languageName = useCallback(
    (code: AppLanguage) => t(`lang.${code}` as MessageKey),
    [t],
  );

  const value = useMemo(
    () => ({
      language,
      guestLanguage,
      uiMode,
      setUiMode,
      setGuestLanguage,
      t,
      translateIn,
      languageName,
    }),
    [
      language,
      guestLanguage,
      uiMode,
      setUiMode,
      setGuestLanguage,
      t,
      translateIn,
      languageName,
    ],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
