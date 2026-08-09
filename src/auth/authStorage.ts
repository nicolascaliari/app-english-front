import type { AppLanguage } from '../utils/languages';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  normalizeAppLanguage,
} from '../utils/languages';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  nativeLanguage: AppLanguage;
  targetLanguage: AppLanguage;
}

const ACCESS_KEY = 'flashcards_access_token';
const REFRESH_KEY = 'flashcards_refresh_token';
const USER_KEY = 'flashcards_user';

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
  };
}

export const authStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  getUser(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredUser> & { id?: string };
      if (!parsed.id) return null;
      return normalizeStoredUser({ ...parsed, id: parsed.id });
    } catch {
      return null;
    }
  },

  setSession(
    accessToken: string,
    refreshToken: string,
    user: StoredUser,
  ): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizeStoredUser(user)));
  },

  setUser(user: StoredUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(normalizeStoredUser(user)));
  },

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
