import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import { pendingModal, useGuides } from '../utils/guides';
import { pendingLanguageChoice } from '../utils/languageChoice';
import { localize } from '../utils/localizedText';
import { Modal } from './Modal';

/**
 * Guía de bienvenida, una vez por sección y por cuenta.
 *
 * El contenido y el disparador salen de la colección parameters (documento
 * "guides"), así que agregar o editar un cartel no necesita desplegar. Acá
 * queda solo la mecánica de mostrarlo.
 */
export function SectionGuide() {
  const { user, markGuideSeen } = useAuth();
  const { t, language, guestLanguage, uiMode } = useI18n();
  const { pathname } = useLocation();

  // Los admins no usan la app de estudio: no tiene sentido explicársela.
  // Y mientras falte elegir el idioma, no se tapa ese modal con otro.
  const active =
    Boolean(user) &&
    user?.role !== 'admin' &&
    !user?.needsLanguageSetup &&
    !pendingLanguageChoice(user ?? null, guestLanguage, uiMode);
  const guides = useGuides(active);

  if (!user || !active || !guides) return null;

  const guide = pendingModal(guides, pathname, user.seenGuides);
  if (!guide) return null;

  return (
    <Modal
      open
      title={localize(guide.title, language)}
      closeLabel={t('guide.close')}
      onClose={() => markGuideSeen(guide.id)}
    >
      <p>{localize(guide.body, language)}</p>
    </Modal>
  );
}
