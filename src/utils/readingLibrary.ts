const DB_NAME = 'english-app-reading';
const DB_VERSION = 1;
const META_STORE = 'meta';
const FILE_STORE = 'files';

export const MAX_EPUB_BYTES = 50 * 1024 * 1024;

/** Serialized epub.js locations; `chars` is the size each one was built with. */
export interface ReadingBookLocations {
  chars: number;
  data: string;
}

export interface ReadingBookMeta {
  id: string;
  title: string;
  author: string;
  addedAt: number;
  lastOpenedAt: number;
  lastCfi: string | null;
  size: number;
  coverDataUrl: string | null;
  locations?: ReadingBookLocations | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function reqAs<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function listReadingBooks(): Promise<ReadingBookMeta[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(META_STORE, 'readonly');
    const rows = await reqAs(tx.objectStore(META_STORE).getAll() as IDBRequest<ReadingBookMeta[]>);
    return rows.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  } finally {
    db.close();
  }
}

export async function getReadingBook(id: string): Promise<ReadingBookMeta | undefined> {
  const db = await openDb();
  try {
    const tx = db.transaction(META_STORE, 'readonly');
    return await reqAs(tx.objectStore(META_STORE).get(id) as IDBRequest<ReadingBookMeta | undefined>);
  } finally {
    db.close();
  }
}

export async function getReadingBookFile(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  try {
    const tx = db.transaction(FILE_STORE, 'readonly');
    const row = await reqAs(
      tx.objectStore(FILE_STORE).get(id) as IDBRequest<{ id: string; file: Blob } | undefined>,
    );
    return row?.file;
  } finally {
    db.close();
  }
}

async function updateReadingMeta(
  id: string,
  change: (meta: ReadingBookMeta) => void,
): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    const current = await reqAs(store.get(id) as IDBRequest<ReadingBookMeta | undefined>);
    if (!current) return;
    change(current);
    store.put(current);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    });
  } finally {
    db.close();
  }
}

export function saveReadingProgress(id: string, cfi: string): Promise<void> {
  return updateReadingMeta(id, (meta) => {
    meta.lastCfi = cfi;
    meta.lastOpenedAt = Date.now();
  });
}

export function touchReadingBook(id: string): Promise<void> {
  return updateReadingMeta(id, (meta) => {
    meta.lastOpenedAt = Date.now();
  });
}

export function saveReadingLocations(
  id: string,
  locations: ReadingBookLocations,
): Promise<void> {
  return updateReadingMeta(id, (meta) => {
    meta.locations = locations;
  });
}

export async function deleteReadingBook(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction([META_STORE, FILE_STORE], 'readwrite');
    tx.objectStore(META_STORE).delete(id);
    tx.objectStore(FILE_STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
    });
  } finally {
    db.close();
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read cover'));
    reader.readAsDataURL(blob);
  });
}

export type ImportEpubErrorCode = 'invalidFile' | 'tooLarge' | 'readError';

export class ImportEpubError extends Error {
  code: ImportEpubErrorCode;
  constructor(code: ImportEpubErrorCode) {
    super(code);
    this.name = 'ImportEpubError';
    this.code = code;
  }
}

export async function loadEpubConstructor(): Promise<
  typeof import('epubjs').default
> {
  const mod = await import('epubjs');
  const inner = (mod as { default?: unknown }).default ?? mod;
  const ePub =
    typeof inner === 'function'
      ? inner
      : (inner as { default?: unknown }).default;
  if (typeof ePub !== 'function') {
    throw new ImportEpubError('readError');
  }
  return ePub as typeof import('epubjs').default;
}

export async function importEpubFile(file: File): Promise<ReadingBookMeta> {
  if (!file.name.toLowerCase().endsWith('.epub')) {
    throw new ImportEpubError('invalidFile');
  }
  if (file.size > MAX_EPUB_BYTES) {
    throw new ImportEpubError('tooLarge');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileBlob = new Blob([bytes], { type: 'application/epub+zip' });
  const ePub = await loadEpubConstructor();
  const book = ePub(bytes.buffer.slice(0));

  try {
    await withTimeout(book.opened, 12000);
    const metadata = await withTimeout(book.loaded.metadata, 8000);
    const title =
      metadata.title?.trim() || file.name.replace(/\.epub$/i, '').trim() || 'Untitled';
    const author = metadata.creator?.trim() || '';

    let coverDataUrl: string | null = null;
    try {
      const coverUrl = await withTimeout(book.coverUrl(), 4000);
      if (coverUrl) {
        const res = await fetch(coverUrl);
        if (res.ok) {
          coverDataUrl = await blobToDataUrl(await res.blob());
        }
        URL.revokeObjectURL(coverUrl);
      }
    } catch {
      coverDataUrl = null;
    }

    const meta: ReadingBookMeta = {
      id: crypto.randomUUID(),
      title,
      author,
      addedAt: Date.now(),
      lastOpenedAt: Date.now(),
      lastCfi: null,
      size: file.size,
      coverDataUrl,
    };

    const db = await openDb();
    try {
      const tx = db.transaction([META_STORE, FILE_STORE], 'readwrite');
      tx.objectStore(META_STORE).put(meta);
      tx.objectStore(FILE_STORE).put({ id: meta.id, file: fileBlob });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      });
    } finally {
      db.close();
    }

    return meta;
  } catch (err) {
    if (err instanceof ImportEpubError) throw err;
    throw new ImportEpubError('readError');
  } finally {
    book.destroy();
  }
}
