import { ExportDialog } from '../features/export/ExportDialog';
import { MoveItemDialog } from '../features/moveItem/MoveItemDialog';
import { NewItemDialog } from '../features/newItem/NewItemDialog';
import { PasteConfigDialog } from '../features/pasteConfig/PasteConfigDialog';
import { ProjectsDialog } from '../features/projects/ProjectsDialog';
import { Welcome } from '../features/projects/Welcome';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import { ShareDialog } from '../features/share/ShareDialog';
import { PlanProvider } from './PlanProvider';
import { useProjectStore } from '../store/project';
import { useUiStore } from '../store/ui';
import { DialogHost } from './DialogHost';
import { MainArea } from './MainArea';
import { RightPanel } from './RightPanel';
import { Sidebar } from './sidebar/Sidebar';
import { Toasts } from './Toasts';
import { TopBar } from './TopBar';
import { useServiceNotices } from './useServiceNotices';
import { useShortcuts } from './useShortcuts';
import { useWindowDrop } from './useWindowDrop';

/** The app frame: top bar, and below it either the open project (sidebar, page, preview) or the welcome screen. */
export function AppShell() {
  const hasProject = useProjectStore((s) => s.project !== null);
  // The YAML preview has something to show for items, folders and glyphs; the other pages get the room
  const isRightPanelOpen = useUiStore((s) => s.isRightPanelOpen && (s.selection?.kind !== 'view' || s.selection.view === 'glyphs'));
  useShortcuts();
  useWindowDrop();
  useServiceNotices();

  return (
    <PlanProvider>
      <div className="grid h-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
        <TopBar />
        {hasProject ? (
          <div className="grid min-h-0 grid-cols-[290px_minmax(0,1fr)_auto]">
            <Sidebar />
            <MainArea />
            {isRightPanelOpen && <RightPanel />}
          </div>
        ) : (
          <Welcome />
        )}
        <ProjectsDialog />
        <NewItemDialog />
        <MoveItemDialog />
        <PasteConfigDialog />
        <ExportDialog />
        <ShareDialog />
        <SettingsDialog />
        <DialogHost />
        <Toasts />
      </div>
    </PlanProvider>
  );
}
