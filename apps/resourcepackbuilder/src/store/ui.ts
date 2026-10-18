/**
 * UI state around the open project: what is selected, which activity's panel the sidebar shows, which folders and
 * features are expanded, and the layout of the workbench (sidebar and output dock widths, the dock's tab and
 * visibility). The layout part is remembered on this device; everything else starts fresh with each project.
 */
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { IssueTarget } from '@resourcepackbuilder/utils';
import type { Project } from '@resourcepackbuilder/core/project';
import { useProjectStore } from './project';

/** Project-wide pages that are not tied to a single folder or item. */
export type ViewName =
  | 'glyphs'
  | 'sounds'
  | 'paintings'
  | 'dialogs'
  | 'multipack'
  | 'lootSources'
  | 'templates'
  | 'globalVariables'
  | 'attributes'
  | 'translations'
  | 'categories'
  | 'worldgen'
  | 'atlases'
  | 'pack'
  | 'scripts'
  | 'testServer';

/**
 * What the page shows: an item, a folder, a project-wide view, the settings page, or nothing. A view with `entry`
 * shows one entry of its registry (a glyph, a loot source …); the registry decides what the key means.
 */
export type Selection =
  | { kind: 'item'; id: string }
  | { kind: 'folder'; id: string }
  | { kind: 'view'; view: ViewName; entry?: string }
  | { kind: 'settings' }
  | null;

/**
 * An entry of the activity bar; it decides what the sidebar shows. The entries themselves (icon, label, panel, which
 * targets offer them) are data in `shell/activities.ts`.
 */
export type ActivityId = 'items' | 'media' | 'logic' | 'testServer' | 'settings';

/** A tab of the output dock: the file the page writes, or the checks. */
export type DockTab = 'yaml' | 'checks';

/** A section of the item editor: one of the fixed sections (general, model, recipes, yaml) or a property group of the project's form. */
export type EditorSection = string;

/** @deprecated Use {@link EditorSection}; the item editor's tabs become sections. */
export type EditorTab = EditorSection;

/** A width range in pixels, with the width used until the user drags it. */
export interface WidthRange {
  min: number;
  initial: number;
  max: number;
}

/** Width of the sidebar panel next to the activity bar. */
export const SIDEBAR_WIDTH: WidthRange = { min: 180, initial: 220, max: 480 };

/** Width of the output dock on the right. */
export const DOCK_WIDTH: WidthRange = { min: 280, initial: 330, max: 640 };

/** From this window width on, the output dock is a column of the layout; below it, an overlay toggled with Ctrl+J. */
export const DOCK_COLUMN_MIN_WINDOW_WIDTH = 1280;

interface UiState {
  selection: Selection;
  /** Folder id → expanded in the sidebar */
  expanded: Record<string, boolean>;
  /** The activity whose panel the sidebar shows */
  activity: ActivityId;
  /** The tab the output dock shows */
  dockTab: DockTab;
  /** Whether the output dock is shown as a column (wide windows; remembered) */
  isDockOpen: boolean;
  /** Whether the output dock is shown as an overlay (narrow windows; closed again on every start) */
  isDockOverlayOpen: boolean;
  /** Width of the output dock in pixels */
  dockWidth: number;
  /** Width of the sidebar in pixels */
  sidebarWidth: number;
  /** Whether the command palette is open */
  isCommandPaletteOpen: boolean;
  /** The section the item editor shows */
  editorSection: EditorSection;
  /** Expanded feature rows of the editors, by a key the editor chooses (e.g. `<item id>/<feature key>`) */
  expandedFeatures: Record<string, boolean>;
}

/** The part of the state remembered on this device. */
type PersistedUiState = Pick<UiState, 'dockTab' | 'isDockOpen' | 'dockWidth' | 'sidebarWidth'>;

/** localStorage that tolerates being absent or throwing (private windows, tests): the layout is then just not remembered. */
const safeLocalStorage: StateStorage = {
  getItem(name) {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(name, value);
    } catch {
      // The layout still applies until the app restarts
    }
  },
  removeItem(name) {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(name);
    } catch {
      // Nothing stored that could be removed
    }
  },
};

/** Keeps `value` inside `range`; anything that is not a finite number becomes the initial width. */
export function clampWidth(value: unknown, range: WidthRange): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return range.initial;
  return Math.round(Math.min(range.max, Math.max(range.min, value)));
}

/** Keeps only valid remembered layout values; anything else falls back to the defaults. */
export function sanitizePersistedUi(stored: unknown): Partial<PersistedUiState> {
  if (typeof stored !== 'object' || stored === null) return {};
  const value = stored as Record<string, unknown>;
  const result: Partial<PersistedUiState> = {};
  if (value.dockTab === 'yaml' || value.dockTab === 'checks') result.dockTab = value.dockTab;
  if (typeof value.isDockOpen === 'boolean') result.isDockOpen = value.isDockOpen;
  if ('dockWidth' in value) result.dockWidth = clampWidth(value.dockWidth, DOCK_WIDTH);
  if ('sidebarWidth' in value) result.sidebarWidth = clampWidth(value.sidebarWidth, SIDEBAR_WIDTH);
  return result;
}

const INITIAL_STATE: UiState = {
  selection: null,
  expanded: {},
  activity: 'items',
  dockTab: 'yaml',
  isDockOpen: true,
  isDockOverlayOpen: false,
  dockWidth: DOCK_WIDTH.initial,
  sidebarWidth: SIDEBAR_WIDTH.initial,
  isCommandPaletteOpen: false,
  editorSection: 'general',
  expandedFeatures: {},
};

