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

/** Settles when a transaction commits; rejects with the real cause on error or abort. */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    const fail = (event: Event) => {
      const source = event.target as IDBRequest | IDBTransaction | null;
      reject(source?.error ?? tx.error ?? new Error('IndexedDB transaction failed'));
    };
    tx.onerror = fail;
    tx.onabort = fail;
  });
}

// New rows keep raw bytes: iOS Safari often fails to store Blobs in IndexedDB
// ("Error preparing Blob/File data"). Older rows may still hold a Blob.
interface StoredBookFile {
  id: string;
  data?: ArrayBuffer;
  file?: Blob;
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
      tx.objectStore(FILE_STORE).get(id) as IDBRequest<StoredBookFile | undefined>,
    );
    if (row?.data) return new Blob([row.data], { type: 'application/epub+zip' });
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
    await txDone(tx);
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
    await txDone(tx);
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
  detail?: string;
  constructor(code: ImportEpubErrorCode, detail?: string) {
    super(code);
    this.name = 'ImportEpubError';
    this.code = code;
    this.detail = detail;
  }
}

/** Short technical reason for a failure, shown under the friendly message. */
export function describeError(err: unknown): string {
  if (err instanceof ImportEpubError) return err.detail ?? err.code;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

// crypto.randomUUID needs Safari 15.4+ and a secure (https) context.
function newBookId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
      id: newBookId(),
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
      const stored: StoredBookFile = { id: meta.id, data: bytes.buffer };
      tx.objectStore(FILE_STORE).put(stored);
      await txDone(tx);
    } finally {
      db.close();
    }

    return meta;
  } catch (err) {
    if (err instanceof ImportEpubError) throw err;
    console.error('[reading] EPUB import failed', err);
    throw new ImportEpubError('readError', describeError(err));
  } finally {
    book.destroy();
  }
}
