import type {
  AuthResponse,
  AuthUser,
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
  UpdateFlashcardPayload,
} from '../types';
import { authStorage } from '../auth/authStorage';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class AuthError extends Error {
  constructor(message = 'Sesión expirada') {
    super(message);
    this.name = 'AuthError';
  }
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
    !options?._retried &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh')
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...options, _retried: true });
    }
    authStorage.clear();
    throw new AuthError();
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
    return {
      id: raw.id ?? raw._id ?? '',
      email: raw.email,
      name: raw.name,
      role: raw.role,
    };
  },

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