/** The UI store; its layout part (dock tab, dock and sidebar widths, dock open) is remembered on this device. */
export const useUiStore = create<UiState>()(
  persist(() => INITIAL_STATE, {
    name: 'ui-layout',
    version: 1,
    storage: createJSONStorage(() => safeLocalStorage),
    partialize: ({ dockTab, isDockOpen, dockWidth, sidebarWidth }): PersistedUiState => ({ dockTab, isDockOpen, dockWidth, sidebarWidth }),
    merge: (stored, current) => ({ ...current, ...sanitizePersistedUi(stored) }),
  }),
);

/** Whether the selected entry still exists in `project`. */
export function selectionExists(project: Project, selection: Selection): boolean {
  if (!selection) return true;
  switch (selection.kind) {
    case 'item':
      return selection.id in project.items;
    case 'folder':
      return selection.id in project.folders;
    case 'view':
    case 'settings':
      return true;
  }
}

/** Shows `selection` on the page (null: nothing selected). */
export function select(selection: Selection): void {
  useUiStore.setState({ selection });
}

/** Shows one entry of a registry view (`entry` undefined: the view's overview). */
export function selectEntry(view: ViewName, entry?: string): void {
  select(entry === undefined ? { kind: 'view', view } : { kind: 'view', view, entry });
}

/** The entry of `view` the page shows, if that view is selected with one. */
export function useSelectedEntry(view: ViewName): string | undefined {
  return useUiStore((s) => (s.selection?.kind === 'view' && s.selection.view === view ? s.selection.entry : undefined));
}

/** Opens the settings page (project, device and appearance settings). */
export function openSettings(): void {
  select({ kind: 'settings' });
}

/** Expands or collapses a folder in the sidebar tree. */
export function setExpanded(folderId: string, open: boolean): void {
  useUiStore.setState((s) => ({ expanded: { ...s.expanded, [folderId]: open } }));
}

/** Shows the panel of `activity` in the sidebar. */
export function setActivity(activity: ActivityId): void {
  useUiStore.setState({ activity });
}

/** Switches the output dock to `dockTab` and shows it, as a column on wide windows or as an overlay on narrow ones. */
export function showDock(dockTab: DockTab, isColumn: boolean): void {
  useUiStore.setState(isColumn ? { dockTab, isDockOpen: true } : { dockTab, isDockOverlayOpen: true });
}

/** Switches the output dock's tab without changing whether it is shown. */
export function setDockTab(dockTab: DockTab): void {
  useUiStore.setState({ dockTab });
}

/** Shows or hides the output dock: the column on wide windows, the overlay on narrow ones. */
export function setDockOpen(open: boolean, isColumn: boolean): void {
  useUiStore.setState(isColumn ? { isDockOpen: open } : { isDockOverlayOpen: open });
}

/** Sets the output dock's width, kept inside {@link DOCK_WIDTH}. */
export function setDockWidth(width: number): void {
  useUiStore.setState({ dockWidth: clampWidth(width, DOCK_WIDTH) });
}

/** Sets the sidebar's width, kept inside {@link SIDEBAR_WIDTH}. */
export function setSidebarWidth(width: number): void {
  useUiStore.setState({ sidebarWidth: clampWidth(width, SIDEBAR_WIDTH) });
}

/** Opens or closes the command palette. */
export function setCommandPaletteOpen(open: boolean): void {
  useUiStore.setState({ isCommandPaletteOpen: open });
}

/** Shows `editorSection` in the item editor. */
export function setEditorSection(editorSection: EditorSection): void {
  useUiStore.setState({ editorSection });
}

/** @deprecated Use {@link setEditorSection}. */
export const setEditorTab = setEditorSection;

/** Expands or collapses a feature row of an editor; `key` is chosen by the editor. */
export function setFeatureExpanded(key: string, open: boolean): void {
  useUiStore.setState((s) => ({ expandedFeatures: { ...s.expandedFeatures, [key]: open } }));
}

/**
 * Keeps the UI state in line with the open project: a newly opened project starts with nothing selected, the items
 * activity, every folder expanded and every feature collapsed; a selection whose entry is gone (deleted, undone,
 * removed by others) is dropped. Returns the function that stops following.
 */
export function followOpenProject(): () => void {
  return useProjectStore.subscribe(({ project, generation }, previous) => {
    if (generation !== previous.generation) {
      useUiStore.setState({
        selection: null,
        activity: 'items',
        expanded: project ? Object.fromEntries(Object.keys(project.folders).map((id) => [id, true])) : {},
        expandedFeatures: {},
      });
    } else if (project && project !== previous.project && !selectionExists(project, useUiStore.getState().selection)) {
      useUiStore.setState({ selection: null });
    }
  });
}

/** Shows the entry an issue belongs to. */
export function selectTarget(target: IssueTarget): void {
  switch (target.kind) {
    case 'item':
    case 'folder':
      select({ kind: target.kind, id: target.id });
      break;
    case 'glyph':
      select({ kind: 'view', view: 'glyphs', entry: target.id });
      break;
    case 'sound':
      select({ kind: 'view', view: 'sounds', entry: target.id });
      break;
    case 'painting':
      select({ kind: 'view', view: 'paintings', entry: target.id });
      break;
    case 'dialog':
      select({ kind: 'view', view: 'dialogs' });
      break;
  }
}
