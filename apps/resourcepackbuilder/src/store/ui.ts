/** UI state around the open project: what is selected, which folders are expanded, which panels are shown. */
import { create } from 'zustand';
import type { IssueTarget } from '@resourcepackbuilder/utils';
import type { Project } from '@resourcepackbuilder/core/project';
import { useProjectStore } from './project';

/** Project-wide pages that are not tied to a single folder or item. */
export type ViewName =
  'glyphs' | 'sounds' | 'paintings' | 'lootSources' | 'templates' | 'globalVariables' | 'attributes' | 'translations' | 'testServer';

export type Selection = { kind: 'item'; id: string } | { kind: 'folder'; id: string } | { kind: 'view'; view: ViewName } | null;

/** A tab of the item editor: one of the fixed tabs (general, model, recipes, yaml) or a property tab of the project's form. */
export type EditorTab = string;

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

/**
 * Keeps the UI state in line with the open project: a newly opened project starts with nothing selected and every
 * folder expanded; a selection whose entry is gone (deleted, undone, removed by others) is dropped. Returns the
 * function that stops following.
 */
export function followOpenProject(): () => void {
  return useProjectStore.subscribe(({ project, generation }, previous) => {
    if (generation !== previous.generation) {
      useUiStore.setState({
        selection: null,
        expanded: project ? Object.fromEntries(Object.keys(project.folders).map((id) => [id, true])) : {},
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
