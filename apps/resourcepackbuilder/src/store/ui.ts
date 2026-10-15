/** UI state around the open project: what is selected, which folders are expanded, which panels are shown. */
import { create } from 'zustand';
import type { IssueTarget } from '@resourcepackbuilder/core/issues';
import type { Project } from '@resourcepackbuilder/core/project/types';

/** Project-wide pages that are not tied to a single folder or item. */
export type ViewName = 'glyphs' | 'sounds' | 'paintings' | 'testServer';

export type Selection = { kind: 'item'; id: string } | { kind: 'folder'; id: string } | { kind: 'view'; view: ViewName } | null;

export type EditorTab = 'general' | 'model' | 'attributes' | 'components' | 'mechanics' | 'recipes' | 'yaml';

interface UiState {
  selection: Selection;
  /** Folder id → expanded in the sidebar */
  expanded: Record<string, boolean>;
  isRightPanelOpen: boolean;
  editorTab: EditorTab;
}

export const useUiStore = create<UiState>(() => ({
  selection: null,
  expanded: {},
  isRightPanelOpen: true,
  editorTab: 'general',
}));

/** Whether the selected entry still exists in `project`. */
export function selectionExists(project: Project, selection: Selection): boolean {
  if (!selection) return true;
  switch (selection.kind) {
    case 'item':
      return selection.id in project.items;
    case 'folder':
      return selection.id in project.folders;
    case 'view':
      return true;
  }
}

export function select(selection: Selection): void {
  useUiStore.setState({ selection });
}

export function setExpanded(folderId: string, open: boolean): void {
  useUiStore.setState((s) => ({ expanded: { ...s.expanded, [folderId]: open } }));
}

export function setRightPanelOpen(open: boolean): void {
  useUiStore.setState({ isRightPanelOpen: open });
}

export function setEditorTab(editorTab: EditorTab): void {
  useUiStore.setState({ editorTab });
}

/** Fresh UI state for a newly opened project: nothing selected, every folder expanded. */
export function resetUiFor(project: Project | null): void {
  useUiStore.setState({
    selection: null,
    expanded: project ? Object.fromEntries(Object.keys(project.folders).map((id) => [id, true])) : {},
  });
}

/** Drops the selection when its entry no longer exists in `project` (after undo, redo or remote changes). */
export function repairSelection(project: Project): void {
  const { selection } = useUiStore.getState();
  if (!selectionExists(project, selection)) useUiStore.setState({ selection: null });
}

/** Shows the entry an issue belongs to. */
export function selectTarget(target: IssueTarget): void {
  switch (target.kind) {
    case 'item':
    case 'folder':
      select({ kind: target.kind, id: target.id });
      break;
    case 'glyph':
      select({ kind: 'view', view: 'glyphs' });
      break;
    case 'sound':
      select({ kind: 'view', view: 'sounds' });
      break;
    case 'painting':
      select({ kind: 'view', view: 'paintings' });
      break;
  }
}
