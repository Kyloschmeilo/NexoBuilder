import { useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Copy,
  EllipsisVertical,
  Folder as FolderIcon,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Smile,
  Trash2,
} from 'lucide-react';
import type { Folder, Item, Project } from '../../core/types';
import type { ExportPlan } from '../../core/export/plan';
import { getDescendantFolderIds } from '../../core/project/tree';
import { addFolder, deleteFolder, deleteItem, duplicateItem, moveFolder, moveItem, renameFolder } from '../../state/actions';
import { useStore } from '../../state/store';
import { MenuItem, Popover } from '../common/Popover';
import { stripMiniMessage } from '../common/MiniMessage';
import { filesFromDataTransfer } from '../files';
import { useThumbnail } from '../preview/thumbnail';

const DRAG_ITEM = 'application/x-nexobuilder-item';
const DRAG_FOLDER = 'application/x-nexobuilder-folder';

export function itemLabel(item: Item): string {
  return stripMiniMessage(item.displayName).trim() || item.nexoId;
}

export function promptNewFolder(parentId: string | null) {
  useStore.getState().openDialog({
    type: 'prompt',
    title: parentId ? 'Neuer Unterordner' : 'Neuer Ordner',
    label: 'Name des Ordners (wird zu einem Unterordner in plugins/Nexo/items)',
    initial: '',
    confirmLabel: 'Anlegen',
    onSubmit: (name) => addFolder(name, parentId),
  });
}

function promptRename(folder: Folder) {
  useStore.getState().openDialog({
    type: 'prompt',
    title: 'Ordner umbenennen',
    label: 'Neuer Name',
    initial: folder.name,
    confirmLabel: 'Umbenennen',
    onSubmit: (name) => renameFolder(folder.id, name),
  });
}

function confirmDeleteFolder(project: Project, folder: Folder) {
  const ids = getDescendantFolderIds(project, folder.id);
  const itemCount = ids.reduce((n, id) => n + (project.folders[id]?.itemIds.length ?? 0), 0);
  useStore.getState().openDialog({
    type: 'confirm',
    title: 'Ordner löschen?',
    message:
      itemCount > 0
        ? `Der Ordner „${folder.name}“ enthält ${itemCount} Item(s)${ids.length > 1 ? ` und ${ids.length - 1} Unterordner` : ''}. Alles wird gelöscht.\n\nDu kannst das mit Strg+Z rückgängig machen.`
        : `Der Ordner „${folder.name}“ wird gelöscht.`,
    confirmLabel: 'Löschen',
    danger: true,
    onConfirm: () => deleteFolder(folder.id),
  });
}

export function confirmDeleteItem(item: Item) {
  useStore.getState().openDialog({
    type: 'confirm',
    title: 'Item löschen?',
    message: `„${itemLabel(item)}“ (${item.nexoId}) wird gelöscht.\n\nDu kannst das mit Strg+Z rückgängig machen.`,
    confirmLabel: 'Löschen',
    danger: true,
    onConfirm: () => deleteItem(item.id),
  });
}

export function Sidebar({ plan }: { plan: ExportPlan | null }) {
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
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Ordner & Items</span>
        <button className="btn ghost small" title="Neuer Ordner" onClick={() => promptNewFolder(null)}>
          <FolderPlus size={15} /> Ordner
        </button>
      </div>
      <div className="sidebar-search">
        <div className="row" style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 9, color: 'var(--text-faint)' }} />
          <input
            className="input"
            style={{ paddingLeft: 28, minHeight: 30 }}
            placeholder="Items suchen …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div
        className="tree"
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
        style={rootDrop ? { background: 'var(--accent-soft)' } : undefined}
      >
        {project.rootFolderIds.length === 0 ? (
          <div className="empty-state" style={{ height: 'auto', paddingTop: 40 }}>
            <div>
              <FolderPlus size={34} className="faint" />
              <h2>Noch keine Ordner</h2>
              <p className="small">Ordner werden zu Unterordnern in plugins/Nexo/items. Lege zuerst einen Ordner an, dann kannst du darin Items erstellen.</p>
              <button className="btn primary" onClick={() => promptNewFolder(null)}>
                <FolderPlus size={16} /> Ersten Ordner anlegen
              </button>
            </div>
          </div>
        ) : (
          project.rootFolderIds.map((id) => (
            <FolderNode key={id} project={project} folderId={id} depth={0} status={status} matches={matches} />
          ))
        )}
      </div>
      <GlyphsEntry plan={plan} />
    </aside>
  );
}

function GlyphsEntry({ plan }: { plan: ExportPlan | null }) {
  const count = useStore((s) => s.project?.glyphs?.length ?? 0);
  const selected = useStore((s) => s.selection?.kind === 'glyphs');
  const glyphIssues = plan?.issues.filter((i) => i.glyphId && i.level !== 'info') ?? [];
  const state = glyphIssues.some((i) => i.level === 'error') ? 'error' : glyphIssues.length ? 'warning' : null;
  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '6px 6px 8px' }}>
      <div
        className={`tree-row ${selected ? 'selected' : ''}`}
        style={{ paddingLeft: 8 }}
        onClick={() => useStore.getState().select({ kind: 'glyphs' })}
        title="Glyphen (Emojis, GUI-Texturen) für Chat, Lore und Titel"
      >
        <span className="tree-icon" style={{ color: '#ffd166' }}>
          <Smile size={16} />
        </span>
        <span className="tree-label">Glyphen</span>
        {state && <span className={`status-dot ${state}`} />}
        <span className="tree-badge">{count}</span>
      </div>
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

