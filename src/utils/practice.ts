export const DEFAULT_PRACTICE_LIMIT = 10;
export const MIN_PRACTICE_LIMIT = 5;
export const MAX_PRACTICE_LIMIT = 100;

export const PRACTICE_LIMIT_OPTIONS = [
  5, 10, 15, 20, 25, 30, 40, 50, 75, 100,
] as const;

export function clampPracticeLimit(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PRACTICE_LIMIT;
  return Math.min(
    MAX_PRACTICE_LIMIT,
    Math.max(MIN_PRACTICE_LIMIT, Math.round(n)),
  );
}
