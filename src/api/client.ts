import type {
  Category,
  CreateCategoryPayload,
  CreateFlashcardPayload,
  DueReview,
  Flashcard,
  ImportPayload,
  ImportResult,
  Review,
  UpdateFlashcardPayload,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getCategories: () => request<Category[]>('/categories'),

  getCategory: (slug: string) => request<Category>(`/categories/${slug}`),

  createCategory: (data: CreateCategoryPayload) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getFlashcards: (slug: string) =>
    request<Flashcard[]>(`/categories/${slug}/flashcards`),

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
};
