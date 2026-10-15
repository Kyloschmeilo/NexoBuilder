/**
 * Dialogs. Simple questions (`confirm`, `prompt`) return promises and stack, so a question asked from inside a
 * dialog never replaces the one underneath. Feature dialogs (export, settings …) are opened by id; the shell renders
 * them from its registry. At most one feature dialog is open at a time.
 */
import { create } from 'zustand';
import { getProject } from './project';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean;
}

export interface PromptOptions {
  title: string;
  label: string;
  initial: string;
  confirmLabel: string;
  /** Error text for an invalid value, or null when it is fine. Empty values are always rejected. */
  validate?: (value: string) => string | null;
}

export type Question =
  | { id: number; kind: 'confirm'; options: ConfirmOptions; resolve: (confirmed: boolean) => void }
  | { id: number; kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

/** Every feature dialog with the props it is opened with. */
export interface FeatureDialogProps {
  newItem: { folderId: string; files?: File[] };
  export: Record<string, never>;
  settings: Record<string, never>;
  projects: { tab: 'open' | 'new' };
  moveItem: { itemId: string };
  share: Record<string, never>;
  pasteConfig: { targetItemIds: string[] };
}

export type FeatureDialogId = keyof FeatureDialogProps;

export type OpenFeatureDialog = { [K in FeatureDialogId]: { id: K; props: FeatureDialogProps[K] } }[FeatureDialogId];

/** An open feature dialog with the id of the project that was open when it was opened. */
export type OpenedFeatureDialog = OpenFeatureDialog & { projectId: string | null };

interface DialogState {
  questions: Question[];
  feature: OpenedFeatureDialog | null;
  nextId: number;
}

export const useDialogStore = create<DialogState>(() => ({ questions: [], feature: null, nextId: 1 }));

function ask<T>(create: (id: number, resolve: (value: T) => void) => Question): Promise<T> {
  return new Promise<T>((resolve) => {
    useDialogStore.setState((s) => {
      const id = s.nextId;
      const answer = (value: T) => {
        useDialogStore.setState((current) => ({ questions: current.questions.filter((q) => q.id !== id) }));
        resolve(value);
      };
      return { questions: [...s.questions, create(id, answer)], nextId: id + 1 };
    });
  });
}

/** Asks a yes/no question; resolves with `true` when confirmed, `false` when cancelled. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return ask<boolean>((id, resolve) => ({ id, kind: 'confirm', options, resolve }));
}

/** Asks for a text; resolves with the trimmed value, or `null` when cancelled. */
export function prompt(options: PromptOptions): Promise<string | null> {
  return ask<string | null>((id, resolve) => ({ id, kind: 'prompt', options, resolve }));
}

/** Opens a feature dialog, e.g. `openDialog({ id: 'moveItem', props: { itemId } })`; replaces an open one. */
export function openDialog(dialog: OpenFeatureDialog): void {
  useDialogStore.setState({ feature: { ...dialog, projectId: getProject()?.id ?? null } });
}

export function closeDialog(): void {
  useDialogStore.setState({ feature: null });
}
