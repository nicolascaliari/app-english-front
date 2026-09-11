import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nProvider';
import type { LookupEntry, LookupResult } from '../types';
import {
  cachedCategoryTree,
  categoryLabel,
  firstLeafId,
  isLeaf,
  refreshCategoryTree,
  resolveCategoryId,
  type CategoryNode,
} from '../utils/categoryTree';
import { CategorySelect } from './CategorySelect';

// Readers tend to file a whole chapter's words into the same deck.
const LAST_CATEGORY_KEY = 'english-app-reading-last-category';

function readLastCategory(): string {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveLastCategory(id: string): void {
  try {
    localStorage.setItem(LAST_CATEGORY_KEY, id);
  } catch {
    // private mode / blocked storage: just don't remember it
  }
}

/** The entry's suggested category, else the last one used, else the first leaf. */
function pickCategory(tree: CategoryNode[], entry: LookupEntry): string {
  const last = readLastCategory();
  const fallback = isLeaf(tree, last) ? last : firstLeafId(tree);
  return resolveCategoryId(
    tree,
    entry.suggestedCategory,
    entry.suggestedSubcategory,
    fallback,
  );
}

interface Props {
  entry: LookupEntry;
  kind?: LookupResult['kind'];
}

/** Saves a looked-up word or phrase as a flashcard in a category the user picks. */
export function AddToDeckForm({ entry, kind }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  // The reader preloads the tree, so it is usually cached already; the
  // refresh below still runs to pick up categories created since.
  const [tree, setTree] = useState<CategoryNode[] | null>(() =>
    cachedCategoryTree(ownerId),
  );
  const [categoryId, setCategoryId] = useState(() => {
    const cached = cachedCategoryTree(ownerId);
    return cached ? pickCategory(cached, entry) : '';
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    refreshCategoryTree(ownerId)
      .then((loaded) => {
        if (cancelled) return;
        setTree(loaded);
        // Keep the user's pick if it still exists.
        setCategoryId((current) =>
          current && isLeaf(loaded, current) ? current : pickCategory(loaded, entry),
        );
      })
      .catch((err: unknown) => {
        // A failed background refresh is harmless when a cached tree is shown.
        if (!cancelled && !cachedCategoryTree(ownerId)) {
          setError(err instanceof Error ? err.message : t('new.saveError'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entry, ownerId, t]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    setSaving(true);
    setError('');
    try {
      await api.createFlashcard({
        categoryId,
        front: entry.front,
        back: entry.back,
        example: entry.example || undefined,
        pronunciation: entry.pronunciation || undefined,
        difficulty: entry.difficulty,
        tags: [kind, entry.partOfSpeech].filter((tag): tag is string => Boolean(tag)),
      });
      saveLastCategory(categoryId);
      setSuccess(
        t('lookup.added', {
          word: entry.front,
          category: categoryLabel(tree ?? [], categoryId) || t('new.category'),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('new.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return <p className="status success word-sheet-add-done">{success}</p>;
  }

  return (
    <form className="form word-sheet-add" onSubmit={handleSave}>
      <label>
        {t('new.category')}
        {tree ? (
          <CategorySelect tree={tree} value={categoryId} onChange={setCategoryId} />
        ) : (
          !error && <span className="field-hint">{t('common.loading')}</span>
        )}
      </label>

      {error && <p className="status error">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={saving || !categoryId}>
        {saving ? t('common.saving') : t('reading.saveCard')}
      </button>
    </form>
  );
}
