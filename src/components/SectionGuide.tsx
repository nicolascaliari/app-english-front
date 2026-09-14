import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { messagesEn } from '../i18n/en';
import type { MessageKey } from '../i18n/types';
import { Modal } from './Modal';

type GuideKey = 'welcome' | 'decks' | 'practice' | 'review' | 'grammar' | 'reading' | 'create';

interface Guide {
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

const GUIDES: Record<GuideKey, Guide> = {
  welcome: { titleKey: 'guide.welcome.title', bodyKey: 'guide.welcome.body' },
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
  const { pathname } = useLocation();

  const sectionKey = guideForPath(pathname);
  // Los admins no usan la app de estudio: no tiene sentido explicársela.
  // Y mientras falte elegir el idioma, no se tapa ese modal con otro.
  if (!user || user.role === 'admin' || user.needsLanguageSetup || !sectionKey) {
    return null;
  }
  // La bienvenida va antes que cualquier guía de sección; al cerrarla aparece la de la sección.
  const key: GuideKey = user.seenGuides.includes('welcome') ? sectionKey : 'welcome';
  if (user.seenGuides.includes(key)) return null;

  const guide = GUIDES[key];

  // Las guías se muestran siempre en inglés, sin importar el idioma de la interfaz.
  return (
    <Modal
      open
      title={messagesEn[guide.titleKey]}
      closeLabel={messagesEn['guide.close']}
      onClose={() => markGuideSeen(key)}
    >
      <p>{messagesEn[guide.bodyKey]}</p>
    </Modal>
  );
}
