import type { AppLanguage } from '../utils/languages';

export type { AppLanguage };

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  nativeLanguage: AppLanguage;
  targetLanguage: AppLanguage;
  streakCount: number;
  lastStreakDate: string | null;
}

export interface StreakResult {
  streakCount: number;
  lastStreakDate: string;
  extended: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  nativeLanguage: AppLanguage;
  targetLanguage: AppLanguage;
}

export interface UpdateProfilePayload {
  name?: string;
  nativeLanguage?: AppLanguage;
  targetLanguage?: AppLanguage;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  createdAt: string;
}

export interface Flashcard {
  _id: string;
  categoryId: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  imageUrl?: string;
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
  imageUrl?: string;
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

export interface CreateSubcategoryPayload {
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
  parent?: string;
}

export interface ImportFlashcardPayload {
  category: string;
  subcategory?: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  imageUrl?: string;
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

export interface BackfillImagesResult {
  processed: number;
  updated: number;
  notFound: number;
  remaining: number;
}

export interface GenerateResult {
  categories: ImportCategoryPayload[];
  flashcards: ImportFlashcardPayload[];
}

export type GrammarExerciseType = 'fill_blank' | 'multiple_choice';
export type GrammarLevel = 'beginner' | 'intermediate' | 'advanced' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1';

export const GRAMMAR_LEVEL_LABELS: Record<GrammarLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  a1: 'A1 - Principiante',
  a2: 'A2 - Básico',
  b1: 'B1 - Intermedio',
  b2: 'B2 - Intermedio Alto',
  c1: 'C1 - Avanzado Superior',
};

export interface GrammarExercise {
  id: string;
  type: GrammarExerciseType;
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string;
}

export interface GrammarExercisesRequest {
  topic: string;
  count?: number;
  level?: GrammarLevel;
}

export interface GrammarExercisesResult {
  topic: string;
  exercises: GrammarExercise[];
}
