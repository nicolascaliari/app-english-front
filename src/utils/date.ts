export function localDateString(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function normalizeDateOnly(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  return null;
}
