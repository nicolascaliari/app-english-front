export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

export interface Category {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface Flashcard {
  _id: string;
  categoryId: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  tags: string[];
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  flashcardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  lastReviewed?: string;
}

export interface DueReview {
  review: Review;
  flashcard: Flashcard;
}

export interface CreateFlashcardPayload {
  categoryId: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  tags?: string[];
  difficulty?: Difficulty;
}

export interface UpdateFlashcardPayload {
  difficulty?: Difficulty;
  front?: string;
  back?: string;
  example?: string;
  pronunciation?: string;
  tags?: string[];
}

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  color?: string;
  icon?: string;
}

export interface ImportCategoryPayload {
  name: string;
  slug: string;
  color?: string;
  icon?: string;
}

export interface ImportFlashcardPayload {
  category: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  difficulty?: Difficulty;
}

export interface ImportPayload {
  categories?: ImportCategoryPayload[];
  flashcards?: ImportFlashcardPayload[];
}

export interface ImportResult {
  categories: { created: number; skipped: number };
  flashcards: { created: number; skipped: number; errors: string[] };
}
