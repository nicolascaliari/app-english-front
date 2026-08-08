import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, AuthError, onAuthFailure } from '../api/client';
import type { AuthUser, LoginPayload, RegisterPayload } from '../types';
import { authStorage, type StoredUser } from './authStorage';

interface AuthContextValue {
  user: StoredUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toStoredUser(user: AuthUser): StoredUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(() => authStorage.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((me) => {
        const stored = toStoredUser(me);
        setUser(stored);
        const refresh = authStorage.getRefreshToken();
        if (refresh) {
          authStorage.setSession(token, refresh, stored);
        }
      })
      .catch(() => {
        authStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return onAuthFailure(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await api.login(payload);
    const stored = toStoredUser(res.user);
    authStorage.setSession(res.accessToken, res.refreshToken, stored);
    setUser(stored);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await api.register(payload);
    const stored = toStoredUser(res.user);
    authStorage.setSession(res.accessToken, res.refreshToken, stored);
    setUser(stored);
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
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
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
