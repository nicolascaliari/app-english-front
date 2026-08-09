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
  isAppLanguage,
} from '../utils/languages';
import { catalog } from './catalog';
import type { MessageKey, UiMode } from './types';

const UI_MODE_KEY = 'flashcards_ui_mode';
const GUEST_LANG_KEY = 'flashcards_guest_ui_lang';

type Vars = Record<string, string | number>;

interface I18nContextValue {
  language: AppLanguage;
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
  /** Temporary override (e.g. while picking native language on register). */
  setGuestLanguage: (lang: AppLanguage | null) => void;
  t: (key: MessageKey, vars?: Vars) => string;
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
      const preferred =
        uiMode === 'target' ? user.targetLanguage : user.nativeLanguage;
      return APP_LANGUAGES.includes(preferred)
        ? preferred
        : user.nativeLanguage;
    }
    return guestLanguage ?? detectBrowserLanguage();
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

  const languageName = useCallback(
    (code: AppLanguage) => t(`lang.${code}` as MessageKey),
    [t],
  );

  const value = useMemo(
    () => ({
      language,
      uiMode,
      setUiMode,
      setGuestLanguage,
      t,
      languageName,
    }),
    [language, uiMode, setUiMode, setGuestLanguage, t, languageName],
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
