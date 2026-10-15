import { cn } from 'cn';
import { Welcome } from '../features/projects/Welcome';
import { PlanProvider } from '../store/PlanProvider';
import { useProjectStore } from '../store/project';
import { useUiStore } from '../store/ui';
import { DialogHost } from './DialogHost';
import { MainArea } from './MainArea';
import { RightPanel } from './RightPanel';
import { Sidebar } from './Sidebar';
import { Toasts } from './Toasts';
import { TopBar } from './TopBar';
import { useServiceNotices } from './useServiceNotices';
import { useShortcuts } from './useShortcuts';
import { useWindowDrop } from './useWindowDrop';

/** The app frame: top bar, and below it either the open project (sidebar, page, preview) or the welcome screen. */
export function AppShell() {
  const hasProject = useProjectStore((s) => s.project !== null);
  const isRightPanelOpen = useUiStore((s) => s.isRightPanelOpen);
  useShortcuts();
  useWindowDrop();
  useServiceNotices();

  return (
    <PlanProvider>
      <div className="grid h-screen grid-rows-[56px_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
        <TopBar />
        {hasProject ? (
          <div
            className={cn('grid min-h-0', isRightPanelOpen ? 'grid-cols-[300px_minmax(0,1fr)_auto]' : 'grid-cols-[290px_minmax(0,1fr)]')}
          >
            <Sidebar />
            <MainArea />
            {isRightPanelOpen && <RightPanel />}
          </div>
        ) : (
          <Welcome />
        )}
        <DialogHost />
        <Toasts />
      </div>
    </PlanProvider>
  );
}
