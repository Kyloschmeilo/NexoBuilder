/** An item row of the sidebar tree. */
import { ClipboardCopy, ClipboardPaste, Copy, FolderInput, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { itemLabel } from '@resourcepackbuilder/core/project';
import { canCopyItemConfig, canPasteItemConfig, clipboardLabel } from '@resourcepackbuilder/core/nexo';
import { type MenuEntry, StatusDot, Thumb, TREE_INDENT_PX, treeRowSlots } from '@resourcepackbuilder/ui';
import { useThumbnail } from '../../components/useThumbnail';
import { moveItem } from '../../commands/items';
import { useItemActions } from '../../features/item/useItemActions';
import { useClipboardStore } from '../../store/clipboard';
import { moveItemDialog } from '../../features/moveItem/MoveItemDialog';
import { select, useUiStore } from '../../store/ui';
import { ITEM_PADDING_PX, ITEM_THUMB_PX } from './rowStyles';
import { ITEM_KIND_ICONS } from './itemKindIcons';
import { itemKindOf, type SidebarTree } from './treeIndex';
import { activateOnKey, TreeRow } from './TreeRow';
import { DRAG_ITEM, useDropTarget } from './useDropTarget';

/**
 * One item of the tree: its thumbnail (or the glyph of its kind), its name as plain text and a dot for its worst issue.
 * Click or Enter opens it; the context menu and the "more" button offer duplicate, move, copy and paste, and delete.
 */
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
  const KindIcon = ITEM_KIND_ICONS[itemKindOf(item, tree.project.target)];
  const canCopy = canCopyItemConfig(tree.project.target);
  const show = () => select({ kind: 'item', id: itemId });

  const entries: MenuEntry[] = [
    { icon: <Copy />, label: tCommon('duplicate'), onSelect: () => actions.duplicate(item) },
    { icon: <FolderInput />, label: t('itemMenu.move'), onSelect: () => moveItemDialog.openWithPayload({ itemId }) },
    // Copying works on Nexo's property groups; other targets do not offer it
    ...(canCopy
      ? ([
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
            disabled: !canPasteItemConfig(clip, tree.project.target) || clip.sourceId === itemId,
            onSelect: () => actions.pasteProperties([itemId]),
          },
        ] satisfies MenuEntry[])
      : []),
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
      style={{ paddingLeft: ITEM_PADDING_PX + depth * TREE_INDENT_PX }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_ITEM, itemId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={show}
      onKeyDown={activateOnKey(show)}
    >
      <Thumb size={ITEM_THUMB_PX} src={thumb} checkered={false} fallback={<KindIcon className="size-3.5 text-muted-foreground" />} />
      <span className={treeRowSlots.label}>{itemLabel(item)}</span>
      {level && <StatusDot tone={level} label={level === 'error' ? t('status.error') : t('status.warning')} />}
    </TreeRow>
  );
}
