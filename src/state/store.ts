/**
 * Globaler Zustand der App (zustand). Projektänderungen laufen über `mutate`,
 * damit Rückgängig/Wiederholen und das automatische Speichern funktionieren.
 */
import { create } from 'zustand';
import { produce } from 'immer';
import type { Project } from '../core/types';

export type Selection =
  | { kind: 'item'; id: string }
  | { kind: 'folder'; id: string }
  | { kind: 'glyphs' }
  | { kind: 'sounds' }
  | { kind: 'paintings' }
  | { kind: 'testserver' }
  | null;

export type DialogState =
  | { type: 'newItem'; folderId: string; files?: File[] }
  | { type: 'export' }
  | { type: 'settings' }
  | { type: 'newProject' }
  | { type: 'projects' }
  | { type: 'moveItem'; itemId: string }
  | { type: 'share' }
  | { type: 'pasteConfig'; targetItemIds: string[] }
  | {
      type: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
      onConfirm: () => void;
    }
  | {
      type: 'prompt';
      title: string;
      label: string;
      initial: string;
      confirmLabel: string;
      validate?: (value: string) => string | null;
      onSubmit: (value: string) => void;
    };

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export type EditorTab = 'general' | 'model' | 'attributes' | 'components' | 'mechanics' | 'recipes' | 'yaml';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AppState {
  project: Project | null;
  past: Project[];
  future: Project[];
  historyKey: string | null;
  historyTime: number;
  selection: Selection;
  expanded: Record<string, boolean>;
  dialog: DialogState | null;
  toasts: Toast[];
  rightPanel: boolean;
  activeTab: EditorTab;
  saveStatus: SaveStatus;
  /** Projekt ersetzen (z.B. beim Öffnen) – setzt den Verlauf zurück */
  setProject: (project: Project | null) => void;
  /** Projekt ändern. Gleiche `historyKey` innerhalb kurzer Zeit werden zu einem Undo-Schritt zusammengefasst. */
  mutate: (recipe: (draft: Project) => void, historyKey?: string) => void;
  undo: () => void;
  redo: () => void;
  /**
   * Änderungen anderer (geteiltes Projekt) übernehmen. Wird auch auf den Verlauf angewendet,
   * damit „Rückgängig“ nur eigene Änderungen zurücknimmt und nie die der anderen.
   */
  applyRemote: (transform: (project: Project) => Project) => void;
  select: (selection: Selection) => void;
  setExpanded: (folderId: string, open: boolean) => void;
  openDialog: (dialog: DialogState) => void;
  closeDialog: () => void;
  toast: (kind: Toast['kind'], message: string) => void;
  dismissToast: (id: number) => void;
  setRightPanel: (open: boolean) => void;
  setActiveTab: (tab: EditorTab) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1200;
let toastCounter = 0;

export const useStore = create<AppState>((set, get) => ({
  project: null,
  past: [],
  future: [],
  historyKey: null,
  historyTime: 0,
  selection: null,
  expanded: {},
  dialog: null,
  toasts: [],
  rightPanel: true,
  activeTab: 'general',
  saveStatus: 'idle',

  setProject: (project) =>
    set({
      project,
      past: [],
      future: [],
      historyKey: null,
      selection: null,
      expanded: project ? Object.fromEntries(Object.keys(project.folders).map((id) => [id, true])) : {},
      dialog: null,
    }),

  mutate: (recipe, historyKey) => {
    const { project, past, historyKey: lastKey, historyTime } = get();
    if (!project) return;
    const next = produce(project, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
    if (next === project) return;
    const now = Date.now();
    const coalesce = !!historyKey && historyKey === lastKey && now - historyTime < COALESCE_MS;
    set({
      project: next,
      past: coalesce ? past : [...past, project].slice(-HISTORY_LIMIT),
      future: [],
      historyKey: historyKey ?? null,
      historyTime: now,
    });
  },

  undo: () => {
    const { past, project, future } = get();
    if (!project || past.length === 0) return;
    const previous = past[past.length - 1];
    set({ project: previous, past: past.slice(0, -1), future: [project, ...future], historyKey: null });
    fixSelection();
  },

  redo: () => {
    const { past, project, future } = get();
    if (!project || future.length === 0) return;
    const [next, ...rest] = future;
    set({ project: next, past: [...past, project], future: rest, historyKey: null });
    fixSelection();
  },

  applyRemote: (transform) => {
    const { project, past, future } = get();
    if (!project) return;
    set({ project: transform(project), past: past.map(transform), future: future.map(transform), historyKey: null });
    fixSelection();
  },

  select: (selection) => set({ selection }),
  setExpanded: (folderId, open) => set((s) => ({ expanded: { ...s.expanded, [folderId]: open } })),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  toast: (kind, message) => {
    const id = ++toastCounter;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    window.setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setRightPanel: (open) => set({ rightPanel: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));

/** Entfernt eine Auswahl, die nach Undo/Redo nicht mehr existiert. */
function fixSelection() {
  const { selection, project } = useStore.getState();
  if (!selection || !project) return;
  const exists =
    selection.kind === 'glyphs' || selection.kind === 'sounds' || selection.kind === 'paintings' || selection.kind === 'testserver' ? true : selection.kind === 'item' ? !!project.items[selection.id] : !!project.folders[selection.id];
  if (!exists) useStore.setState({ selection: null });
}

export const useProject = () => useStore((s) => s.project);
