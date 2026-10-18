/**
 * Where and whether the output dock is shown. Wide windows show it as a layout column while the page writes a file
 * (or while it shows the checks); narrow windows show it as an overlay the user opens with Ctrl+J or the top bar.
 */
import { useCallback } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useProjectStore } from '../store/project';
import { DOCK_COLUMN_MIN_WINDOW_WIDTH, setDockOpen, showDock, useUiStore } from '../store/ui';
import { type Output, pageOutput } from './output';
import { usePlan } from './PlanProvider';

/** True from {@link DOCK_COLUMN_MIN_WINDOW_WIDTH} on: the dock is a column; below it, an overlay over the page. */
export function useIsDockColumn(): boolean {
  return useMediaQuery(`(min-width: ${DOCK_COLUMN_MIN_WINDOW_WIDTH}px)`);
}

/** The output of the current page (null while no project is open or the page writes no file). */
export function usePageOutput(): Output | null {
  const project = useProjectStore((s) => s.project);
  const plan = usePlan();
  const selection = useUiStore((s) => s.selection);
  return project ? pageOutput(project, plan, selection) : null;
}

export interface DockState {
  output: Output | null;
  /** Column of the layout or overlay over the page */
  isColumn: boolean;
  isVisible: boolean;
  /** Hides a visible dock, shows a hidden one (on Checks when the page writes no file) */
  toggle: () => void;
}

/** The dock's output, form and visibility, and its toggle (the top bar button and Ctrl+J). */
export function useDockState(): DockState {
  const output = usePageOutput();
  const isColumn = useIsDockColumn();
  const isOpen = useUiStore((s) => (isColumn ? s.isDockOpen : s.isDockOverlayOpen));
  const dockTab = useUiStore((s) => s.dockTab);
  const hasContent = output !== null || dockTab === 'checks';
  const isVisible = isOpen && hasContent;
  const toggle = useCallback(() => {
    if (isVisible) setDockOpen(false, isColumn);
    else showDock(output ? dockTab : 'checks', isColumn);
  }, [isVisible, isColumn, output, dockTab]);
  return { output, isColumn, isVisible, toggle };
}
