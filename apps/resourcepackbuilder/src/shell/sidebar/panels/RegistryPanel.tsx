/**
 * The master list of the Media and Logic activities: every registry view of the activity as a collapsible group of its
 * entries, with one search over all of them. Selecting a group opens the view's overview page, selecting an entry
 * opens that entry's editor; each group (and sub-group) has a "New …" button, and media groups also take dropped
 * files. A view without a registry is listed as a plain page link.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import {
  FILES_DRAG_TYPE,
  filesFromDataTransfer,
  IconButton,
  StatusDot,
  TREE_INDENT_PX,
  TreeChevron,
  Tip,
  treeRow,
  treeRowSlots,
} from '@resourcepackbuilder/ui';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@resourcepackbuilder/ui/components/input-group';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { usePlan } from '../../PlanProvider';
import { useOpenProject } from '../../../store/project';
import { type ActivityId, selectEntry, setExpanded, useUiStore, type ViewName } from '../../../store/ui';
import { useDropTarget } from '../useDropTarget';
import { PanelHeader } from './PanelHeader';
import {
  entryCount,
  filterGroups,
  type Registry,
  type RegistryEntry,
  type RegistryGroup,
  type RegistryTable,
  worstEntryLevel,
} from './registry';
import { useRegistryGroupText } from './useRegistryGroupText';

/** A view the panel lists, with its icon. */
export interface PanelView {
  view: ViewName;
  icon: ReactNode;
}

/** The key of a registry's expanded state in the UI store's `expanded` map. */
const expandedKey = (view: ViewName) => `registry:${view}`;

/** What of `view` the page shows: nothing of it, its overview, or one of its entries. */
function useSelected(view: ViewName): { isView: boolean; entry: string | undefined } {
  // A string, so the store hook compares by value: '' (not this view), '*' (overview) or ':<entry key>'
  const selected = useUiStore((s) => {
    const selection = s.selection;
    if (selection?.kind !== 'view' || selection.view !== view) return '';
    return selection.entry === undefined ? '*' : `:${selection.entry}`;
  });
  return { isView: selected === '*', entry: selected.startsWith(':') ? selected.slice(1) : undefined };
}

/** One entry row, indented below its group. */
function EntryRow({
  view,
  entry,
  depth,
  untitled,
  isSelected,
}: {
  view: ViewName;
  entry: RegistryEntry;
  depth: number;
  untitled: string;
  isSelected: boolean;
}) {
  const tStatus = useTranslations('layout.sidebar.status');
  return (
    <div role="treeitem" aria-selected={isSelected} className={treeRow({ selected: isSelected })} data-selected={isSelected || undefined}>
      <button
        type="button"
        aria-current={isSelected ? 'page' : undefined}
        className={treeRowSlots.button}
        style={{ paddingLeft: 8 + depth * TREE_INDENT_PX }}
        onClick={() => selectEntry(view, entry.key)}
      >
        {entry.thumb !== undefined && (
          <img src={entry.thumb} alt="" className="size-4 shrink-0 rounded-[2px] object-contain [image-rendering:pixelated]" />
        )}
        <span className={cn(treeRowSlots.label, !entry.label && 'text-muted-foreground italic')}>{entry.label || untitled}</span>
        {entry.level && entry.level !== 'info' && <StatusDot tone={entry.level} label={tStatus(entry.level)} />}
        {entry.detail && <span className={cn(treeRowSlots.count, 'max-w-24 truncate')}>{entry.detail}</span>}
      </button>
    </div>
  );
}

/** The "New …" button of a group; shown while the row is hovered or focused. */
function AddButton({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <IconButton
      label={label}
      size="icon-xs"
      className="mr-1 shrink-0 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100"
      onClick={onAdd}
    >
      <Plus />
    </IconButton>
  );
}

/** A sub-group heading (e.g. "Configured features") with its own "New …" button. */
function SubGroupRow({ group, onAdd }: { group: RegistryGroup; onAdd: () => void }) {
  const text = useRegistryGroupText();
  return (
    <div className={treeRow()} role="none">
      <span
        className="flex min-w-0 flex-1 items-center gap-1.5 pr-1 text-meta font-semibold text-muted-foreground"
        style={{ paddingLeft: 8 + TREE_INDENT_PX }}
      >
        <span className="min-w-0 flex-1 truncate">{text(group.id, 'title')}</span>
        <span className={cn(treeRowSlots.count, 'font-normal')}>{group.entries.length}</span>
      </span>
      <AddButton label={text(group.id, 'add')} onAdd={onAdd} />
    </div>
  );
}

