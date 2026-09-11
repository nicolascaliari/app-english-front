import { api } from '../api/client';
import type { Category } from '../types';

export interface CategoryNode {
  root: Category;
  subs: Category[];
}

/** Root categories with their subcategories, the shape the category pickers use. */
export async function loadCategoryTree(): Promise<CategoryNode[]> {
  const roots = await api.getCategories();
  return Promise.all(
    roots.map(async (root) => ({
      root,
      subs: await api.getSubcategories(root.slug).catch(() => []),
    })),
  );
}

// In-memory cache per user, so a picker can render at once (the reader
// preloads it) while callers refresh it in the background to pick up changes.
let cache: { ownerId: string; tree: CategoryNode[] } | null = null;
const inFlight = new Map<string, Promise<CategoryNode[]>>();

export function cachedCategoryTree(ownerId: string): CategoryNode[] | null {
  return ownerId && cache?.ownerId === ownerId ? cache.tree : null;
}

/** Fetches the tree and caches it, joining a fetch that is already running. */
export function refreshCategoryTree(ownerId: string): Promise<CategoryNode[]> {
  const pending = inFlight.get(ownerId);
  if (pending) return pending;
  const request = loadCategoryTree()
    .then((tree) => {
      cache = { ownerId, tree };
      return tree;
    })
    .finally(() => inFlight.delete(ownerId));
  inFlight.set(ownerId, request);
  return request;
}

/**
 * Cards can only go into leaves — roots without subcategories, or
 * subcategories; the backend rejects a card on a category that has children.
 */
export function isLeaf(tree: CategoryNode[], id: string): boolean {
  return tree.some((node) =>
    node.subs.length === 0
      ? node.root._id === id
      : node.subs.some((sub) => sub._id === id),
  );
}

export function firstLeafId(tree: CategoryNode[]): string {
  for (const node of tree) {
    if (node.subs.length === 0) return node.root._id;
    if (node.subs[0]) return node.subs[0]._id;
  }
  return '';
}

export function resolveCategoryId(
  tree: CategoryNode[],
  categorySlug?: string,
  subcategorySlug?: string,
  fallback = '',
): string {
  if (!categorySlug) return fallback;
  const node = tree.find((item) => item.root.slug === categorySlug);
  if (!node) return fallback;
  if (subcategorySlug) {
    const sub = node.subs.find((item) => item.slug === subcategorySlug);
    if (sub) return sub._id;
  }
  if (node.subs.length === 0) return node.root._id;
  return node.subs[0]?._id ?? node.root._id;
}

/** "Root" or "Root / Sub" for a category id, or '' if it isn't in the tree. */
export function categoryLabel(tree: CategoryNode[], id: string): string {
  for (const node of tree) {
    if (node.root._id === id) return node.root.name;
    const sub = node.subs.find((item) => item._id === id);
    if (sub) return `${node.root.name} / ${sub.name}`;
  }
  return '';
}
