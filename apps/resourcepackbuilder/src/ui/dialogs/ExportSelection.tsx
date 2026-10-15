/** Selection in the export dialog: which projects, and which folders, items and glyphs within them, are exported. */
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Folder as FolderIcon, Frame, LoaderCircle, Music, Smile } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import type { Project } from '@resourcepackbuilder/core/types';
import {
  countSelected,
  itemIdsInFolder,
  selectionState,
  setItemsSelected,
  setListSelected,
  type ListSelectionKey,
  SELECT_ALL,
  type ExportSelection,
} from '@resourcepackbuilder/core/export/selection';
import type { ProjectSummary } from '../../state/persistence';
import { itemLabel } from '../layout/Sidebar';

type CheckState = 'all' | 'none' | 'some';

const ROW = 'flex min-h-8 cursor-pointer items-center gap-2 rounded-sm pr-3 text-sm text-foreground select-none hover:bg-muted';
const LABEL = 'min-w-0 flex-1 truncate';
const COUNT = 'font-mono text-[11px] leading-4 whitespace-nowrap text-muted-foreground';
const ICON = 'size-[15px] shrink-0 text-muted-foreground';

/** Checkbox with indeterminate state ("partially selected"); clicks do not reach the row. */
function Check({ state, onChange, label }: { state: CheckState; onChange: (checked: boolean) => void; label: string }) {
  return (
    <Checkbox
      aria-label={label}
      checked={state === 'all'}
      indeterminate={state === 'some'}
      onCheckedChange={() => onChange(state !== 'all')}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function Chevron({ open }: { open: boolean }) {
  return <span className="grid w-3.5 shrink-0 place-items-center text-muted-foreground">{open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</span>;
}

interface TreeProps {
  project: Project;
  selection: ExportSelection;
  onChange: (selection: ExportSelection) => void;
  /** Do not show glyphs (e.g. when selecting target items) */
  itemsOnly?: boolean;
}

/** Folders, items and glyphs of a project to check and uncheck */
export function SelectionTree({ project, selection, onChange, itemsOnly }: TreeProps) {
  const t = useTranslations('dialogs.exportSelection');
  const itemCount = Object.keys(project.items).length;
  const [open, setOpen] = useState<Set<string>>(() => new Set(itemCount <= 40 ? Object.keys(project.folders) : project.rootFolderIds));
  const glyphs = project.glyphs ?? [];

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderFolder = (folderId: string, depth: number, guard: Set<string>): ReactNode => {
    const folder = project.folders[folderId];
    if (!folder || guard.has(folderId)) return null;
    guard.add(folderId);
    const ids = itemIdsInFolder(project, folderId);
    if (ids.length === 0) return null;
    const state = selectionState(ids, selection.excludedItemIds);
    const isOpen = open.has(folderId);
    const excluded = new Set(selection.excludedItemIds);
    return (
      <div key={folderId}>
        <div className={ROW} style={{ paddingLeft: 4 + depth * 16 }} onClick={() => toggleOpen(folderId)}>
          <Chevron open={isOpen} />
          <Check state={state} label={t('folder', { name: folder.name })} onChange={(checked) => onChange(setItemsSelected(selection, ids, checked))} />
          <FolderIcon className={ICON} />
          <span className={LABEL}>{folder.name}</span>
          <span className={COUNT}>
            {ids.filter((id) => !excluded.has(id)).length}/{ids.length}
          </span>
        </div>
        {isOpen && (
          <>
            {folder.folderIds.map((child) => renderFolder(child, depth + 1, guard))}
            {folder.itemIds.map((itemId) => {
              const item = project.items[itemId];
              if (!item) return null;
              const checked = !excluded.has(itemId);
              return (
                <label key={itemId} className={ROW} style={{ paddingLeft: 24 + (depth + 1) * 16 }}>
                  <Checkbox checked={checked} onCheckedChange={() => onChange(setItemsSelected(selection, [itemId], !checked))} />
                  <span className={LABEL}>{itemLabel(item)}</span>
                  <span className={COUNT}>{item.nexoId}</span>
                </label>
              );
            })}
          </>
        )}
      </div>
    );
  };

  const guard = new Set<string>();
  const lists: Array<{ key: ListSelectionKey; open: string; label: string; icon: ReactNode; entries: Array<{ id: string; label: string }> }> = itemsOnly
    ? []
    : [
        {
          key: 'excludedGlyphIds',
          open: '$glyphs',
          label: t('glyphs'),
          icon: <Smile className={ICON} />,
          entries: glyphs.map((g) => ({ id: g.id, label: `<glyph:${g.glyphId}>` })),
        },
        {
          key: 'excludedSoundIds',
          open: '$sounds',
          label: t('sounds'),
          icon: <Music className={ICON} />,
          entries: (project.sounds ?? []).map((s) => ({ id: s.id, label: s.soundId })),
        },
        {
          key: 'excludedPaintingIds',
          open: '$paintings',
          label: t('paintings'),
          icon: <Frame className={ICON} />,
          entries: (project.paintings ?? []).map((p) => ({ id: p.id, label: p.paintingId })),
        },
      ];
  const isEmpty = itemCount === 0 && lists.every((l) => l.entries.length === 0);

  return (
    <div className="max-h-80 overflow-auto py-1">
      {project.rootFolderIds.map((id) => renderFolder(id, 0, guard))}
      {lists
        .filter((list) => list.entries.length > 0)
        .map((list) => {
          const ids = list.entries.map((e) => e.id);
          const excluded = new Set(selection[list.key] ?? []);
          const isOpen = open.has(list.open);
          return (
            <div key={list.key}>
              <div className={ROW} style={{ paddingLeft: 4 }} onClick={() => toggleOpen(list.open)}>
                <Chevron open={isOpen} />
                <Check
                  state={selectionState(ids, selection[list.key] ?? [])}
                  label={list.label}
                  onChange={(checked) => onChange(setListSelected(selection, list.key, ids, checked))}
                />
                {list.icon}
                <span className={LABEL}>{list.label}</span>
                <span className={COUNT}>
                  {ids.filter((id) => !excluded.has(id)).length}/{ids.length}
                </span>
              </div>
              {isOpen &&
                list.entries.map((entry) => {
                  const checked = !excluded.has(entry.id);
                  return (
                    <label key={entry.id} className={ROW} style={{ paddingLeft: 40 }}>
                      <Checkbox checked={checked} onCheckedChange={() => onChange(setListSelected(selection, list.key, [entry.id], !checked))} />
                      <span className={cn(LABEL, 'font-mono')}>{entry.label}</span>
                    </label>
                  );
                })}
            </div>
          );
        })}
      {isEmpty && <div className="px-2 py-1.5 text-xs text-muted-foreground">{itemsOnly ? t('noItems') : t('emptyProject')}</div>}
    </div>
  );
}

export interface ProjectChoice {
  summary: ProjectSummary;
  /** loaded project (null = still loading) */
  project: Project | null;
  current: boolean;
}

interface ProjectPickerProps {
  choices: ProjectChoice[];
  included: Set<string>;
  selections: Record<string, ExportSelection>;
  expanded: string | null;
  onToggleProject: (id: string, include: boolean) => void;
  onExpand: (id: string | null) => void;
  onSelectionChange: (id: string, selection: ExportSelection) => void;
}

/** List of all saved projects; the expanded one shows its folder tree. */
export function ProjectPicker({ choices, included, selections, expanded, onToggleProject, onExpand, onSelectionChange }: ProjectPickerProps) {
  const t = useTranslations('dialogs.exportSelection');
  return (
    <div className="flex max-h-[360px] flex-col gap-1.5 overflow-auto">
      {choices.map(({ summary, project, current }) => {
        const isIncluded = included.has(summary.id);
        const isExpanded = expanded === summary.id && isIncluded;
        const selection = selections[summary.id] ?? SELECT_ALL;
        const counts = project ? countSelected(project, selection) : null;
        const total = project ? Object.keys(project.items).length : summary.itemCount;
        return (
          <div key={summary.id} className={cn('rounded-md border border-border transition-colors', isIncluded && 'border-primary/50')}>
            <div className={cn(ROW, 'h-10 pl-1')} onClick={() => isIncluded && onExpand(isExpanded ? null : summary.id)}>
              <span className="grid w-3.5 shrink-0 place-items-center">{isIncluded ? <Chevron open={isExpanded} /> : null}</span>
              <Checkbox
                aria-label={t('project', { name: summary.name })}
                checked={isIncluded}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => onToggleProject(summary.id, !isIncluded)}
              />
              <span className={cn(LABEL, 'font-medium')}>{summary.name}</span>
              {current && (
                <Badge variant="outline" className="font-heading text-[11px] tracking-wider text-muted-foreground uppercase">
                  {t('open')}
                </Badge>
              )}
              <span className={COUNT}>
                {isIncluded && !project ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : isIncluded && counts ? (
                  [
                    t('selectedItems', { selected: counts.items, total }),
                    counts.glyphs ? t('glyphCount', { count: counts.glyphs }) : null,
                    counts.sounds ? t('soundCount', { count: counts.sounds }) : null,
                    counts.paintings ? t('paintingCount', { count: counts.paintings }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                ) : (
                  t('itemCount', { count: total })
                )}
              </span>
            </div>
            {isExpanded && project && (
              <SelectionTree project={project} selection={selection} onChange={(next) => onSelectionChange(summary.id, next)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
