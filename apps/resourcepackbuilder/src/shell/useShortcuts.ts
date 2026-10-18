/**
 * The app's keyboard shortcuts: Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) undo and redo project changes (text fields keep their
 * own undo), Ctrl+K opens the command palette and Ctrl+J shows or hides the output dock, also from inside a field.
 * While a modal dialog (the palette included) is open, Ctrl+K and Ctrl+J do nothing: the key press is swallowed, so
 * neither the browser nor the page behind the dialog reacts to it.
 */
import { useEffect, useRef } from 'react';
import { redo, undo } from '../store/project';

/** The shortcuts that need the open project; the others always work. */
export interface ShortcutActions {
  /** Ctrl+K; absent while there is nothing to search (no open project) */
  openCommandPalette?: () => void;
  /** Ctrl+J; absent while there is no dock (no open project) */
  toggleDock?: () => void;
}

/** Whether a key press goes to a text field, which keeps its own undo and redo. */
function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

/** Popups of modal dialogs (feature dialogs, confirm and prompt, the command palette) while they are open. */
const OPEN_MODAL_SELECTOR = ':is([data-slot="dialog-content"], [data-slot="alert-dialog-content"]):not([data-closed])';

/** Whether a modal dialog is open in `doc`; the page behind it must not react to the global shortcuts then. */
export function isModalDialogOpen(doc: Document = document): boolean {
  return doc.querySelector(OPEN_MODAL_SELECTOR) !== null;
}

/** Listens for the app's shortcuts while the shell is mounted. */
export function useShortcuts(actions: ShortcutActions = {}): void {
  // The listener is registered once and always calls the latest actions
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const { openCommandPalette, toggleDock } = latest.current;
      if ((key === 'k' || key === 'j') && !e.shiftKey && isModalDialogOpen()) {
        e.preventDefault();
        return;
      }
      if (key === 'k' && !e.shiftKey && openCommandPalette) {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (key === 'j' && !e.shiftKey && toggleDock) {
        e.preventDefault();
        toggleDock();
        return;
      }
      if (isTextField(e.target)) return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
