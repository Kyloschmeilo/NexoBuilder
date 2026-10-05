import { useEffect } from 'react';
import { FolderPlus, MousePointerClick } from 'lucide-react';
import { useStore } from './state/store';
import type { ExportPlan } from './core/export/plan';
import { usePlan } from './ui/hooks/usePlan';
import { TopBar } from './ui/layout/TopBar';
import { promptNewFolder, Sidebar } from './ui/layout/Sidebar';
import { RightPanel } from './ui/layout/RightPanel';
import { FolderView } from './ui/layout/FolderView';
import { GlyphsView } from './ui/glyphs/GlyphsView';
import { ProjectsDialog, Welcome } from './ui/layout/Welcome';
import { ItemEditor } from './ui/item/ItemEditor';
import { ConfirmDialog, PromptDialog, Toasts } from './ui/common/Dialogs';
import { NewItemDialog } from './ui/dialogs/NewItemDialog';
import { ExportDialog } from './ui/dialogs/ExportDialog';
import { SettingsDialog } from './ui/dialogs/SettingsDialog';
import { MoveItemDialog } from './ui/dialogs/MoveItemDialog';
import { filesFromDataTransfer } from './ui/files';

function DialogHost() {
  const dialog = useStore((s) => s.dialog);
  const project = useStore((s) => s.project);
  if (!dialog) return null;
  switch (dialog.type) {
    case 'confirm':
      return <ConfirmDialog dialog={dialog} />;
    case 'prompt':
      return <PromptDialog dialog={dialog} />;
    case 'projects':
      return <ProjectsDialog initialTab="open" />;
    case 'newProject':
      return <ProjectsDialog initialTab="new" />;
    default:
      break;
  }
  if (!project) return null;
  switch (dialog.type) {
    case 'newItem':
      return <NewItemDialog folderId={dialog.folderId} initialFiles={dialog.files} />;
    case 'export':
      return <ExportDialog />;
    case 'settings':
      return <SettingsDialog />;
    case 'moveItem':
      return <MoveItemDialog itemId={dialog.itemId} />;
  }
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      // In Textfeldern übernimmt der Browser Rückgängig/Wiederholen
      if (typing) return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        useStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Dateien, die irgendwo im Fenster abgelegt werden, öffnen den „Neues Item“-Dialog statt den Browser wegzunavigieren. */
function useWindowDrop() {
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const onDrop = async (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      const { project, dialog, selection, openDialog, toast } = useStore.getState();
      if (!project || dialog || selection?.kind === 'glyphs') return;
      const folderId =
        selection?.kind === 'folder'
          ? selection.id
          : selection?.kind === 'item'
            ? project.items[selection.id]?.folderId
            : project.rootFolderIds[0];
      if (!folderId || !project.folders[folderId]) {
        toast('warning', 'Lege zuerst einen Ordner an – darin werden die Items erstellt.');
        return;
      }
      const files = await filesFromDataTransfer(e.dataTransfer);
      if (files.length) openDialog({ type: 'newItem', folderId, files });
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);
}

function MainArea({ plan }: { plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const selection = useStore((s) => s.selection);
  let content;
  if (selection?.kind === 'item' && project.items[selection.id]) {
    content = <ItemEditor itemId={selection.id} plan={plan} />;
  } else if (selection?.kind === 'folder' && project.folders[selection.id]) {
    content = <FolderView folderId={selection.id} plan={plan} />;
  } else if (selection?.kind === 'glyphs') {
    content = <GlyphsView plan={plan} />;
  } else {
    const hasFolders = project.rootFolderIds.length > 0;
    content = (
      <div className="empty-state">
        <div>
          {hasFolders ? <MousePointerClick size={36} className="faint" /> : <FolderPlus size={36} className="faint" />}
          <h2>{hasFolders ? 'Wähle links einen Ordner oder ein Item' : 'Leg los mit einem Ordner'}</h2>
          <p>
            {hasFolders
              ? 'Über das + neben einem Ordner erstellst du ein neues Item. Du kannst Modelle auch direkt auf einen Ordner ziehen.'
              : 'Ordner werden zu Unterordnern in plugins/Nexo/items. Darin legst du deine Items an.'}
          </p>
          {!hasFolders && (
            <button className="btn primary large" onClick={() => promptNewFolder(null)}>
              <FolderPlus size={17} /> Ordner anlegen
            </button>
          )}
        </div>
      </div>
    );
  }
  return <main className="main">{content}</main>;
}

export default function App() {
  const project = useStore((s) => s.project);
  const rightPanel = useStore((s) => s.rightPanel);
  const plan = usePlan();
  useShortcuts();
  useWindowDrop();

  return (
    <div className="app">
      <TopBar plan={plan} />
      {project ? (
        <div className="workspace" style={rightPanel ? undefined : { gridTemplateColumns: '290px 1fr' }}>
          <Sidebar plan={plan} />
          <MainArea plan={plan} />
          {rightPanel && <RightPanel plan={plan} />}
        </div>
      ) : (
        <Welcome />
      )}
      <DialogHost />
      <Toasts />
    </div>
  );
}
