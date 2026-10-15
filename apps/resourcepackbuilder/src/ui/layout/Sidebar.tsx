import { useMemo, useState, type ComponentProps, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  Box,
  ChevronDown,
  ClipboardCopy,
  ClipboardPaste,
  ChevronRight,
  Copy,
  EllipsisVertical,
  Folder as FolderIcon,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Frame,
  Music,
  Pencil,
  Plus,
  Search,
  Server,
  Smile,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import type { Folder, Item, Project } from '@resourcepackbuilder/core/types';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { getDescendantFolderIds } from '@resourcepackbuilder/core/project/tree';
import { itemIdsInFolder } from '@resourcepackbuilder/core/export/selection';
import { stripMiniMessage, filesFromDataTransfer } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@resourcepackbuilder/ui/components/input-group';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { Collapsible, CollapsibleContent } from '@resourcepackbuilder/ui/components/collapsible';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@resourcepackbuilder/ui/components/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { addFolder, deleteFolder, deleteItem, duplicateItem, moveFolder, moveItem, renameFolder } from '../../state/actions';
import { useStore } from '../../state/store';
import { isTestServerAvailable, useTestServerStore } from '../../state/testserver';
import type { TestServerStatus } from '../../state/desktop';
import { clipboardLabel, copyItemProperties, openPasteDialog, useItemClipboard } from '../../state/clipboard';
import { translator } from '../../i18n/locale';
import { MenuEntries, StatusDot, Tip, type DotTone, type MenuEntry } from './parts';

const DRAG_ITEM = 'application/x-resourcepackbuilder-item';
const DRAG_FOLDER = 'application/x-resourcepackbuilder-folder';

export function itemLabel(item: Item): string {
  return stripMiniMessage(item.displayName).trim() || item.nexoId;
}

export function promptNewFolder(parentId: string | null) {
  const t = translator('layout');
  useStore.getState().openDialog({
    type: 'prompt',
    title: parentId ? t('folder.newSubfolderTitle') : t('folder.newFolderTitle'),
    label: t('folder.nameLabel'),
    initial: '',
    confirmLabel: translator('common')('create'),
    onSubmit: (name) => addFolder(name, parentId),
  });
}

/** Asks for a new folder name and renames the folder. */
export function promptRenameFolder(folder: Folder) {
  const t = translator('layout');
  useStore.getState().openDialog({
    type: 'prompt',
    title: t('folder.renameTitle'),
    label: t('folder.renameLabel'),
    initial: folder.name,
    confirmLabel: translator('common')('rename'),
    onSubmit: (name) => renameFolder(folder.id, name),
  });
}

function confirmDeleteFolder(project: Project, folder: Folder) {
  const t = translator('layout');
  const ids = getDescendantFolderIds(project, folder.id);
  const itemCount = ids.reduce((n, id) => n + (project.folders[id]?.itemIds.length ?? 0), 0);
  useStore.getState().openDialog({
    type: 'confirm',
    title: t('folder.deleteTitle'),
    message:
      itemCount > 0
        ? `${t('folder.deleteContents', { name: folder.name, items: itemCount, subfolders: ids.length - 1 })}\n\n${t('folder.undoHint')}`
        : t('folder.deleteEmpty', { name: folder.name }),
    confirmLabel: translator('common')('delete'),
    danger: true,
    onConfirm: () => deleteFolder(folder.id),
  });
}

export function confirmDeleteItem(item: Item) {
  const t = translator('layout');
  useStore.getState().openDialog({
    type: 'confirm',
    title: t('item.deleteTitle'),
    message: `${t('item.deleteMessage', { name: itemLabel(item), id: item.nexoId })}\n\n${t('folder.undoHint')}`,
    confirmLabel: translator('common')('delete'),
    danger: true,
    onConfirm: () => deleteItem(item.id),
  });
}

/** Classes of one row in the tree (folders, items and the fixed entries below the tree). */
function rowClass(selected: boolean, dropActive = false) {
  return cn(
    'group/row flex h-8 cursor-pointer items-center gap-1.5 rounded-sm pr-1 text-sm outline-none select-none',
    'hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50',
    selected && 'bg-primary/10 ring-1 ring-primary ring-inset hover:bg-primary/15',
    dropActive && 'bg-primary/10 outline-1 -outline-offset-1 outline-primary outline-dashed',
  );
}

/** Enter and Space activate a focused tree row like a click. */
function activateOnKey(action: () => void) {
  return (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
}

const rowIcon = 'grid shrink-0 place-items-center text-muted-foreground group-data-selected/row:text-primary';
const rowLabel = 'min-w-0 flex-1 truncate';
const rowBadge = 'px-1 font-mono text-xs text-muted-foreground';

export function Sidebar({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('layout.sidebar');
  const project = useStore((s) => s.project)!;
  const [query, setQuery] = useState('');
  const [rootDrop, setRootDrop] = useState(false);

  const status = useMemo(() => {
    const map = new Map<string, 'error' | 'warning'>();
    for (const issue of plan?.issues ?? []) {
      if (!issue.itemId || issue.level === 'info') continue;
      if (issue.level === 'error' || !map.has(issue.itemId)) map.set(issue.itemId, issue.level);
    }
    return map;
  }, [plan]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    const set = new Set<string>();
    for (const item of Object.values(project.items)) {
      if (itemLabel(item).toLowerCase().includes(q) || item.nexoId.includes(q)) set.add(item.id);
    }
    return set;
  }, [q, project.items]);

  return (
    <aside className="flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between pt-3 pr-3 pb-2 pl-4 font-heading text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        <span>{t('title')}</span>
        <Tip label={t('newFolder')}>
          <Button variant="ghost" size="sm" className="font-sans tracking-normal normal-case" onClick={() => promptNewFolder(null)}>
            <FolderPlus /> {t('folderButton')}
          </Button>
        </Tip>
      </div>
      <div className="px-3 pb-2">
        <InputGroup className="h-7.5">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput placeholder={t('searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </InputGroup>
      </div>
      <ScrollArea
        className={cn('min-h-0 flex-1', rootDrop && 'bg-primary/10')}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_FOLDER)) {
            e.preventDefault();
            setRootDrop(true);
          }
        }}
        onDragLeave={() => setRootDrop(false)}
        onDrop={(e) => {
          setRootDrop(false);
          const folderId = e.dataTransfer.getData(DRAG_FOLDER);
          if (folderId) {
            e.preventDefault();
            moveFolder(folderId, null);
          }
        }}
      >
        <div role="tree" className="px-2 pt-0.5 pb-4">
          {project.rootFolderIds.length === 0 ? (
            <Empty className="px-2 pt-10">
              <EmptyHeader>
                <EmptyMedia>
                  <FolderPlus className="size-8 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle className="font-heading text-base tracking-[0.04em] uppercase">{t('empty.title')}</EmptyTitle>
                <EmptyDescription className="text-xs">{t('empty.description')}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => promptNewFolder(null)}>
                  <FolderPlus /> {t('empty.action')}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            project.rootFolderIds.map((id) => (
              <FolderNode key={id} project={project} folderId={id} depth={0} status={status} matches={matches} />
            ))
          )}
        </div>
      </ScrollArea>
      <ResourceEntries plan={plan} />
      {isTestServerAvailable() && <TestServerEntry />}
    </aside>
  );
}

