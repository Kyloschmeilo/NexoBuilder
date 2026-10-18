/** The filter chips of the items panel: All, Items, Blocks, Furniture and With issues. One chip is active at a time. */
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { TREE_FILTERS, type TreeFilter } from './treeIndex';

interface TreeFilterChipsProps {
  value: TreeFilter;
  onChange: (filter: TreeFilter) => void;
  className?: string;
}

/** A wrapping row of toggle chips; pressing the active chip again goes back to All. */
export function TreeFilterChips({ value, onChange, className }: TreeFilterChipsProps) {
  const t = useTranslations('layout.sidebar.filters');
  return (
    <div role="group" aria-label={t('label')} className={cn('flex flex-wrap gap-1', className)}>
      {TREE_FILTERS.map((filter) => {
        const isActive = filter === value;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={isActive}
            data-testid={`tree-filter-${filter}`}
            onClick={() => onChange(isActive ? 'all' : filter)}
            className={cn(
              'inline-flex h-6 cursor-pointer items-center rounded-full border px-2 text-meta whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-primary bg-accent-soft text-primary'
                : 'border-line bg-surface-raised text-text-muted hover:border-line-strong hover:text-text',
            )}
          >
            {t(filter)}
          </button>
        );
      })}
    </div>
  );
}
