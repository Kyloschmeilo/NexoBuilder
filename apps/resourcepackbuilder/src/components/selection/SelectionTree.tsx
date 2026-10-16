/** Folders, items and resource lists of a project to check and uncheck (export selection, paste targets). */
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Folder as FolderIcon, Frame, Music, Smile, type LucideIcon } from 'lucide-react';
import { cn } from 'cn';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { glyphTag } from '@resourcepackbuilder/core/nexo/glyphs/model';
import { MEDIA_KIND_LIST, MEDIA_KINDS, mediaId, mediaList, type MediaKind } from '@resourcepackbuilder/core/nexo/media/kinds';
import { itemIdsInFolder } from '@resourcepackbuilder/core/project/tree';
import {
  selectionState,
  setItemsSelected,
  setListSelected,
  type ExportSelection,
  type ListSelectionKey,
} from '@resourcepackbuilder/core/export/selection';
import { SectionLabel, TREE_INDENT_PX, treeRowSlots } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Empty, EmptyDescription } from '@resourcepackbuilder/ui/components/empty';
import { EntryRow, GroupRow } from './SelectionRows';

/** Projects with at most this many items start with every folder open; larger ones only show the top level. */
const OPEN_ALL_UP_TO_ITEMS = 40;
/** Left padding of a folder row on the top level. */
const FOLDER_PADDING_PX = 4;
/** Extra left padding of an item row relative to its folder (past the folder's checkbox and chevron). */
const ITEM_PADDING_PX = 24;

const MEDIA_ICONS: Record<MediaKind, LucideIcon> = { glyph: Smile, sound: Music, painting: Frame };

interface ResourceList {
  key: ListSelectionKey;
  label: string;
  icon: ReactNode;
  entries: Array<{ id: string; label: string }>;
}

interface SelectionTreeProps {
  project: Project;
  selection: ExportSelection;
  onChange: (selection: ExportSelection) => void;
  /** Hide glyphs, sounds and paintings (e.g. when choosing target items) */
  itemsOnly?: boolean;
}

