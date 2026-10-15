import { ChevronDown, ChevronRight, ClipboardPaste, Folder as FolderIcon, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { itemIdsInFolder } from '@resourcepackbuilder/core/project/tree';
import { filesFromDataTransfer, IconButton } from '@resourcepackbuilder/ui';
import { Collapsible, CollapsibleContent } from '@resourcepackbuilder/ui/components/collapsible';
import { moveFolder } from '../../commands/folders';
import { moveItem } from '../../commands/items';
import type { MenuEntry } from '../../components/MenuEntries';
import { useFolderActions } from '../../features/folder/useFolderActions';
import { useItemActions } from '../../features/item/useItemActions';
import { clipboardLabel, useClipboardStore } from '../../store/clipboard';
import { openDialog } from '../../store/dialogs';
import { select, setExpanded, useUiStore } from '../../store/ui';
import { ItemNode } from './ItemNode';
import { FOLDER_ICON_PADDING_PX, FOLDER_PADDING_PX, INDENT_PX, rowBadge, rowButton, rowIcon, rowLabel } from './rowStyles';
import type { SidebarTree } from './treeIndex';
import { activateOnKey, TreeRow } from './TreeRow';
import { DRAG_FILES, DRAG_FOLDER, DRAG_ITEM, useDropTarget } from './useDropTarget';

/** Accepts items and folders moved onto it, and files that become new items in it. */
function useFolderDrop(folderId: string) {
  return useDropTarget([DRAG_ITEM, DRAG_FOLDER, DRAG_FILES], (data) => {
    const itemId = data.getData(DRAG_ITEM);
    const draggedFolderId = data.getData(DRAG_FOLDER);
    if (itemId) moveItem(itemId, folderId);
    else if (draggedFolderId) {
      if (draggedFolderId !== folderId) moveFolder(draggedFolderId, folderId);
    } else {
      void filesFromDataTransfer(data).then((files) => {
        if (files.length) openDialog({ id: 'newItem', props: { folderId, files } });
      });
    }
  });
}

export function FolderNode({ folderId, depth, tree }: { folderId: string; depth: number; tree: SidebarTree }) {
  const t = useTranslations('layout.sidebar');
  const tCommon = useTranslations('common');
  const { project, search } = tree;
  const folder = project.folders[folderId];
  const isExpanded = useUiStore((s) => s.expanded[folderId] ?? true);
  const isSelected = useUiStore((s) => s.selection?.kind === 'folder' && s.selection.id === folderId);
  const clip = useClipboardStore((s) => s.clip);
  const folders = useFolderActions();
  const items = useItemActions();
  const drop = useFolderDrop(folderId);
  if (!folder || (search && !search.folders.has(folderId))) return null;

  const isOpen = search !== null || isExpanded;
  const count = tree.itemCounts.get(folderId) ?? 0;
  const newItem = () => openDialog({ id: 'newItem', props: { folderId } });
  const activate = () => {
    select({ kind: 'folder', id: folderId });
    if (!search) setExpanded(folderId, !isExpanded);
  };

  const entries: MenuEntry[] = [
    { icon: <Plus />, label: t('folderMenu.newItem'), onSelect: newItem },
    { icon: <FolderPlus />, label: t('folderMenu.newSubfolder'), onSelect: () => void folders.create(folderId) },
    { icon: <Pencil />, label: tCommon('rename'), onSelect: () => void folders.rename(folder) },
    {
      icon: <ClipboardPaste />,
      label: t('paste.label'),
      description: clip ? t('paste.fromItemIntoFolder', { name: clipboardLabel(clip) }) : t('paste.needsCopy'),
      disabled: !clip || count === 0,
      onSelect: () => items.pasteProperties(itemIdsInFolder(project, folderId)),
    },
    'separator',
    { icon: <Trash2 />, label: t('folderMenu.delete'), destructive: true, onSelect: () => void folders.remove(folder) },
  ];
  const visibleItemIds = search ? folder.itemIds.filter((id) => search.items.has(id)) : folder.itemIds;

  return (
    <Collapsible open={isOpen}>
      <TreeRow
        entries={entries}
        tip={folder.name}
        isSelected={isSelected}
        drop={drop}
        role="treeitem"
        tabIndex={0}
        aria-expanded={isOpen}
        style={{ paddingLeft: FOLDER_PADDING_PX + depth * INDENT_PX }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_FOLDER, folderId);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={activate}
        onDoubleClick={() => void folders.rename(folder)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && e.key === 'F2') {
            e.preventDefault();
            void folders.rename(folder);
          } else activateOnKey(activate)(e);
        }}
        actions={
          <IconButton label={t('newItemInFolder')} size="icon-xs" onClick={newItem}>
            <Plus />
          </IconButton>
        }
      >
        <span className="grid w-4 shrink-0 place-items-center text-muted-foreground">
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </span>
        <span className={rowIcon}>{isOpen ? <FolderOpen className="size-4" /> : <FolderIcon className="size-4" />}</span>
        <span className={rowLabel}>{folder.name}</span>
        <span className={rowBadge}>{count}</span>
      </TreeRow>
      <CollapsibleContent role="group">
        {folder.folderIds.map((id) => (
          <FolderNode key={id} folderId={id} depth={depth + 1} tree={tree} />
        ))}
        {visibleItemIds.map((id) => (
          <ItemNode key={id} itemId={id} depth={depth + 1} tree={tree} />
        ))}
        {folder.itemIds.length === 0 && folder.folderIds.length === 0 && !search && (
          <button
            type="button"
            className={cn(rowButton, 'h-8 w-full text-xs text-muted-foreground hover:bg-sidebar-accent')}
            style={{ paddingLeft: FOLDER_ICON_PADDING_PX + depth * INDENT_PX }}
            onClick={newItem}
          >
            <Plus className="size-3.5" /> {t('addItem')}
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
