/**
 * Parts shared by the registry pages (media and CraftEngine): the overview's entry table with its empty state, the
 * header's file path and the muted hint line under the header.
 */
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { EmptyHint, Help, Panel, StatusDot } from '@resourcepackbuilder/ui';
import type { RegistryGroup } from '../../shell/sidebar/panels/registry';
import { useRegistryGroupText } from '../../shell/sidebar/panels/useRegistryGroupText';
import { selectEntry, type ViewName } from '../../store/ui';

/** The entries of one group as a table of rows that open the entry; an empty group shows its "No … yet" hint. */
export function EntryTable({ view, group, onAdd }: { view: ViewName; group: RegistryGroup; onAdd?: () => void }) {
  const text = useRegistryGroupText();
  const tStatus = useTranslations('layout.sidebar.status');
  if (group.entries.length === 0) {
    return (
      <EmptyHint actionLabel={onAdd ? text(group.id, 'add') : undefined} onAction={onAdd}>
        {text(group.id, 'empty')}
      </EmptyHint>
    );
  }
  return (
    <Panel className="overflow-hidden">
      <ul className="m-0 flex list-none flex-col p-0">
        {group.entries.map((entry) => (
          <li key={entry.key} className="border-t border-line first:border-t-0">
            <button
              type="button"
              className="flex h-9 w-full min-w-0 items-center gap-2.5 px-3 text-left text-label outline-none hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              onClick={() => selectEntry(view, entry.key)}
            >
              {entry.thumb !== undefined && (
                <img src={entry.thumb} alt="" className="size-5 shrink-0 rounded-[2px] object-contain [image-rendering:pixelated]" />
              )}
              <span className={cn('min-w-0 flex-1 truncate font-mono', !entry.label && 'font-sans text-text-muted italic')}>
                {entry.label || text(group.id, 'untitled')}
              </span>
              {entry.level && entry.level !== 'info' && <StatusDot tone={entry.level} label={tStatus(entry.level)} />}
              {entry.detail && <span className="max-w-48 truncate font-mono text-micro text-text-muted">{entry.detail}</span>}
              <ChevronRight className="size-3.5 shrink-0 text-text-faint" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The path of the written file in the header's meta line (mono, truncated, full path as tooltip). */
export function FilePath({ path }: { path: string }) {
  return (
    <code title={path} className="max-w-full min-w-0 truncate rounded-sm border border-line px-1.5 font-mono text-micro text-text-muted">
      {path}
    </code>
  );
}

/** The explanation of a page below its header: one truncated muted line, with the full text in the ⓘ popover. */
export function PageHint({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-1">
      <p className="m-0 min-w-0 truncate text-meta text-text-muted">{children}</p>
      <Help>{children}</Help>
    </div>
  );
}
