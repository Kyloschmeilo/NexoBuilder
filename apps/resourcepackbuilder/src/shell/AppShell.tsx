/**
 * The app frame. With a project open it is the workbench: the top bar over the activity bar, the sidebar panel of the
 * current activity, the page and the output dock; without one, the top bar over the welcome screen. It also mounts
 * every feature dialog, the command palette and the toasts once.
 */
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';
import { ExportDialog } from '../features/export/ExportDialog';
import { MoveItemDialog } from '../features/moveItem/MoveItemDialog';
import { NewItemDialog } from '../features/newItem/NewItemDialog';
import { PasteConfigDialog } from '../features/pasteConfig/PasteConfigDialog';
import { ProjectsDialog } from '../features/projects/ProjectsDialog';
import { Welcome } from '../features/projects/Welcome';
import { ShareDialog } from '../features/share/ShareDialog';
import { PlanProvider } from './PlanProvider';
import { useProjectStore } from '../store/project';
import { setActivity, setCommandPaletteOpen, useUiStore } from '../store/ui';
import { activityForSelection } from './activities';
import { ActivityBar } from './ActivityBar';
import { CommandPalette } from './CommandPalette';
import { DialogHost } from './DialogHost';
import { MainArea } from './MainArea';
import { OutputDock } from './OutputDock';
import { Sidebar, usePanelActivity } from './sidebar/Sidebar';
import { Toasts } from './Toasts';
import { TopBar } from './TopBar';
import { useDockState } from './useDockLayout';
import { useServiceNotices } from './useServiceNotices';
import { useShortcuts } from './useShortcuts';
import { useWindowDrop } from './useWindowDrop';

/** Switches the activity to the one a newly selected entry belongs to (an item to Items, a glyph view to Media …). */
function useActivityFollowsSelection(): void {
  useEffect(
    () =>
      useUiStore.subscribe((state, previous) => {
        if (state.selection === previous.selection) return;
        const activity = activityForSelection(state.selection);
        if (activity && activity !== state.activity) setActivity(activity);
      }),
    [],
  );
}

/**
 * Keeps `--page-center-x` on `<html>` at the horizontal centre of the page, so toasts (rendered in a portal) appear
 * centred below the page instead of over the sidebar or the dock.
 */
function usePageCenter(page: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const element = page.current;
    if (!element) return;
    const root = document.documentElement;
    const update = () => {
      const rect = element.getBoundingClientRect();
      root.style.setProperty('--page-center-x', `${Math.round(rect.left + rect.width / 2)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty('--page-center-x');
    };
  }, [page]);
}

/** The four panes of an open project. */
function Workbench() {
  const panelActivity = usePanelActivity();
  const dock = useDockState();
  const page = useRef<HTMLDivElement>(null);
  useActivityFollowsSelection();
  usePageCenter(page);

  return (
    <div className="relative flex min-h-0 min-w-0">
      <ActivityBar />
      {panelActivity && <Sidebar activity={panelActivity} />}
      <div ref={page} className="flex min-h-0 min-w-0 flex-1">
        <MainArea />
      </div>
      {dock.isVisible && <OutputDock output={dock.output} isColumn={dock.isColumn} />}
    </div>
  );
}

/** Everything inside the plan provider: the frame, the shortcuts and the mounted dialogs. */
function Frame() {
  const hasProject = useProjectStore((s) => s.project !== null);
  const dock = useDockState();
  useShortcuts(hasProject ? { openCommandPalette: () => setCommandPaletteOpen(true), toggleDock: dock.toggle } : {});
  useWindowDrop();
  useServiceNotices();

  return (
    <div className="grid h-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
      <TopBar />
      {hasProject ? <Workbench /> : <Welcome />}
      {hasProject && <CommandPalette />}
      <ProjectsDialog />
      <NewItemDialog />
      <MoveItemDialog />
      <PasteConfigDialog />
      <ExportDialog />
      <ShareDialog />
      <DialogHost />
      <Toasts />
    </div>
  );
}

/** The whole app below the providers of `Root`. */
export function AppShell() {
  return (
    <PlanProvider>
      <Frame />
    </PlanProvider>
  );
}
