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