function FolderNode({ project, folderId, depth, status, matches }: NodeProps & { folderId: string }) {
  const folder = project.folders[folderId];
  const expanded = useStore((s) => s.expanded[folderId] ?? true);
  const selected = useStore((s) => s.selection?.kind === 'folder' && s.selection.id === folderId);
  const [dropActive, setDropActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchor = useRef<HTMLButtonElement>(null);
  if (!folder) return null;
  if (matches && !folderHasMatch(project, folderId, matches)) return null;
  const open = matches ? true : expanded;
  const count = getDescendantFolderIds(project, folderId).reduce((n, id) => n + (project.folders[id]?.itemIds.length ?? 0), 0);

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
  const openMenu = (e?: MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setMenuOpen(true);
  };

  return (
    <div>
      <div
        className={`tree-row ${selected ? 'selected' : ''} ${dropActive ? 'drop-target' : ''}`}
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
        onClick={() => {
          useStore.getState().select({ kind: 'folder', id: folderId });
          if (!matches) useStore.getState().setExpanded(folderId, !expanded);
        }}
        onDoubleClick={() => promptRename(folder)}
        onContextMenu={openMenu}
        title={folder.name}
      >
        <span className="tree-chevron">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <span className="tree-icon" style={{ color: '#f5c46a' }}>
          {open ? <FolderOpen size={16} /> : <FolderIcon size={16} />}
        </span>
        <span className="tree-label">{folder.name}</span>
        <span className="tree-badge">{count}</span>
        <span className="tree-actions">
          <button
            className="btn ghost icon small"
            title="Neues Item in diesem Ordner"
            onClick={(e) => {
              e.stopPropagation();
              useStore.getState().openDialog({ type: 'newItem', folderId });
            }}
          >
            <Plus size={14} />
          </button>
          <button ref={menuAnchor} className="btn ghost icon small" title="Mehr" onClick={(e) => openMenu(e)}>
            <EllipsisVertical size={14} />
          </button>
        </span>
      </div>
      <Popover anchor={menuAnchor.current} open={menuOpen} onClose={() => setMenuOpen(false)} align="right" width={230}>
        <MenuItem
          icon={<Plus size={15} />}
          label="Neues Item"
          onClick={() => {
            setMenuOpen(false);
            useStore.getState().openDialog({ type: 'newItem', folderId });
          }}
        />
        <MenuItem
          icon={<FolderPlus size={15} />}
          label="Neuer Unterordner"
          onClick={() => {
            setMenuOpen(false);
            promptNewFolder(folderId);
          }}
        />
        <MenuItem
          icon={<Pencil size={15} />}
          label="Umbenennen"
          onClick={() => {
            setMenuOpen(false);
            promptRename(folder);
          }}
        />
        <div className="menu-sep" />
        <MenuItem
          icon={<Trash2 size={15} />}
          label="Ordner löschen"
          danger
          onClick={() => {
            setMenuOpen(false);
            confirmDeleteFolder(project, folder);
          }}
        />
      </Popover>
      {open && (
        <div>
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
              className="tree-row faint small"
              style={{ paddingLeft: 26 + depth * 16, cursor: 'pointer' }}
              onClick={() => useStore.getState().openDialog({ type: 'newItem', folderId })}
            >
              <Plus size={13} /> Item hinzufügen
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemNode({ project, itemId, depth, status }: NodeProps & { itemId: string }) {
  const item = project.items[itemId];
  const selected = useStore((s) => s.selection?.kind === 'item' && s.selection.id === itemId);
  const [dropActive, setDropActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchor = useRef<HTMLButtonElement>(null);
  const thumb = useThumbnail(item?.model ?? null);
  if (!item) return null;
  const state = status.get(itemId);
  return (
    <>
      <div
        className={`tree-row ${selected ? 'selected' : ''} ${dropActive ? 'drop-target' : ''}`}
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
        onClick={() => useStore.getState().select({ kind: 'item', id: itemId })}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
        title={`${itemLabel(item)} (${item.nexoId})`}
      >
        {thumb ? <img className="tree-thumb" src={thumb} alt="" /> : <Box size={15} className="faint" style={{ flex: 'none' }} />}
        <span className="tree-label">{itemLabel(item)}</span>
        {state && <span className={`status-dot ${state}`} title={state === 'error' ? 'Fehler' : 'Warnungen'} />}
        <span className="tree-actions">
          <button
            ref={menuAnchor}
            className="btn ghost icon small"
            title="Mehr"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
          >
            <EllipsisVertical size={14} />
          </button>
        </span>
      </div>
      <Popover anchor={menuAnchor.current} open={menuOpen} onClose={() => setMenuOpen(false)} align="right" width={220}>
        <MenuItem
          icon={<Copy size={15} />}
          label="Duplizieren"
          onClick={() => {
            setMenuOpen(false);
            duplicateItem(itemId);
          }}
        />
        <MenuItem
          icon={<FolderInput size={15} />}
          label="Verschieben …"
          onClick={() => {
            setMenuOpen(false);
            useStore.getState().openDialog({ type: 'moveItem', itemId });
          }}
        />
        <div className="menu-sep" />
        <MenuItem
          icon={<Trash2 size={15} />}
          label="Löschen"
          danger
          onClick={() => {
            setMenuOpen(false);
            confirmDeleteItem(item);
          }}
        />
      </Popover>
    </>
  );
}