const TEST_SERVER_TONE: Record<TestServerStatus, DotTone> = {
  stopped: 'neutral',
  preparing: 'busy',
  starting: 'busy',
  running: 'success',
  stopping: 'busy',
  error: 'error',
};

function TestServerEntry() {
  const t = useTranslations('layout.sidebar.testServer');
  const selected = useStore((s) => s.selection?.kind === 'testserver');
  const status = useTestServerStore((s) => s.state?.status ?? 'stopped');
  const select = () => useStore.getState().select({ kind: 'testserver' });
  return (
    <div className="px-1.5 pb-2">
      <div
        role="button"
        tabIndex={0}
        data-selected={selected || undefined}
        className={cn(rowClass(selected), 'pl-2')}
        onClick={select}
        onKeyDown={activateOnKey(select)}
        title={t('hint')}
      >
        <span className={cn(rowIcon, 'text-primary')}>
          <Server className="size-4" />
        </span>
        <span className={rowLabel}>{t('label')}</span>
        {status !== 'stopped' && <StatusDot tone={TEST_SERVER_TONE[status]} />}
        <span className={rowBadge}>{t(`status.${status}`)}</span>
      </div>
    </div>
  );
}

/** Project-wide lists below the tree: glyphs, sounds, paintings */
function ResourceEntries({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('layout.sidebar.resources');
  const project = useStore((s) => s.project)!;
  const selection = useStore((s) => s.selection);
  const entries = [
    { kind: 'glyphs' as const, icon: <Smile className="size-4" />, count: project.glyphs?.length ?? 0, issueKey: 'glyphId' as const },
    { kind: 'sounds' as const, icon: <Music className="size-4" />, count: project.sounds?.length ?? 0, issueKey: 'soundId' as const },
    { kind: 'paintings' as const, icon: <Frame className="size-4" />, count: project.paintings?.length ?? 0, issueKey: 'paintingId' as const },
  ];
  return (
    <div className="border-t border-sidebar-border px-1.5 pt-1.5 pb-2">
      {entries.map((entry) => {
        const relevant = plan?.issues.filter((i) => i[entry.issueKey] && i.level !== 'info') ?? [];
        const state = relevant.some((i) => i.level === 'error') ? 'error' : relevant.length ? 'warning' : null;
        const selected = selection?.kind === entry.kind;
        const select = () => useStore.getState().select({ kind: entry.kind });
        return (
          <div
            key={entry.kind}
            role="button"
            tabIndex={0}
            data-selected={selected || undefined}
            className={cn(rowClass(selected), 'pl-2')}
            onClick={select}
            onKeyDown={activateOnKey(select)}
            title={t(`${entry.kind}.hint`)}
          >
            <span className={rowIcon}>{entry.icon}</span>
            <span className={rowLabel}>{t(`${entry.kind}.label`)}</span>
            {state && <StatusDot tone={state} />}
            <span className={rowBadge}>{entry.count}</span>
          </div>
        );
      })}
    </div>
  );
}

interface NodeProps {
  project: Project;
  depth: number;
  status: Map<string, 'error' | 'warning'>;
  matches: Set<string> | null;
}

function folderHasMatch(project: Project, folderId: string, matches: Set<string>): boolean {
  return getDescendantFolderIds(project, folderId).some((id) => project.folders[id]?.itemIds.some((i) => matches.has(i)));
}

/**
 * A tree row with a right-click context menu and a "more" dropdown offering the same entries.
 * The hover actions stay visible while the row is selected or its dropdown is open.
 */
function TreeRow({
  entries,
  actions,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof ContextMenuTrigger>, 'children' | 'className'> & {
  entries: MenuEntry[];
  actions?: ReactNode;
  className: string;
  children: ReactNode;
}) {
  const t = useTranslations('layout.sidebar');
  return (
    <ContextMenu>
      <ContextMenuTrigger className={className} {...props}>
        {children}
        <span className="hidden gap-0.5 group-hover/row:flex group-focus-visible/row:flex group-data-selected/row:flex has-data-popup-open:flex">
          {actions}
          <DropdownMenu>
            <Tip label={t('more')}>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label={t('more')} />}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <EllipsisVertical />
              </DropdownMenuTrigger>
            </Tip>
            {/* The popup is portalled, but React still bubbles its events to the row: keep clicks from selecting it. */}
            <DropdownMenuContent
              align="end"
              className="w-68"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            >
              <MenuEntries kind="dropdown" entries={entries} />
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-68">
        <MenuEntries kind="context" entries={entries} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FolderNode({ project, folderId, depth, status, matches }: NodeProps & { folderId: string }) {
  const t = useTranslations('layout.sidebar');
  const tc = useTranslations('common');
  const folder = project.folders[folderId];
  const expanded = useStore((s) => s.expanded[folderId] ?? true);
  const selected = useStore((s) => s.selection?.kind === 'folder' && s.selection.id === folderId);
  const [dropActive, setDropActive] = useState(false);
  const clip = useItemClipboard((s) => s.clip);
  if (!folder) return null;
  if (matches && !folderHasMatch(project, folderId, matches)) return null;
  const open = matches ? true : expanded;
  const count = getDescendantFolderIds(project, folderId).reduce((n, id) => n + (project.folders[id]?.itemIds.length ?? 0), 0);
  const newItem = () => useStore.getState().openDialog({ type: 'newItem', folderId });

  const onDragOver = (e: DragEvent) => {
    const types = e.dataTransfer.types;
    if (types.includes(DRAG_ITEM) || types.includes(DRAG_FOLDER) || types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(true);
    }
  };
  const onDrop = async (e: DragEvent) => {
    setDropActive(false);
    const itemId = e.dataTransfer.getData(DRAG_ITEM);
    const draggedFolder = e.dataTransfer.getData(DRAG_FOLDER);
    if (itemId) {
      e.preventDefault();
      e.stopPropagation();
      moveItem(itemId, folderId);
    } else if (draggedFolder) {
      e.preventDefault();
      e.stopPropagation();
      if (draggedFolder !== folderId) moveFolder(draggedFolder, folderId);
    } else if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      const files = await filesFromDataTransfer(e.dataTransfer);
      if (files.length) useStore.getState().openDialog({ type: 'newItem', folderId, files });
    }
  };
  const activate = () => {
    useStore.getState().select({ kind: 'folder', id: folderId });
    if (!matches) useStore.getState().setExpanded(folderId, !expanded);
  };

  const entries: MenuEntry[] = [
    { icon: <Plus />, label: t('folderMenu.newItem'), onSelect: newItem },
    { icon: <FolderPlus />, label: t('folderMenu.newSubfolder'), onSelect: () => promptNewFolder(folderId) },
    { icon: <Pencil />, label: tc('rename'), onSelect: () => promptRenameFolder(folder) },
    {
      icon: <ClipboardPaste />,
      label: t('paste.label'),
      description: clip ? t('paste.fromItemIntoFolder', { name: clipboardLabel(clip) }) : t('paste.needsCopy'),
      disabled: !clip || count === 0,
      onSelect: () => openPasteDialog(itemIdsInFolder(project, folderId)),
    },
    'separator',
    { icon: <Trash2 />, label: t('folderMenu.delete'), destructive: true, onSelect: () => confirmDeleteFolder(project, folder) },
  ];

  return (
    <Collapsible open={open}>
      <TreeRow
        entries={entries}
        role="treeitem"
        tabIndex={0}
        aria-expanded={open}
        aria-selected={selected}
        data-selected={selected || undefined}
        className={rowClass(selected, dropActive)}
        style={{ paddingLeft: 4 + depth * 16 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_FOLDER, folderId);
          e.dataTransfer.effectAllowed = 'move';
          e.stopPropagation();
        }}
        onDragOver={onDragOver}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => void onDrop(e)}
        onClick={activate}
        onDoubleClick={() => promptRenameFolder(folder)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && e.key === 'F2') {
            e.preventDefault();
            promptRenameFolder(folder);
          } else activateOnKey(activate)(e);
        }}
        title={folder.name}
        actions={
          <Tip label={t('newItemInFolder')}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('newItemInFolder')}
              onClick={(e) => {
                e.stopPropagation();
                newItem();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <Plus />
            </Button>
          </Tip>
        }
      >
        <span className="grid w-4 shrink-0 place-items-center text-muted-foreground">
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </span>
        <span className={rowIcon}>{open ? <FolderOpen className="size-4" /> : <FolderIcon className="size-4" />}</span>
        <span className={rowLabel}>{folder.name}</span>
        <span className={rowBadge}>{count}</span>
      </TreeRow>
      <CollapsibleContent role="group">
        {folder.folderIds.map((id) => (
          <FolderNode key={id} project={project} folderId={id} depth={depth + 1} status={status} matches={matches} />
        ))}
        {folder.itemIds
          .filter((id) => !matches || matches.has(id))
          .map((id) => (
            <ItemNode key={id} project={project} itemId={id} depth={depth + 1} status={status} matches={matches} />
          ))}
        {folder.itemIds.length === 0 && folder.folderIds.length === 0 && !matches && (
          <div
            role="button"
            tabIndex={0}
            className={cn(rowClass(false), 'text-xs text-muted-foreground')}
            style={{ paddingLeft: 26 + depth * 16 }}
            onClick={newItem}
            onKeyDown={activateOnKey(newItem)}
          >
            <Plus className="size-3.5" /> {t('addItem')}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ItemNode({ project, itemId, depth, status }: NodeProps & { itemId: string }) {
  const t = useTranslations('layout.sidebar');
  const tc = useTranslations('common');
  const item = project.items[itemId];
  const selected = useStore((s) => s.selection?.kind === 'item' && s.selection.id === itemId);
  const [dropActive, setDropActive] = useState(false);
  const thumb = useThumbnail(item?.model ?? null);
  const clip = useItemClipboard((s) => s.clip);
  if (!item) return null;
  const state = status.get(itemId);
  const select = () => useStore.getState().select({ kind: 'item', id: itemId });

  const entries: MenuEntry[] = [
    { icon: <Copy />, label: tc('duplicate'), onSelect: () => duplicateItem(itemId) },
    { icon: <FolderInput />, label: t('itemMenu.move'), onSelect: () => useStore.getState().openDialog({ type: 'moveItem', itemId }) },
    'separator',
    {
      icon: <ClipboardCopy />,
      label: t('itemMenu.copyProperties'),
      description: t('itemMenu.copyPropertiesDescription'),
      onSelect: () => copyItemProperties(itemId),
    },
    {
      icon: <ClipboardPaste />,
      label: t('paste.label'),
      description: clip ? t('paste.fromItem', { name: clipboardLabel(clip) }) : t('paste.needsCopy'),
      disabled: !clip || clip.sourceItemId === itemId,
      onSelect: () => openPasteDialog([itemId]),
    },
    'separator',
    { icon: <Trash2 />, label: tc('delete'), destructive: true, onSelect: () => confirmDeleteItem(item) },
  ];

  return (
    <TreeRow
      entries={entries}
      role="treeitem"
      tabIndex={0}
      aria-selected={selected}
      data-selected={selected || undefined}
      className={rowClass(selected, dropActive)}
      style={{ paddingLeft: 22 + depth * 16 }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_ITEM, itemId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_ITEM)) {
          e.preventDefault();
          e.stopPropagation();
          setDropActive(true);
        }
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => {
        setDropActive(false);
        const dragged = e.dataTransfer.getData(DRAG_ITEM);
        if (dragged && dragged !== itemId) {
          e.preventDefault();
          e.stopPropagation();
          moveItem(dragged, item.folderId, itemId);
        }
      }}
      onClick={select}
      onKeyDown={activateOnKey(select)}
      title={`${itemLabel(item)} (${item.nexoId})`}
    >
      {thumb ? (
        <img className="size-5 shrink-0 rounded-sm object-contain [image-rendering:pixelated]" src={thumb} alt="" />
      ) : (
        <Box className="size-3.75 shrink-0 text-muted-foreground" />
      )}
      <span className={rowLabel}>{itemLabel(item)}</span>
      {state && <StatusDot tone={state} title={state === 'error' ? t('status.error') : t('status.warning')} />}
    </TreeRow>
  );
}
