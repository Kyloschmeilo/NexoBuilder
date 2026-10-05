import { Box, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Item } from '../../core/types';
import type { ExportPlan } from '../../core/export/plan';
import { getFolderPathLabel, getFolderSlugs } from '../../core/project/tree';
import { yamlFileFor } from '../../core/export/plan';
import { deleteFolder, renameFolder } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '../common/DropZone';
import { useThumbnail } from '../preview/thumbnail';
import { itemLabel, promptNewFolder } from './Sidebar';

export function FolderView({ folderId, plan }: { folderId: string; plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const folder = project.folders[folderId];
  if (!folder) return null;
  const items = folder.itemIds.map((id) => project.items[id]).filter(Boolean);
  const slugs = getFolderSlugs(project, folderId);
  const yamlPath = yamlFileFor(project, { nexoId: '<item_id>' } as Item, slugs);

  return (
    <div className="editor">
      <div className="editor-header">
        <div className="editor-thumb" style={{ color: '#f5c46a' }}>
          <FolderOpen size={30} />
        </div>
        <div className="editor-title">
          <h1>{folder.name}</h1>
          <div className="editor-meta">
            <span className="badge">{getFolderPathLabel(project, folderId)}</span>
            <span className="badge mono" title="Ziel im Nexo-Ordner">
              plugins/Nexo/{yamlPath}
            </span>
            <span className="badge">{items.length} Item(s)</span>
          </div>
        </div>
        <button className="btn primary" onClick={() => useStore.getState().openDialog({ type: 'newItem', folderId })}>
          <Plus size={16} /> Neues Item
        </button>
        <button className="btn" onClick={() => promptNewFolder(folderId)} title="Unterordner anlegen">
          <FolderPlus size={16} />
        </button>
        <button
          className="btn"
          title="Umbenennen"
          onClick={() =>
            useStore.getState().openDialog({
              type: 'prompt',
              title: 'Ordner umbenennen',
              label: 'Neuer Name',
              initial: folder.name,
              confirmLabel: 'Umbenennen',
              onSubmit: (name) => renameFolder(folderId, name),
            })
          }
        >
          <Pencil size={16} />
        </button>
        <button
          className="btn danger"
          title="Ordner löschen"
          onClick={() =>
            useStore.getState().openDialog({
              type: 'confirm',
              title: 'Ordner löschen?',
              message: `„${folder.name}“ wird mit allen Items und Unterordnern gelöscht.\n\nDu kannst das mit Strg+Z rückgängig machen.`,
              confirmLabel: 'Löschen',
              danger: true,
              onConfirm: () => deleteFolder(folderId),
            })
          }
        >
          <Trash2 size={16} />
        </button>
      </div>

      <DropZone
        onFiles={(files) => useStore.getState().openDialog({ type: 'newItem', folderId, files })}
        accept=".bbmodel,.json,.png,.mcmeta"
        title="Modelle hier ablegen, um Items zu erstellen"
        subtitle="Mehrere .bbmodel-Dateien ergeben mehrere Items"
        formats={['.bbmodel', '.json + .png', '.png']}
        compact
      />

      {items.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 22 }}>
            Items in diesem Ordner
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
            {items.map((item) => (
              <ItemTile key={item.id} item={item} plan={plan} />
            ))}
          </div>
        </>
      )}
      {folder.folderIds.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 22 }}>
            Unterordner
          </div>
          <div className="row wrap">
            {folder.folderIds.map((id) => (
              <button key={id} className="btn" onClick={() => useStore.getState().select({ kind: 'folder', id })}>
                <FolderOpen size={15} style={{ color: '#f5c46a' }} /> {project.folders[id]?.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ItemTile({ item, plan }: { item: Item; plan: ExportPlan | null }) {
  const thumb = useThumbnail(item.model);
  const issues = plan?.issues.filter((i) => i.itemId === item.id) ?? [];
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  return (
    <button
      className="card mb-0"
      style={{ textAlign: 'left', cursor: 'pointer', padding: 12, display: 'flex', gap: 10, alignItems: 'center', color: 'inherit' }}
      onClick={() => useStore.getState().select({ kind: 'item', id: item.id })}
    >
      <div className="editor-thumb" style={{ width: 48, height: 48, borderRadius: 9 }}>
        {thumb ? <img src={thumb} alt="" style={{ width: 36, height: 36 }} /> : <Box size={20} className="faint" />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemLabel(item)}</div>
        <div className="mono faint small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.nexoId}
        </div>
        {(errors > 0 || warnings > 0) && (
          <div className="row" style={{ gap: 4, marginTop: 3 }}>
            {errors > 0 && <span className="badge danger">{errors} Fehler</span>}
            {warnings > 0 && <span className="badge warning">{warnings}</span>}
          </div>
        )}
      </div>
    </button>
  );
}
