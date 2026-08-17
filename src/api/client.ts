import type {
  AuthResponse,
  AuthUser,
  BackfillImagesResult,
  Category,
  CreateCategoryPayload,
  CreateFlashcardPayload,
  CreateSubcategoryPayload,
  DueReview,
  Flashcard,
  GenerateResult,
  GrammarExercisesRequest,
  GrammarExercisesResult,
  ImportPayload,
  ImportResult,
  LoginPayload,
  RegisterPayload,
  Review,
  StreakResult,
  UpdateFlashcardPayload,
  UpdateProfilePayload,
} from '../types';
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  normalizeAppLanguage,
} from '../utils/languages';
import { normalizeDateOnly } from '../utils/date';
import { authStorage } from '../auth/authStorage';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class AuthError extends Error {
  constructor(message = 'Sesión expirada') {
    super(message);
    this.name = 'AuthError';
  }
}

type AuthFailureListener = () => void;
const authFailureListeners = new Set<AuthFailureListener>();

/** Subscribe to mid-session auth failures (expired token / failed refresh). */
export function onAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

function handleAuthFailure(): never {
  authStorage.clear();
  for (const listener of authFailureListeners) {
    listener();
  }
  throw new AuthError();
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) return false;
        const data = (await res.json()) as Pick<AuthResponse, 'accessToken' | 'refreshToken'>;
        authStorage.setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  _retried?: boolean;
};

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (!options?.skipAuth) {
    const token = authStorage.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (
    res.status === 401 &&
    !options?.skipAuth &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh')
  ) {
    if (!options?._retried) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request<T>(path, { ...options, _retried: true });
      }
    }
    handleAuthFailure();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(', ')
        : (message ?? `Request failed: ${res.status}`),
    );
  }

  return res.json();
}

function normalizeAuthUser(raw: AuthUser & { _id?: string }): AuthUser {
  return {
    id: raw.id ?? raw._id ?? '',
    email: raw.email,
    name: raw.name,
    role: raw.role,
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
  };
}

export const api = {
  login: (data: LoginPayload) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),

  register: (data: RegisterPayload) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),

  logout: () =>
    request<{ loggedOut: true }>('/auth/logout', { method: 'POST' }),

  getMe: async (): Promise<AuthUser> => {
    const raw = await request<AuthUser & { _id?: string }>('/auth/me');
    return normalizeAuthUser(raw);
  },

  updateProfile: async (data: UpdateProfilePayload): Promise<AuthUser> => {
    const raw = await request<AuthUser & { _id?: string }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return normalizeAuthUser(raw);
  },

  recordStreak: (data?: { date?: string }) =>
    request<StreakResult>('/users/me/streak', {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  getCategories: () => request<Category[]>('/categories'),

  getCategory: (slug: string) => request<Category>(`/categories/${slug}`),

  createCategory: (data: CreateCategoryPayload) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSubcategories: (slug: string) =>
    request<Category[]>(`/categories/${slug}/subcategories`),

  getSubcategory: (slug: string, subSlug: string) =>
    request<Category>(`/categories/${slug}/subcategories/${subSlug}`),

  createSubcategory: (slug: string, data: CreateSubcategoryPayload) =>
    request<Category>(`/categories/${slug}/subcategories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getFlashcards: (slug: string) =>
    request<Flashcard[]>(`/categories/${slug}/flashcards`),

  getSubcategoryFlashcards: (slug: string, subSlug: string) =>
    request<Flashcard[]>(`/categories/${slug}/subcategories/${subSlug}/flashcards`),

  createFlashcard: (data: CreateFlashcardPayload) =>
    request<Flashcard>('/flashcards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFlashcard: (id: string, data: UpdateFlashcardPayload) =>
    request<Flashcard>(`/flashcards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteFlashcard: (id: string) =>
    request<{ deleted: boolean }>(`/flashcards/${id}`, { method: 'DELETE' }),

  backfillFlashcardImages: (limit = 30) =>
    request<BackfillImagesResult>(
      `/flashcards/backfill-images?limit=${limit}`,
      { method: 'POST' },
    ),

  getPracticeFlashcards: (limit = 10) =>
    request<Flashcard[]>(`/flashcards/practice?limit=${limit}`),

  getDueReviews: () => request<DueReview[]>('/reviews/due'),

  submitReview: (flashcardId: string, correct: boolean) =>
    request<Review>(`/reviews/${flashcardId}`, {
      method: 'POST',
      body: JSON.stringify({ correct }),
    }),

  importData: (data: ImportPayload) =>
    request<ImportResult>('/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateWithAi: (prompt: string) =>
    request<GenerateResult>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  generateGrammarExercises: (data: GrammarExercisesRequest) =>
    request<GrammarExercisesResult>('/ai/grammar-exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