function toggled(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function countLabel(ids: string[], excluded: ReadonlySet<string>): string {
  return `${ids.filter((id) => !excluded.has(id)).length}/${ids.length}`;
}

export function SelectionTree({ project, selection, onChange, itemsOnly }: SelectionTreeProps) {
  const t = useTranslations('dialogs.exportSelection');
  const itemCount = Object.keys(project.items).length;
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () => new Set(itemCount <= OPEN_ALL_UP_TO_ITEMS ? Object.keys(project.folders) : project.rootFolderIds),
  );
  const toggleOpen = (id: string) => setOpenIds((prev) => toggled(prev, id));
  const excludedItems = new Set(selection.excludedItemIds);

  const renderFolder = (folderId: string, depth: number, visited: Set<string>): ReactNode => {
    const folder = project.folders[folderId];
    if (!folder || visited.has(folderId)) return null;
    visited.add(folderId);
    const ids = itemIdsInFolder(project, folderId);
    if (ids.length === 0) return null;
    const isOpen = openIds.has(folderId);
    return (
      <div key={folderId}>
        <GroupRow
          label={t('folder', { name: folder.name })}
          state={selectionState(ids, selection.excludedItemIds)}
          onCheckedChange={(checked) => onChange(setItemsSelected(selection, ids, checked))}
          isOpen={isOpen}
          onToggle={() => toggleOpen(folderId)}
          style={{ paddingLeft: FOLDER_PADDING_PX + depth * TREE_INDENT_PX }}
        >
          <FolderIcon className={treeRowSlots.icon} />
          <span className={treeRowSlots.label}>{folder.name}</span>
          <span className={treeRowSlots.count}>{countLabel(ids, excludedItems)}</span>
        </GroupRow>
        {isOpen && (
          <>
            {folder.folderIds.map((child) => renderFolder(child, depth + 1, visited))}
            {folder.itemIds.map((itemId) => {
              const item = project.items[itemId];
              if (!item) return null;
              const isChecked = !excludedItems.has(itemId);
              return (
                <EntryRow
                  key={itemId}
                  isChecked={isChecked}
                  onCheckedChange={() => onChange(setItemsSelected(selection, [itemId], !isChecked))}
                  style={{ paddingLeft: FOLDER_PADDING_PX + ITEM_PADDING_PX + depth * TREE_INDENT_PX }}
                >
                  <span className={treeRowSlots.label}>{itemLabel(item)}</span>
                  <span className={treeRowSlots.count}>{item.nexoId}</span>
                </EntryRow>
              );
            })}
          </>
        )}
      </div>
    );
  };

  const lists: ResourceList[] = itemsOnly
    ? []
    : MEDIA_KIND_LIST.map((kind) => {
        const Icon = MEDIA_ICONS[kind];
        return {
          key: MEDIA_KINDS[kind].excludedKey,
          label: t(MEDIA_KINDS[kind].list),
          icon: <Icon className={treeRowSlots.icon} />,
          entries:
            kind === 'glyph'
              ? project.glyphs.map((glyph) => ({ id: glyph.id, label: glyphTag(glyph) }))
              : mediaList(project, kind).map((entry) => ({ id: entry.id, label: mediaId(kind, entry) })),
        };
      });
  const isEmpty = itemCount === 0 && lists.every((l) => l.entries.length === 0);
  const visited = new Set<string>();

  return (
    <div className="max-h-80 overflow-auto py-1">
      {project.rootFolderIds.map((id) => renderFolder(id, 0, visited))}
      {lists
        .filter((list) => list.entries.length > 0)
        .map((list) => {
          const ids = list.entries.map((e) => e.id);
          const excluded = new Set(selection[list.key] ?? []);
          const isOpen = openIds.has(list.key);
          return (
            <div key={list.key}>
              <GroupRow
                label={list.label}
                state={selectionState(ids, selection[list.key] ?? [])}
                onCheckedChange={(checked) => onChange(setListSelected(selection, list.key, ids, checked))}
                isOpen={isOpen}
                onToggle={() => toggleOpen(list.key)}
                style={{ paddingLeft: FOLDER_PADDING_PX }}
              >
                {list.icon}
                <span className={treeRowSlots.label}>{list.label}</span>
                <span className={treeRowSlots.count}>{countLabel(ids, excluded)}</span>
              </GroupRow>
              {isOpen &&
                list.entries.map((entry) => {
                  const isChecked = !excluded.has(entry.id);
                  return (
                    <EntryRow
                      key={entry.id}
                      isChecked={isChecked}
                      onCheckedChange={() => onChange(setListSelected(selection, list.key, [entry.id], !isChecked))}
                      style={{ paddingLeft: FOLDER_PADDING_PX + ITEM_PADDING_PX }}
                    >
                      <span className={cn(treeRowSlots.label, 'font-mono')}>{entry.label}</span>
                    </EntryRow>
                  );
                })}
            </div>
          );
        })}
      {isEmpty && (
        <Empty className="p-4">
          <EmptyDescription className="text-xs">{itemsOnly ? t('noItems') : t('emptyProject')}</EmptyDescription>
        </Empty>
      )}
    </div>
  );
}

interface SelectionHeaderProps {
  title: ReactNode;
  onAll: () => void;
  onNone: () => void;
  disabled?: boolean;
}

/** Caption above a {@link SelectionTree} with "All" and "None" buttons. */
export function SelectionHeader({ title, onAll, onNone, disabled }: SelectionHeaderProps) {
  const t = useTranslations('dialogs.selection');
  return (
    <SectionLabel
      actions={
        <>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={onAll}>
            {t('all')}
          </Button>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={onNone}>
            {t('none')}
          </Button>
        </>
      }
    >
      {title}
    </SectionLabel>
  );
}
