import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, AuthError, onAuthFailure, restoreSession } from '../api/client';
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../types';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  normalizeAppLanguage,
} from '../utils/languages';
import { clampPracticeLimit } from '../utils/practice';
import { authStorage, type StoredUser } from './authStorage';

interface AuthContextValue {
  user: StoredUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  updateStreak: (streakCount: number, lastStreakDate: string) => void;
  markGuideSeen: (guide: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toStoredUser(user: AuthUser): StoredUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    nativeLanguage: normalizeAppLanguage(
      user.nativeLanguage,
      DEFAULT_NATIVE_LANGUAGE,
    ),
    targetLanguage: normalizeAppLanguage(
      user.targetLanguage,
      DEFAULT_TARGET_LANGUAGE,
    ),
    streakCount: user.streakCount ?? 0,
    lastStreakDate: user.lastStreakDate ?? null,
    practiceLimit: clampPracticeLimit(user.practiceLimit),
    seenGuides: user.seenGuides ?? [],
    needsLanguageSetup: user.needsLanguageSetup === true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(() => authStorage.getUser());
  const [loading, setLoading] = useState(true);

  // Al abrir la app no hay access token (vive en memoria y se pierde al
  // recargar): se canjea la cookie httpOnly por uno nuevo antes de nada.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        if (!authStorage.getAccessToken() && !(await restoreSession())) {
          throw new Error('sin sesión');
        }
        const me = await api.getMe();
        if (cancelled) return;
        const stored = toStoredUser(me);
        authStorage.setUser(stored);
        setUser(stored);
      } catch {
        if (cancelled) return;
        authStorage.clear();
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onAuthFailure(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await api.login(payload);
    const stored = toStoredUser(res.user);
    authStorage.setSession(res.accessToken, stored);
    setUser(stored);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await api.loginWithGoogle(credential);
    const stored = toStoredUser(res.user);
    authStorage.setSession(res.accessToken, stored);
    setUser(stored);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await api.register(payload);
    const stored = toStoredUser(res.user);
    authStorage.setSession(res.accessToken, stored);
    setUser(stored);
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const me = await api.updateProfile(payload);
    const stored = toStoredUser(me);
    authStorage.setUser(stored);
    setUser(stored);
  }, []);

  const updateStreak = useCallback(
    (streakCount: number, lastStreakDate: string) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, streakCount, lastStreakDate };
        authStorage.setUser(next);
        return next;
      });
    },
    [],
  );

  /**
   * Marca la guía como vista al instante y avisa al backend en segundo plano:
   * si la llamada falla, lo peor que pasa es que la guía reaparezca la próxima
   * vez, y no tiene sentido bloquear la pantalla por eso.
   */
  const markGuideSeen = useCallback((guide: string) => {
    setUser((prev) => {
      if (!prev || prev.seenGuides.includes(guide)) return prev;
      const next = { ...prev, seenGuides: [...prev.seenGuides, guide] };
      authStorage.setUser(next);
      return next;
    });

    void api.markGuideSeen(guide).catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (e) {
      if (!(e instanceof AuthError)) {
        console.warn('Logout request failed', e);
      }
    }
    authStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      updateProfile,
      updateStreak,
      markGuideSeen,
      logout,
    }),
    [
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      updateProfile,
      updateStreak,
      markGuideSeen,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
