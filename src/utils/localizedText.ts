import type { LocalizedText } from '../types';
import type { AppLanguage } from './languages';

/** El texto en el idioma de la UI o, si no está cargado, el primero que haya. */
export function localize(text: LocalizedText, language: AppLanguage): string {
  return text[language] ?? Object.values(text).find(Boolean) ?? '';
}
