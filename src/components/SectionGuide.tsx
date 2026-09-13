import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/types';
import { Modal } from './Modal';

type GuideKey = 'decks' | 'practice' | 'review' | 'grammar' | 'reading' | 'create';

interface Guide {
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

const GUIDES: Record<GuideKey, Guide> = {
  decks: { titleKey: 'guide.decks.title', bodyKey: 'guide.decks.body' },
  practice: { titleKey: 'guide.practice.title', bodyKey: 'guide.practice.body' },
  review: { titleKey: 'guide.review.title', bodyKey: 'guide.review.body' },
  grammar: { titleKey: 'guide.grammar.title', bodyKey: 'guide.grammar.body' },
  reading: { titleKey: 'guide.reading.title', bodyKey: 'guide.reading.body' },
  create: { titleKey: 'guide.create.title', bodyKey: 'guide.create.body' },
};

/**
 * Sección a la que corresponde cada ruta. Solo coincidencias exactas: en medio
 * de una sesión de práctica o leyendo un libro, un modal sería una molestia.
 */
function guideForPath(pathname: string): GuideKey | null {
  if (pathname === '/') return 'decks';
  if (pathname === '/practice') return 'practice';
  if (pathname === '/review') return 'review';
  if (pathname === '/grammar') return 'grammar';
  if (pathname === '/reading') return 'reading';
  if (pathname === '/new') return 'create';
  return null;
}

/**
 * Guía de bienvenida, una vez por sección y por cuenta.
 *
 * Se monta una sola vez en el Layout y resuelve la sección desde la ruta, en
 * lugar de repetir el mismo bloque en las seis páginas.
 */
export function SectionGuide() {
  const { user, markGuideSeen } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();

  const key = guideForPath(pathname);
  // Los admins no usan la app de estudio: no tiene sentido explicársela.
  if (!user || user.role === 'admin' || !key) return null;
  if (user.seenGuides.includes(key)) return null;

  const guide = GUIDES[key];

  return (
    <Modal
      open
      title={t(guide.titleKey)}
      closeLabel={t('guide.close')}
      onClose={() => markGuideSeen(key)}
    >
      <p>{t(guide.bodyKey)}</p>
    </Modal>
  );
}
