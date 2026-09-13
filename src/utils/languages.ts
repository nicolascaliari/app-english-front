export type AppLanguage = 'en' | 'es' | 'pt' | 'fr' | 'it' | 'de' | 'ru' | 'pl';

export const APP_LANGUAGES: AppLanguage[] = [
  'en',
  'es',
  'pt',
  'fr',
  'it',
  'de',
  'ru',
  'pl',
];

export const APP_LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'Inglés',
  es: 'Español',
  pt: 'Portugués',
  fr: 'Francés',
  it: 'Italiano',
  de: 'Alemán',
  ru: 'Ruso',
  pl: 'Polaco',
};

/** BCP-47 tags for Web Speech API. */
export const APP_LANGUAGE_LOCALE: Record<AppLanguage, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  ru: 'ru-RU',
  pl: 'pl-PL',
};

export const DEFAULT_NATIVE_LANGUAGE: AppLanguage = 'es';
/** La app enseña solo inglés. */
export const DEFAULT_TARGET_LANGUAGE: AppLanguage = 'en';

/** Idiomas elegibles como nativo: todos menos inglés, que es el que se aprende. */
export const NATIVE_LANGUAGES: AppLanguage[] = APP_LANGUAGES.filter(
  (code) => code !== 'en',
);

/**
 * Nombre de cada idioma en ese mismo idioma. Sirve para elegirlo aunque la
 * interfaz esté en otra lengua: un ruso reconoce "Русский", no "Ruso".
 */
export const LANGUAGE_ENDONYMS: Record<AppLanguage, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  ru: 'Русский',
  pl: 'Polski',
};

/** Idioma nativo sugerido: el del navegador si la app lo tiene; si no, español. */
export function suggestedNativeLanguage(): AppLanguage {
  if (typeof navigator !== 'undefined') {
    for (const raw of [navigator.language, ...(navigator.languages ?? [])]) {
      const code = raw?.toLowerCase().split('-')[0];
      if (isAppLanguage(code) && code !== 'en') return code;
    }
  }
  return DEFAULT_NATIVE_LANGUAGE;
}

export const APP_LANGUAGE_FLAGS: Record<AppLanguage, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  it: '🇮🇹',
  de: '🇩🇪',
  ru: '🇷🇺',
  pl: '🇵🇱',
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === 'string' &&
    (APP_LANGUAGES as string[]).includes(value)
  );
}

export function normalizeAppLanguage(
  value: unknown,
  fallback: AppLanguage,
): AppLanguage {
  return isAppLanguage(value) ? value : fallback;
}

export function languageLabel(code: AppLanguage): string {
  return APP_LANGUAGE_LABELS[code];
}
