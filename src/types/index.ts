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
  practiceLimit: number;
  /** Guías de bienvenida ya vistas, una por sección. */
  seenGuides: string[];
  /** Cuenta nueva (Google) que todavía no eligió su idioma nativo. */
  needsLanguageSetup: boolean;
}

/** Usuario tal como lo ve un admin en el panel de administración. */
export interface AdminUser {
  _id: string;
  id?: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  streakCount: number;
  createdAt: string;
}

export interface UpdateUserPayload {
  name?: string;
  role?: string;
  isActive?: boolean;
}

export interface StreakResult {
  streakCount: number;
  lastStreakDate: string;
  extended: boolean;
}

/**
 * El refresh token NO viene en el cuerpo: el backend lo manda en una cookie
 * httpOnly que el JavaScript de la página no puede leer.
 */
export interface AuthResponse {
  accessToken: string;
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
  /** El idioma a aprender es siempre inglés; esto define la interfaz. */
  nativeLanguage: AppLanguage;
}

export interface UpdateProfilePayload {
  name?: string;
  nativeLanguage?: AppLanguage;
  practiceLimit?: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  order?: number | null;
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
  imageQuery?: string;
  tags: string[];
  difficulty: Difficulty;
  pinned?: boolean;
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
  /**
   * Escena (en inglés) con la que el backend busca la foto.
   * String vacío = sin foto a propósito; ausente = que decida el backend.
   * No lo pises con `|| undefined`: se perdería la diferencia.
   */
  imageQuery?: string;
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
  categoryId?: string;
  imageUrl?: string;
  /** '' marca la tarjeta como "sin foto a propósito" (el backfill la saltea). */
  imageQuery?: string;
  pinned?: boolean;
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
  imageQuery?: string;
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

export interface SavedPrompt {
  _id: string;
  title: string;
  text: string;
  usageCount: number;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedPromptPayload {
  title: string;
  text: string;
}

export interface UpdateSavedPromptPayload {
  title?: string;
  text?: string;
}

export interface GenerateResult {
  categories: ImportCategoryPayload[];
  flashcards: ImportFlashcardPayload[];
}

export type GrammarExerciseType = 'fill_blank' | 'multiple_choice';
/** Texto por idioma, tal como viene de la colección parameters. */
export type LocalizedText = Partial<Record<AppLanguage, string>>;

export interface GrammarTopic {
  id: string;
  icon: string;
  name: LocalizedText;
}

export interface GrammarLevel {
  id: string;
  badge: string;
  title: LocalizedText;
  description: LocalizedText;
  topics: GrammarTopic[];
}

/** Temario de gramática: GET /parameters/grammar. */
export interface GrammarSyllabus {
  countOptions: number[];
  defaultCount: number;
  levels: GrammarLevel[];
}

export interface GrammarExercise {
  id: string;
  type: GrammarExerciseType;
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string;
}

export interface GrammarExercisesRequest {
  level: string;
  topicId: string;
  count: number;
}

export interface GrammarExercisesResult {
  exercises: GrammarExercise[];
}

/** Foto candidata del selector de imágenes. */
export interface ImageCandidate {
  url: string;
  thumbUrl: string;
  alt: string;
  photographer: string;
}

export type LookupKind = 'word' | 'phrase';

export interface LookupEntry {
  front: string;
  back: string;
  partOfSpeech?: string;
  pronunciation?: string;
  example?: string;
  difficulty: Difficulty;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
  imageQuery?: string;
}

export interface LookupResult {
  query: string;
  kind: LookupKind;
  entries: LookupEntry[];
}
