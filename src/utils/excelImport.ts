import * as XLSX from 'xlsx';
import type { Difficulty } from '../types';
import { categoryIcon, isBrokenIcon } from './categoryIcon';

export interface ParsedCategory {
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  parent?: string;
}

export interface ParsedFlashcard {
  category: string;
  subcategory?: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  difficulty?: Difficulty;
}

export interface ParsedExcel {
  categories: ParsedCategory[];
  flashcards: ParsedFlashcard[];
  sheetNames: string[];
}

const CATEGORY_SHEETS = ['categorias', 'categories', 'categoria', 'category'];
const FLASHCARD_SHEETS = ['palabras', 'words', 'flashcards', 'cartas', 'cards'];

const CATEGORY_COLUMNS: Record<string, keyof ParsedCategory> = {
  nombre: 'name',
  name: 'name',
  slug: 'slug',
  icono: 'icon',
  icon: 'icon',
  color: 'color',
  padre: 'parent',
  categoriapadre: 'parent',
  parent: 'parent',
};

const FLASHCARD_COLUMNS: Record<string, keyof ParsedFlashcard | 'difficulty'> = {
  categoria: 'category',
  category: 'category',
  cat: 'category',
  subcategoria: 'subcategory',
  subcategory: 'subcategory',
  ingles: 'front',
  english: 'front',
  front: 'front',
  espanol: 'back',
  spanish: 'back',
  back: 'back',
  ejemplo: 'example',
  example: 'example',
  pronunciacion: 'pronunciation',
  pronunciation: 'pronunciation',
  dificultad: 'difficulty',
  difficulty: 'difficulty',
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cellStr(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function parseDifficulty(value: unknown): Difficulty | undefined {
  const v = cellStr(value).toLowerCase();
  if (!v) return undefined;
  if (['easy', 'facil', 'fácil', 'e'].includes(v)) return 'easy';
  if (['medium', 'media', 'medio', 'm'].includes(v)) return 'medium';
  if (['hard', 'dificil', 'difícil', 'h'].includes(v)) return 'hard';
  return undefined;
}

function findSheet(
  workbook: XLSX.WorkBook,
  names: string[],
): XLSX.WorkSheet | null {
  for (const name of workbook.SheetNames) {
    if (names.includes(normalizeHeader(name))) {
      return workbook.Sheets[name];
    }
  }
  return null;
}

function parseCategorySheet(sheet: XLSX.WorkSheet): ParsedCategory[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(normalizeHeader);
  const colIndex: Partial<Record<keyof ParsedCategory, number>> = {};
  headers.forEach((h, i) => {
    const field = CATEGORY_COLUMNS[h];
    if (field) colIndex[field] = i;
  });

  if (colIndex.name == null) return [];

  const result: ParsedCategory[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row?.length) continue;

    const name = cellStr(row[colIndex.name!]);
    if (!name) continue;

    const slug =
      colIndex.slug != null ? cellStr(row[colIndex.slug]) : slugify(name);

    const resolvedSlug = slug || slugify(name);
    const rawIcon =
      colIndex.icon != null ? cellStr(row[colIndex.icon]) || undefined : undefined;
    const icon = rawIcon
      ? isBrokenIcon(rawIcon)
        ? categoryIcon(rawIcon, resolvedSlug)
        : rawIcon
      : categoryIcon(undefined, resolvedSlug);

    result.push({
      name,
      slug: resolvedSlug,
      icon,
      color: colIndex.color != null ? cellStr(row[colIndex.color]) || undefined : undefined,
      parent: colIndex.parent != null ? cellStr(row[colIndex.parent]) || undefined : undefined,
    });
  }
  return result;
}

function parseFlashcardSheet(sheet: XLSX.WorkSheet): ParsedFlashcard[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(normalizeHeader);
  const colIndex: Partial<Record<string, number>> = {};
  headers.forEach((h, i) => {
    const field = FLASHCARD_COLUMNS[h];
    if (field) colIndex[field] = i;
  });

  if (colIndex.category == null || colIndex.front == null || colIndex.back == null) {
    return [];
  }

  const result: ParsedFlashcard[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row?.length) continue;

    const category = cellStr(row[colIndex.category!]);
    const front = cellStr(row[colIndex.front!]);
    const back = cellStr(row[colIndex.back!]);
    if (!category || !front || !back) continue;

    result.push({
      category,
      subcategory:
        colIndex.subcategory != null
          ? cellStr(row[colIndex.subcategory]) || undefined
          : undefined,
      front,
      back,
      example:
        colIndex.example != null
          ? cellStr(row[colIndex.example]) || undefined
          : undefined,
      pronunciation:
        colIndex.pronunciation != null
          ? cellStr(row[colIndex.pronunciation]) || undefined
          : undefined,
      difficulty:
        colIndex.difficulty != null
          ? parseDifficulty(row[colIndex.difficulty])
          : undefined,
    });
  }
  return result;
}

export function parseExcelFile(buffer: ArrayBuffer): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const categorySheet = findSheet(workbook, CATEGORY_SHEETS);
  const flashcardSheet = findSheet(workbook, FLASHCARD_SHEETS);

  return {
    categories: categorySheet ? parseCategorySheet(categorySheet) : [],
    flashcards: flashcardSheet ? parseFlashcardSheet(flashcardSheet) : [],
    sheetNames: workbook.SheetNames,
  };
}

export function downloadImportTemplate(): void {
  const wb = XLSX.utils.book_new();

  const categoriesData = [
    ['nombre', 'slug', 'icono', 'color', 'padre'],
    ['Cocina', 'cocina', '🍳', '#ff6b6b', ''],
    ['Viajes', 'viajes', '✈️', '#4ecdc4', ''],
    ['Phrasal Verbs', 'phrasal-verbs', '🔤', '#6c63ff', ''],
    ['get', 'get', '🏃', '#6c63ff', 'phrasal-verbs'],
    ['come', 'come', '🚶', '#6c63ff', 'phrasal-verbs'],
  ];
  const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, categoriesSheet, 'categorias');

  const flashcardsData = [
    [
      'categoria',
      'subcategoria',
      'ingles',
      'espanol',
      'ejemplo',
      'pronunciacion',
      'dificultad',
    ],
    ['cocina', '', 'knife', 'cuchillo', 'Pass me the knife.', '/naɪf/', 'easy'],
    [
      'viajes',
      '',
      'luggage',
      'equipaje',
      'Where is my luggage?',
      '/ˈlʌɡ.ɪdʒ/',
      'medium',
    ],
    [
      'phrasal-verbs',
      'get',
      'get up',
      'levantarse',
      'I get up at 7am.',
      '/ɡet ʌp/',
      'medium',
    ],
    [
      'phrasal-verbs',
      'come',
      'come back',
      'volver',
      'Come back soon!',
      '/kʌm bæk/',
      'medium',
    ],
  ];
  const flashcardsSheet = XLSX.utils.aoa_to_sheet(flashcardsData);
  XLSX.utils.book_append_sheet(wb, flashcardsSheet, 'palabras');

  XLSX.writeFile(wb, 'plantilla-flashcards.xlsx');
}
