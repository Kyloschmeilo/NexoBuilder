/**
 * Dialogs. Simple questions (`confirm`, `prompt`) return promises and stack, so a question asked from inside a
 * dialog never replaces the one underneath.
 *
 * Feature dialogs (export, settings …) are Base UI dialogs opened through their handle (`exportDialog.open(null)`,
 * `moveItemDialog.openWithPayload({ itemId })`); each one renders its root once in the shell and registers here, so
 * `isAnyDialogOpen` sees them and `closeProjectDialogs` can close the ones that belong to the open project.
 */
import { create } from 'zustand';
import type { DialogHandle } from '@resourcepackbuilder/ui/components/dialog';

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

interface DialogState {
  questions: Question[];
  nextId: number;
}

export const useDialogStore = create<DialogState>(() => ({ questions: [], nextId: 1 }));

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

/** Mounted feature dialogs; `true` for the ones that belong to the open project. */
const featureDialogs = new Map<DialogHandle<never>, boolean>();

/** Called by a mounted feature dialog root; returns the function that unregisters it. */
export function registerFeatureDialog(handle: DialogHandle<never>, isProjectBound: boolean): () => void {
  featureDialogs.set(handle, isProjectBound);
  return () => featureDialogs.delete(handle);
}

/** Closes every feature dialog that belongs to the open project (it was closed or another one was opened). */
export function closeProjectDialogs(): void {
  for (const [handle, isProjectBound] of featureDialogs) if (isProjectBound && handle.isOpen) handle.close();
}

/** Whether a question or a feature dialog is open (window-level drops then stay out of the way). */
export function isAnyDialogOpen(): boolean {
  return useDialogStore.getState().questions.length > 0 || [...featureDialogs.keys()].some((handle) => handle.isOpen);
}
