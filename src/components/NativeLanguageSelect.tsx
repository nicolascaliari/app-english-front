import { useI18n } from '../i18n/I18nProvider';
import type { AppLanguage } from '../utils/languages';
import { LANGUAGE_ENDONYMS, NATIVE_LANGUAGES } from '../utils/languages';

interface Props {
  value: AppLanguage;
  onChange: (value: AppLanguage) => void;
  disabled?: boolean;
}

/**
 * Selector del idioma nativo. Muestra cada idioma escrito en sí mismo para
 * que se reconozca aunque la interfaz esté, por ahora, en otra lengua.
 */
export function NativeLanguageSelect({ value, onChange, disabled = false }: Props) {
  const { t } = useI18n();

  return (
    <label>
      {t('languages.native')}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AppLanguage)}
        disabled={disabled}
        required
      >
        {NATIVE_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_ENDONYMS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