/** A registry view: its heading row (opens the overview) and, while expanded, its entries. */
function RegistryNode({ registry, icon, query }: { registry: Registry; icon: ReactNode; query: string }) {
  const t = useTranslations('layout.sidebar.resources');
  const text = useRegistryGroupText();
  const project = useOpenProject();
  const plan = usePlan();
  const { view } = registry;
  const add = registry.useAdd();
  const selected = useSelected(view);
  const allGroups = useMemo(() => registry.groups(project, plan), [registry, project, plan]);
  // Until toggled, a registry with entries starts expanded and an empty one collapsed
  const isExpandedStored = useUiStore((s) => s.expanded[expandedKey(view)]) ?? entryCount(allGroups) > 0;
  const groups = filterGroups(allGroups, query);
  const isSearching = query.trim() !== '';
  const label = t(`${view}.label` as `glyphs.label`);
  const matchesLabel = label.toLowerCase().includes(query.trim().toLowerCase());
  const drop = useDropTarget(add.accept ? [FILES_DRAG_TYPE] : [], (data) => {
    void filesFromDataTransfer(data).then(async (files) => {
      const key = files.length && add.addFiles ? await add.addFiles(files) : null;
      if (key) selectEntry(view, key);
    });
  });

  if (isSearching && groups.length === 0 && !matchesLabel) return null;
  const isExpanded = isSearching || isExpandedStored;
  const level = worstEntryLevel(allGroups);
  const isSingle = allGroups.length === 1;
  const runAdd = (group: string) => {
    void add.add(group).then((key) => {
      if (key) selectEntry(view, key);
    });
  };

  return (
    // The tree item owns its heading row and the group of its entries
    <div
      role="treeitem"
      aria-expanded={isExpanded}
      aria-selected={selected.isView}
      aria-label={label}
      className={cn('rounded-sm', drop.isOver && 'bg-primary/10 outline-1 -outline-offset-1 outline-primary outline-dashed')}
      {...drop.handlers}
    >
      <div className={treeRow({ selected: selected.isView })} data-selected={selected.isView || undefined}>
        <TreeChevron isOpen={isExpanded} onToggle={() => setExpanded(expandedKey(view), !isExpanded)} />
        <Tip label={t(`${view}.hint` as `glyphs.hint`)} side="right">
          <button
            type="button"
            aria-current={selected.isView ? 'page' : undefined}
            className={treeRowSlots.button}
            onClick={() => selectEntry(view)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' && !isExpanded) setExpanded(expandedKey(view), true);
              if (e.key === 'ArrowLeft' && isExpanded) setExpanded(expandedKey(view), false);
            }}
          >
            <span className={treeRowSlots.icon}>{icon}</span>
            <span className={cn(treeRowSlots.label, 'font-medium')}>{label}</span>
            {level && level !== 'info' && <StatusDot tone={level} />}
            <span className={treeRowSlots.count}>{entryCount(allGroups)}</span>
          </button>
        </Tip>
        {isSingle && <AddButton label={text(allGroups[0]!.id, 'add')} onAdd={() => runAdd(allGroups[0]!.id)} />}
      </div>
      {isExpanded && (
        <div role="group">
          {(isSearching ? groups : allGroups).map((group) => (
            <div key={group.id}>
              {!isSingle && <SubGroupRow group={group} onAdd={() => runAdd(group.id)} />}
              {group.entries.map((entry) => (
                <EntryRow
                  key={entry.key}
                  view={view}
                  entry={entry}
                  depth={isSingle ? 1 : 2}
                  untitled={text(group.id, 'untitled')}
                  isSelected={selected.entry === entry.key}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A view without a registry: a link to its page. */
function ViewRow({ view, icon, query }: PanelView & { query: string }) {
  const t = useTranslations('layout.sidebar.resources');
  const selected = useSelected(view);
  const isSelected = selected.isView || selected.entry !== undefined;
  const label = t(`${view}.label` as `glyphs.label`);
  if (query.trim() && !label.toLowerCase().includes(query.trim().toLowerCase())) return null;
  return (
    <div role="treeitem" aria-selected={isSelected} className={treeRow({ selected: isSelected })} data-selected={isSelected || undefined}>
      <Tip label={t(`${view}.hint` as `glyphs.hint`)} side="right">
        <button
          type="button"
          aria-current={isSelected ? 'page' : undefined}
          className={cn(treeRowSlots.button, 'pl-5')}
          onClick={() => selectEntry(view)}
        >
          <span className={treeRowSlots.icon}>{icon}</span>
          <span className={cn(treeRowSlots.label, 'font-medium')}>{label}</span>
        </button>
      </Tip>
    </div>
  );
}

/** The panel of a registry activity: its title, a search over all entries and the registry groups. */
export function RegistryPanel({
  activity,
  views,
  registries,
}: {
  activity: ActivityId;
  views: readonly PanelView[];
  registries: RegistryTable;
}) {
  const t = useTranslations('layout.activities');
  const tRegistry = useTranslations('media.registry');
  const tViews = useTranslations('layout.sidebar.resources');
  const project = useOpenProject();
  const plan = usePlan();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const hasMatch =
    !needle ||
    views.some(({ view }) => {
      const registry = registries[view];
      if (
        tViews(`${view}.label` as `glyphs.label`)
          .toLowerCase()
          .includes(needle)
      )
        return true;
      return registry ? filterGroups(registry.groups(project, plan), query).length > 0 : false;
    });
  return (
    <>
      <PanelHeader title={t(`${activity}.label`)} />
      <div className="px-2.5 pb-2">
        <InputGroup className="h-7.5">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={tRegistry('search')}
            placeholder={tRegistry('search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div role="tree" aria-label={t(`${activity}.label`)} className="flex flex-col gap-px px-1.5 pt-0.5 pb-4">
          {views.map(({ view, icon }) => {
            const registry = registries[view];
            return registry ? (
              <RegistryNode key={view} registry={registry} icon={icon} query={query} />
            ) : (
              <ViewRow key={view} view={view} icon={icon} query={query} />
            );
          })}
          {!hasMatch && (
            <p role="status" className="px-2 pt-6 text-center text-meta text-muted-foreground">
              {tRegistry('noMatches')}
            </p>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
