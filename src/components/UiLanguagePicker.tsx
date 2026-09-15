import { useI18n } from '../i18n/I18nProvider';
import type { AppLanguage } from '../utils/languages';
import { APP_LANGUAGES, LANGUAGE_ENDONYMS } from '../utils/languages';

/**
 * Cambia el idioma de la interfaz antes de iniciar sesión. Sin sesión la app
 * arranca en inglés, así que los nombres van escritos en su propio idioma:
 * hay que poder reconocer el propio sin entender el resto de la pantalla.
 */
export function UiLanguagePicker() {
  const { language, setGuestLanguage, t } = useI18n();

  return (
    <div className="ui-language-picker">
      <span className="ui-language-picker-icon" aria-hidden="true">
        🌐
      </span>
      <select
        id="ui-language"
        aria-label={t('languages.ui')}
        value={language}
        onChange={(e) => setGuestLanguage(e.target.value as AppLanguage)}
      >
        {APP_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_ENDONYMS[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
