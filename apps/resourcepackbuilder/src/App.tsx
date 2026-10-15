import { useEffect } from 'react';
import { FolderPlus, MousePointerClick } from 'lucide-react';
import { useStore } from './state/store';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { usePlan } from './ui/hooks/usePlan';
import { TopBar } from './ui/layout/TopBar';
import { promptNewFolder, Sidebar } from './ui/layout/Sidebar';
import { RightPanel } from './ui/layout/RightPanel';
import { FolderView } from './ui/layout/FolderView';
import { GlyphsView } from './ui/glyphs/GlyphsView';
import { SoundsView } from './ui/media/SoundsView';
import { PaintingsView } from './ui/media/PaintingsView';
import { TestServerView } from './ui/testserver/TestServerView';
import { ProjectsDialog, Welcome } from './ui/layout/Welcome';
import { ItemEditor } from './ui/item/ItemEditor';
import { ConfirmDialog, PromptDialog, Toasts } from './ui/Dialogs';
import { NewItemDialog } from './ui/dialogs/NewItemDialog';
import { ExportDialog } from './ui/dialogs/ExportDialog';
import { SettingsDialog } from './ui/dialogs/SettingsDialog';
import { MoveItemDialog } from './ui/dialogs/MoveItemDialog';
import { ShareDialog } from './ui/dialogs/ShareDialog';
import { PasteConfigDialog } from './ui/dialogs/PasteConfigDialog';
import { filesFromDataTransfer } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { translator } from './i18n/locale';

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
    case 'share':
      return <ShareDialog />;
    case 'pasteConfig':
      return <PasteConfigDialog targetItemIds={dialog.targetItemIds} />;
  }
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      // In text fields the browser handles undo/redo
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

/** Files dropped anywhere in the window open the "New item" dialog instead of navigating the browser away. */
function useWindowDrop() {
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const onDrop = async (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      const { project, dialog, selection, openDialog, toast } = useStore.getState();
      if (!project || dialog || selection?.kind === 'glyphs' || selection?.kind === 'sounds' || selection?.kind === 'paintings' || selection?.kind === 'testserver') return;
      const folderId =
        selection?.kind === 'folder'
          ? selection.id
          : selection?.kind === 'item'
            ? project.items[selection.id]?.folderId
            : project.rootFolderIds[0];
      if (!folderId || !project.folders[folderId]) {
        toast('warning', translator('layout')('main.dropNeedsFolder'));
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
  const t = useTranslations('layout.main');
  const project = useStore((s) => s.project)!;
  const selection = useStore((s) => s.selection);
  let content;
  if (selection?.kind === 'item' && project.items[selection.id]) {
    content = <ItemEditor itemId={selection.id} plan={plan} />;
  } else if (selection?.kind === 'folder' && project.folders[selection.id]) {
    content = <FolderView folderId={selection.id} plan={plan} />;
  } else if (selection?.kind === 'glyphs') {
    content = <GlyphsView plan={plan} />;
  } else if (selection?.kind === 'sounds') {
    content = <SoundsView plan={plan} />;
  } else if (selection?.kind === 'paintings') {
    content = <PaintingsView plan={plan} />;
  } else if (selection?.kind === 'testserver') {
    content = <TestServerView plan={plan} />;
  } else {
    const hasFolders = project.rootFolderIds.length > 0;
    content = (
      <Empty className="h-full p-8">
        <EmptyHeader className="max-w-[460px]">
          <EmptyMedia>
            {hasFolders ? (
              <MousePointerClick className="size-9 text-muted-foreground" />
            ) : (
              <FolderPlus className="size-9 text-muted-foreground" />
            )}
          </EmptyMedia>
          <EmptyTitle className="font-heading text-xl tracking-[0.04em] uppercase">
            {hasFolders ? t('pickTitle') : t('startTitle')}
          </EmptyTitle>
          <EmptyDescription>{hasFolders ? t('pickDescription') : t('startDescription')}</EmptyDescription>
        </EmptyHeader>
        {!hasFolders && (
          <EmptyContent>
            <Button size="lg" onClick={() => promptNewFolder(null)}>
              <FolderPlus /> {t('createFolder')}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }
  return <main className="min-h-0 min-w-0 overflow-auto">{content}</main>;
}

export default function App() {
  const project = useStore((s) => s.project);
  const rightPanel = useStore((s) => s.rightPanel);
  const plan = usePlan();
  useShortcuts();
  useWindowDrop();

  return (
    <div className="grid h-screen grid-rows-[56px_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
      <TopBar plan={plan} />
      {project ? (
        <div
          className={cn(
            'grid min-h-0',
            rightPanel ? 'grid-cols-[300px_minmax(0,1fr)_auto]' : 'grid-cols-[290px_minmax(0,1fr)]',
          )}
        >
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
