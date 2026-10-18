/**
 * The app's keyboard shortcuts: Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) undo and redo project changes (text fields keep their
 * own undo), Ctrl+K opens the command palette and Ctrl+J shows or hides the output dock, also from inside a field.
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
