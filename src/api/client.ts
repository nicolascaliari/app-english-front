import type {
  AdminUser,
  UpdateUserPayload,
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
  LookupResult,
  ImportResult,
  LoginPayload,
  RegisterPayload,
  Review,
  SavedPrompt,
  CreateSavedPromptPayload,
  UpdateSavedPromptPayload,
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
import { clampPracticeLimit } from '../utils/practice';
import { authStorage } from '../auth/authStorage';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class AuthError extends Error {
  constructor(message = 'Sesión expirada') {
    super(message);
    this.name = 'AuthError';
  }
}

/** Datos que acompañan a un 429 de cuota diaria de IA. */
export interface QuotaInfo {
  operation: string;
  limit: number;
  resetsInSeconds: number;
}

/**
 * Error de la API con el contexto que hace falta para mostrarlo bien:
 * el status y, cuando aplica, el código y los datos de la cuota. Sigue siendo
 * un Error, así que el código que solo lee `.message` no se rompe.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly quota?: QuotaInfo;

  constructor(
    message: string,
    status: number,
    code?: string,
    quota?: QuotaInfo,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.quota = quota;
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

/**
 * Pide un access token nuevo. No manda ningún token: el refresh viaja solo,
 * en la cookie httpOnly, por eso `credentials: 'include'` es obligatorio.
 */
async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return false;
        const data = (await res.json()) as Pick<AuthResponse, 'accessToken'>;
        authStorage.setAccessToken(data.accessToken);
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

/**
 * Recupera la sesión al abrir la app: el access token vive en memoria y se
 * pierde al recargar, así que se cambia la cookie por uno nuevo.
 */
export function restoreSession(): Promise<boolean> {
  return tryRefresh();
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
    // Necesario para que viaje la cookie httpOnly del refresh token.
    credentials: 'include',
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
    const code = typeof body.error === 'string' ? body.error : undefined;

    // Dos cosas distintas responden 429: la cuota diaria de IA, que trae su
    // propio mensaje y cuánto falta, y el throttler de ráfagas, cuyo texto
    // crudo ("ThrottlerException: Too Many Requests") no le sirve a nadie.
    if (res.status === 429 && code !== 'AI_DAILY_QUOTA') {
      throw new ApiError(
        'Estás haciendo demasiadas solicitudes. Esperá un momento y volvé a intentar.',
        429,
        'THROTTLED',
      );
    }

    const message = body.message;
    throw new ApiError(
      Array.isArray(message)
        ? message.join(', ')
        : (message ?? `Request failed: ${res.status}`),
      res.status,
      code,
      body.quota as QuotaInfo | undefined,
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
    practiceLimit: clampPracticeLimit(raw.practiceLimit),
    seenGuides: Array.isArray(raw.seenGuides) ? raw.seenGuides : [],
    needsLanguageSetup: raw.needsLanguageSetup === true,
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

  loginWithGoogle: (credential: string) =>
    request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
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

  markGuideSeen: async (guide: string): Promise<AuthUser> => {
    const raw = await request<AuthUser & { _id?: string }>(
      '/users/me/seen-guides',
      { method: 'POST', body: JSON.stringify({ guide }) },
    );
    return normalizeAuthUser(raw);
  },

  recordStreak: (data?: { date?: string }) =>
    request<StreakResult>('/users/me/streak', {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  // --- Administración (solo rol admin) ---

  getUsers: () => request<AdminUser[]>('/users'),

  updateUser: (id: string, data: UpdateUserPayload) =>
    request<AdminUser>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getCategories: () => request<Category[]>('/categories'),

  getCategory: (slug: string) => request<Category>(`/categories/${slug}`),

  createCategory: (data: CreateCategoryPayload) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    request<{
      deleted: boolean;
      categoryId: string;
      deletedCategoriesCount: number;
      deletedCardsCount: number;
      deletedReviewsCount: number;
    }>(`/categories/${id}`, {
      method: 'DELETE',
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

  getPinnedFlashcards: () =>
    request<Flashcard[]>('/flashcards/pinned'),

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

  getSavedPrompts: () => request<SavedPrompt[]>('/prompts'),

  createSavedPrompt: (data: CreateSavedPromptPayload) =>
    request<SavedPrompt>('/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSavedPrompt: (id: string, data: UpdateSavedPromptPayload) =>
    request<SavedPrompt>(`/prompts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  markSavedPromptUsed: (id: string) =>
    request<SavedPrompt>(`/prompts/${id}/use`, { method: 'POST' }),

  deleteSavedPrompt: (id: string) =>
    request<{ deleted: boolean; promptId: string }>(`/prompts/${id}`, {
      method: 'DELETE',
    }),

  lookupTerm: (query: string) =>
    request<LookupResult>('/ai/lookup', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
};
