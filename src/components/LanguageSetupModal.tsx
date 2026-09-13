import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import type { AppLanguage } from '../utils/languages';
import {
  APP_LANGUAGE_FLAGS,
  LANGUAGE_ENDONYMS,
  NATIVE_LANGUAGES,
  suggestedNativeLanguage,
} from '../utils/languages';
import { Modal } from './Modal';

/**
 * Pregunta el idioma nativo a las cuentas creadas con Google, que no pasan por
 * el formulario de registro. No se puede cerrar sin elegir: sin ese dato la
 * interfaz y las traducciones de la IA saldrían en el idioma equivocado.
 */
export function LanguageSetupModal() {
  const { user, updateProfile } = useAuth();
  const { t, setGuestLanguage } = useI18n();
  const [selected, setSelected] = useState<AppLanguage>(() =>
    suggestedNativeLanguage(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pending = Boolean(user?.needsLanguageSetup) && user?.role !== 'admin';

  // El propio modal se traduce en vivo al idioma que se va eligiendo.
  useEffect(() => {
    if (pending) setGuestLanguage(selected);
  }, [pending, selected, setGuestLanguage]);

  if (!pending) return null;

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile({ nativeLanguage: selected });
      setGuestLanguage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      dismissible={false}
      title={t('languageSetup.title')}
      closeLabel={saving ? t('common.saving') : t('languageSetup.confirm')}
      onClose={() => void handleConfirm()}
    >
      <p>{t('languageSetup.body')}</p>
      <div className="language-setup-options" role="radiogroup">
        {NATIVE_LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={selected === code}
            className={`language-setup-option${selected === code ? ' language-setup-option--active' : ''}`}
            onClick={() => setSelected(code)}
            disabled={saving}
          >
            <span aria-hidden="true">{APP_LANGUAGE_FLAGS[code]}</span>
            <span>{LANGUAGE_ENDONYMS[code]}</span>
          </button>
        ))}
      </div>
      {error && <p className="status error">{error}</p>}
    </Modal>
  );
}
