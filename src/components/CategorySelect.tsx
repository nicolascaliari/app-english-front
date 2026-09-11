import { useI18n } from '../i18n/I18nProvider';
import type { CategoryNode } from '../utils/categoryTree';

interface Props {
  tree: CategoryNode[];
  value: string;
  onChange: (categoryId: string) => void;
}

/** Only leaf categories are offered: roots with subcategories are just group labels. */
export function CategorySelect({ tree, value, onChange }: Props) {
  const { t } = useI18n();

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required>
      {tree.length === 0 && <option value="">{t('new.noCategories')}</option>}
      {tree.map((node) =>
        node.subs.length === 0 ? (
          <option key={node.root._id} value={node.root._id}>
            {node.root.icon} {node.root.name}
          </option>
        ) : (
          <optgroup
            key={node.root._id}
            label={`${node.root.icon ?? ''} ${node.root.name}`.trim()}
          >
            {node.subs.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.icon ?? node.root.icon} {sub.name}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </select>
  );
}
