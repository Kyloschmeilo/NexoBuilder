import { Box, ClipboardCopy, ClipboardPaste, Copy, FolderInput, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { StatusDot, Thumb } from '@resourcepackbuilder/ui';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { moveItem } from '../../commands/items';
import type { MenuEntry } from '../../components/MenuEntries';
import { useItemActions } from '../../features/item/useItemActions';
import { clipboardLabel, useClipboardStore } from '../../store/clipboard';
import { openDialog } from '../../store/dialogs';
import { select, useUiStore } from '../../store/ui';
import { INDENT_PX, ITEM_PADDING_PX, ROW_LABEL_CLASS } from './rowStyles';
import type { SidebarTree } from './treeIndex';
import { activateOnKey, TreeRow } from './TreeRow';
import { DRAG_ITEM, useDropTarget } from './useDropTarget';

export function ItemNode({ itemId, depth, tree }: { itemId: string; depth: number; tree: SidebarTree }) {
  const t = useTranslations('layout.sidebar');
  const tCommon = useTranslations('common');
  const item = tree.project.items[itemId];
  const isSelected = useUiStore((s) => s.selection?.kind === 'item' && s.selection.id === itemId);
  const thumb = useThumbnail(item?.model ?? null);
  const clip = useClipboardStore((s) => s.clip);
  const actions = useItemActions();
  // Another item dropped here is moved in front of this one
  const drop = useDropTarget([DRAG_ITEM], (data) => {
    const draggedId = data.getData(DRAG_ITEM);
    if (item && draggedId && draggedId !== itemId) moveItem(draggedId, item.folderId, itemId);
  });
  if (!item) return null;
  const level = tree.itemLevels.get(itemId);
  const show = () => select({ kind: 'item', id: itemId });

  const entries: MenuEntry[] = [
    { icon: <Copy />, label: tCommon('duplicate'), onSelect: () => actions.duplicate(item) },
    { icon: <FolderInput />, label: t('itemMenu.move'), onSelect: () => openDialog({ id: 'moveItem', props: { itemId } }) },
    'separator',
    {
      icon: <ClipboardCopy />,
      label: t('itemMenu.copyProperties'),
      description: t('itemMenu.copyPropertiesDescription'),
      onSelect: () => actions.copyProperties(itemId),
    },
    {
      icon: <ClipboardPaste />,
      label: t('paste.label'),
      description: clip ? t('paste.fromItem', { name: clipboardLabel(clip) }) : t('paste.needsCopy'),
      disabled: !clip || clip.sourceItemId === itemId,
      onSelect: () => actions.pasteProperties([itemId]),
    },
    'separator',
    { icon: <Trash2 />, label: tCommon('delete'), destructive: true, onSelect: () => void actions.remove(item) },
  ];

  return (
    <TreeRow
      entries={entries}
      isSelected={isSelected}
      drop={drop}
      role="treeitem"
      tabIndex={0}
      style={{ paddingLeft: ITEM_PADDING_PX + depth * INDENT_PX }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_ITEM, itemId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={show}
      onKeyDown={activateOnKey(show)}
    >
      <Thumb size={20} src={thumb} checkered={false} fallback={<Box className="size-3.75" />} />
      <span className={ROW_LABEL_CLASS}>{itemLabel(item)}</span>
      {level && <StatusDot tone={level} label={level === 'error' ? t('status.error') : t('status.warning')} />}
    </TreeRow>
  );
}
