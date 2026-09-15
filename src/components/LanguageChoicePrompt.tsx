import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import { LANGUAGE_ENDONYMS } from '../utils/languages';
import { pendingLanguageChoice } from '../utils/languageChoice';
import { ModalPortal } from './ModalPortal';

/**
 * Pregunta qué hacer cuando el idioma elegido en el login no es el de la
 * cuenta. Va antes que las guías: no tiene sentido leer la bienvenida en un
 * idioma que estás por cambiar.
 *
 * El texto se muestra en el idioma recién elegido, no en el de la interfaz.
 * Quien pidió ruso porque no lee español no podría entender la pregunta.
 */
export function LanguageChoicePrompt() {
  const { user, updateProfile } = useAuth();
  const { guestLanguage, setGuestLanguage, uiMode, setUiMode, translateIn } =
    useI18n();
  const [saving, setSaving] = useState(false);

  const chosen = pendingLanguageChoice(user ?? null, guestLanguage, uiMode);
  if (!user || !chosen) return null;

  const current = user.nativeLanguage;
  const names = {
    chosen: LANGUAGE_ENDONYMS[chosen],
    current: LANGUAGE_ENDONYMS[current],
  };

  const accept = async () => {
    setSaving(true);
    try {
      if (chosen === 'en') {
        setUiMode('target');
      } else {
        await updateProfile({ nativeLanguage: chosen });
      }
      setGuestLanguage(null);
    } catch {
      // Si falla, se deja la elección guardada para volver a ofrecerla.
      setSaving(false);
    }
  };

  // Al quedarse con el de la cuenta, el login también pasa a mostrarse así.
  const keep = () => setGuestLanguage(current);

  return (
    <ModalPortal>
      <div className="modal-overlay">
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-choice-title"
        >
          <h2 className="modal-title" id="language-choice-title">
            {translateIn(chosen, 'languageChoice.title')}
          </h2>
          <div className="modal-body">
            <p>
              {translateIn(
                chosen,
                chosen === 'en'
                  ? 'languageChoice.bodyInterface'
                  : 'languageChoice.body',
                names,
              )}
            </p>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={keep}
              disabled={saving}
            >
              {translateIn(chosen, 'languageChoice.keep', names)}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void accept()}
              disabled={saving}
              autoFocus
            >
              {translateIn(chosen, 'languageChoice.switch', names)}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
