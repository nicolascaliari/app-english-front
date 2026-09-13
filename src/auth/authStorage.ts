import type { AppLanguage } from '../utils/languages';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  normalizeAppLanguage,
} from '../utils/languages';
import { normalizeDateOnly } from '../utils/date';
import {
  clampPracticeLimit,
  DEFAULT_PRACTICE_LIMIT,
} from '../utils/practice';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  nativeLanguage: AppLanguage;
  targetLanguage: AppLanguage;
  streakCount: number;
  lastStreakDate: string | null;
  practiceLimit: number;
  seenGuides: string[];
}

const USER_KEY = 'flashcards_user';

// Claves del esquema anterior, cuando los tokens vivían en localStorage.
// Se limpian al cargar para que no queden sesiones viejas dando vueltas.
const LEGACY_ACCESS_KEY = 'flashcards_access_token';
const LEGACY_REFRESH_KEY = 'flashcards_refresh_token';

/**
 * El access token vive SOLO en memoria: nunca en localStorage, donde un XSS
 * podría leerlo. Se pierde al recargar la página, y se recupera llamando a
 * /auth/refresh, que viaja con la cookie httpOnly del refresh token.
 */
let accessToken: string | null = null;

try {
  localStorage.removeItem(LEGACY_ACCESS_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
} catch {
  // Modo privado o storage bloqueado: no hay nada que limpiar.
}

function normalizeStoredUser(raw: Partial<StoredUser> & { id: string }): StoredUser {
  return {
    id: raw.id,
    email: raw.email ?? '',
    name: raw.name ?? '',
    role: raw.role ?? 'user',
    nativeLanguage: normalizeAppLanguage(
      raw.nativeLanguage,
      DEFAULT_NATIVE_LANGUAGE,
    ),
    targetLanguage: normalizeAppLanguage(
      raw.targetLanguage,
      DEFAULT_TARGET_LANGUAGE,
    ),
    streakCount: typeof raw.streakCount === 'number' ? raw.streakCount : 0,
    lastStreakDate: normalizeDateOnly(raw.lastStreakDate),
    practiceLimit: clampPracticeLimit(raw.practiceLimit ?? DEFAULT_PRACTICE_LIMIT),
    seenGuides: Array.isArray(raw.seenGuides) ? raw.seenGuides : [],
  };
}

export const authStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  setAccessToken(token: string | null): void {
    accessToken = token;
  },

  /** El usuario sí se guarda: permite pintar la UI sin esperar al refresh. */
  getUser(): StoredUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredUser> & { id?: string };
      if (!parsed.id) return null;
      return normalizeStoredUser({ ...parsed, id: parsed.id });
    } catch {
      return null;
    }
  },

  setUser(user: StoredUser): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(normalizeStoredUser(user)));
    } catch {
      // Sin storage la sesión sigue andando: solo se pierde el pintado optimista.
    }
  },

  setSession(token: string, user: StoredUser): void {
    accessToken = token;
    this.setUser(user);
  },

  clear(): void {
    accessToken = null;
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // Nada que limpiar.
    }
  },
};
