import type { AppLanguage } from '../utils/languages';
import { APP_LANGUAGES } from '../utils/languages';
import { useI18n } from '../i18n/I18nProvider';

interface Props {
  nativeLanguage: AppLanguage;
  targetLanguage: AppLanguage;
  onNativeChange: (value: AppLanguage) => void;
  onTargetChange: (value: AppLanguage) => void;
  disabled?: boolean;
}

export function LanguagePairFields({
  nativeLanguage,
  targetLanguage,
  onNativeChange,
  onTargetChange,
  disabled = false,
}: Props) {
  const { t, languageName } = useI18n();

  return (
    <div className="language-pair">
      <label>
        {t('languages.native')}
        <select
          value={nativeLanguage}
          onChange={(e) => onNativeChange(e.target.value as AppLanguage)}
          disabled={disabled}
          required
        >
          {APP_LANGUAGES.map((code) => (
            <option key={code} value={code} disabled={code === targetLanguage}>
              {languageName(code)}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t('languages.target')}
        <select
          value={targetLanguage}
          onChange={(e) => onTargetChange(e.target.value as AppLanguage)}
          disabled={disabled}
          required
        >
          {APP_LANGUAGES.map((code) => (
            <option key={code} value={code} disabled={code === nativeLanguage}>
              {languageName(code)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
