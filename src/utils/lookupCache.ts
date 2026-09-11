import type { LookupResult } from '../types';

const memory = new Map<string, LookupResult>();
const STORAGE_KEY = 'english-app-lookup-cache';
const MAX_ENTRIES = 250;

function cacheKey(word: string, native: string, target: string): string {
  return `${native}:${target}:${word.trim().toLowerCase()}`;
}

function readPersisted(): Record<string, LookupResult> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LookupResult>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persist(): void {
  try {
    const entries = [...memory.entries()].slice(-MAX_ENTRIES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // quota / private mode
  }
}

function hydrate(): void {
  if (memory.size > 0) return;
  const stored = readPersisted();
  for (const [key, value] of Object.entries(stored)) {
    if (value?.entries?.length) memory.set(key, value);
  }
}

export function getCachedLookup(
  word: string,
  native: string,
  target: string,
): LookupResult | undefined {
  hydrate();
  return memory.get(cacheKey(word, native, target));
}

export function setCachedLookup(
  word: string,
  native: string,
  target: string,
  result: LookupResult,
): void {
  hydrate();
  memory.set(cacheKey(word, native, target), result);
  if (memory.size > MAX_ENTRIES) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
  persist();
}
