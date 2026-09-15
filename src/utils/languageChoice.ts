import type { UiMode } from '../i18n/types';
import type { AppLanguage } from './languages';

interface ChoiceUser {
  nativeLanguage: AppLanguage;
  needsLanguageSetup: boolean;
}

/**
 * El idioma que se eligió en el login cuando no coincide con el de la cuenta,
 * o null si no hay nada que preguntar.
 *
 * Se pregunta en vez de aplicarlo solo, porque `nativeLanguage` no es nada más
 * el idioma de la interfaz: el backend lo usa para las explicaciones de la IA
 * y las traducciones. Cambiarlo sin avisar en un dispositivo compartido
 * dejaría las cartas de otro traducidas al idioma equivocado.
 */
export function pendingLanguageChoice(
  user: ChoiceUser | null,
  guestLanguage: AppLanguage | null,
  uiMode: UiMode,
): AppLanguage | null {
  if (!user || !guestLanguage || user.needsLanguageSetup) return null;

  // El inglés no puede ser idioma nativo, porque es el que se aprende. Ahí lo
  // que se ofrece es el modo de interfaz en inglés, que ya existe.
  if (guestLanguage === 'en') {
    return uiMode === 'target' ? null : 'en';
  }

  return guestLanguage === user.nativeLanguage ? null : guestLanguage;
}
