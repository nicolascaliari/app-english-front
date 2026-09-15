import type { LocalizedText } from '../types';
import type { AppLanguage } from './languages';

/**
 * El texto en el idioma de la UI. Si falta, inglés antes que cualquier otro:
 * la app enseña inglés, así que es el único idioma que todos los que la usan
 * tienen en común. Sin esa preferencia el orden de las claves decide, y a un
 * ruso le termina saliendo el español.
 */
export function localize(text: LocalizedText, language: AppLanguage): string {
  return text[language] ?? text.en ?? Object.values(text).find(Boolean) ?? '';
}
