// @vitest-environment jsdom
/**
 * Keyboard behaviour of the shell: Ctrl+K and Ctrl+J are swallowed while a modal dialog (the palette included) is
 * open, and the overlay dock takes the focus when it opens, gives it back when it closes and closes on Escape.
 */
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDockOpen, useUiStore } from '../store/ui';
import { useOverlayFocus } from './OutputDock';
import { isModalDialogOpen, type ShortcutActions, useShortcuts } from './useShortcuts';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

/** Presses a key on `target` (bubbling up to the window) and returns whether the press was default-prevented. */
function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

/** An open dialog popup as the dialog components render it. */
function openModal(slot = 'dialog-content'): HTMLElement {
  const popup = document.createElement('div');
  popup.dataset.slot = slot;
  document.body.append(popup);
  return popup;
}

function Shortcuts(props: ShortcutActions) {
  useShortcuts(props);
  return null;
}

describe('useShortcuts', () => {
  it('opens the palette with Ctrl+K and toggles the dock with Ctrl+J', () => {
    const actions = { openCommandPalette: vi.fn(), toggleDock: vi.fn() };
    act(() => root.render(<Shortcuts {...actions} />));
    expect(press('k', { ctrlKey: true })).toBe(true);
    expect(press('j', { ctrlKey: true })).toBe(true);
    expect(actions.openCommandPalette).toHaveBeenCalledTimes(1);
    expect(actions.toggleDock).toHaveBeenCalledTimes(1);
  });

  it('swallows Ctrl+K and Ctrl+J while a modal dialog or the palette is open', () => {
    const actions = { openCommandPalette: vi.fn(), toggleDock: vi.fn() };
    act(() => root.render(<Shortcuts {...actions} />));
    const popup = openModal();
    expect(isModalDialogOpen()).toBe(true);
    expect(press('j', { ctrlKey: true })).toBe(true);
    expect(press('k', { ctrlKey: true })).toBe(true);
    popup.remove();
    const confirm = openModal('alert-dialog-content');
    expect(press('j', { metaKey: true })).toBe(true);
    expect(actions.openCommandPalette).not.toHaveBeenCalled();
    expect(actions.toggleDock).not.toHaveBeenCalled();
    confirm.remove();
    press('j', { ctrlKey: true });
    expect(actions.toggleDock).toHaveBeenCalledTimes(1);
  });

  it('ignores a dialog that is closing', () => {
    openModal().setAttribute('data-closed', '');
    expect(isModalDialogOpen()).toBe(false);
  });
});

function Overlay({ isOverlay }: { isOverlay: boolean }) {
  const dock = useRef<HTMLElement>(null);
  useOverlayFocus(dock, isOverlay);
  return (
    <aside ref={dock} tabIndex={-1} data-testid="dock">
      <button type="button">Close</button>
    </aside>
  );
}

describe('overlay dock focus', () => {
  it('takes the focus on open and gives it back to the toggle on close', () => {
    const toggle = document.createElement('button');
    document.body.append(toggle);
    toggle.focus();
    act(() => root.render(<Overlay isOverlay />));
    const dock = container.querySelector('aside');
    expect(document.activeElement).toBe(dock);
    container.querySelector('button')?.focus();
    act(() => root.render(<></>));
    expect(document.activeElement).toBe(toggle);
  });

  it('closes on Escape from anywhere, but not under a modal dialog', () => {
    useUiStore.setState({ isDockOverlayOpen: true });
    act(() => root.render(<Overlay isOverlay />));
    const popup = openModal();
    press('Escape');
    expect(useUiStore.getState().isDockOverlayOpen).toBe(true);
    popup.remove();
    expect(press('Escape')).toBe(true);
    expect(useUiStore.getState().isDockOverlayOpen).toBe(false);
  });

  it('leaves a column dock alone', () => {
    setDockOpen(true, false);
    const field = document.createElement('input');
    document.body.append(field);
    field.focus();
    act(() => root.render(<Overlay isOverlay={false} />));
    expect(document.activeElement).toBe(field);
    expect(press('Escape')).toBe(false);
    expect(useUiStore.getState().isDockOverlayOpen).toBe(true);
  });
});
