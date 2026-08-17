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
export const DEFAULT_TARGET_LANGUAGE: AppLanguage = 'en';

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
