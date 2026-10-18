/** The workbench layout state: width limits, the remembered layout, the dock's visibility and resetting on a new project. */
import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project';
import { setProject } from './project';
import {
  clampWidth,
  DOCK_WIDTH,
  followOpenProject,
  sanitizePersistedUi,
  select,
  selectEntry,
  selectTarget,
  setActivity,
  setDockOpen,
  setDockWidth,
  setFeatureExpanded,
  setSidebarWidth,
  showDock,
  SIDEBAR_WIDTH,
  useUiStore,
} from './ui';

const state = () => useUiStore.getState();

describe('clampWidth', () => {
  it('keeps widths inside the range and rounds them', () => {
    expect(clampWidth(10, SIDEBAR_WIDTH)).toBe(SIDEBAR_WIDTH.min);
    expect(clampWidth(10_000, SIDEBAR_WIDTH)).toBe(SIDEBAR_WIDTH.max);
    expect(clampWidth(300.4, SIDEBAR_WIDTH)).toBe(300);
  });

  it('falls back to the initial width for anything but a finite number', () => {
    expect(clampWidth('wide', DOCK_WIDTH)).toBe(DOCK_WIDTH.initial);
    expect(clampWidth(Number.NaN, DOCK_WIDTH)).toBe(DOCK_WIDTH.initial);
  });
});

describe('sanitizePersistedUi', () => {
  it('keeps valid remembered values and clamps widths', () => {
    expect(sanitizePersistedUi({ dockTab: 'checks', isDockOpen: false, dockWidth: 9999, sidebarWidth: 250 })).toEqual({
      dockTab: 'checks',
      isDockOpen: false,
      dockWidth: DOCK_WIDTH.max,
      sidebarWidth: 250,
    });
  });

  it('drops invalid values', () => {
    expect(sanitizePersistedUi({ dockTab: 'logs', isDockOpen: 'yes' })).toEqual({});
    expect(sanitizePersistedUi(null)).toEqual({});
    expect(sanitizePersistedUi('broken')).toEqual({});
  });
});

describe('dock and widths', () => {
  it('opens the column on wide windows and the overlay on narrow ones', () => {
    setDockOpen(false, true);
    showDock('checks', true);
    expect(state()).toMatchObject({ dockTab: 'checks', isDockOpen: true });
    showDock('yaml', false);
    expect(state()).toMatchObject({ dockTab: 'yaml', isDockOverlayOpen: true });
    setDockOpen(false, false);
    expect(state().isDockOverlayOpen).toBe(false);
    expect(state().isDockOpen).toBe(true);
  });

  it('clamps dragged widths', () => {
    setDockWidth(100);
    setSidebarWidth(5000);
    expect(state().dockWidth).toBe(DOCK_WIDTH.min);
    expect(state().sidebarWidth).toBe(SIDEBAR_WIDTH.max);
  });
});

describe('followOpenProject', () => {
  let stop: (() => void) | null = null;
  afterEach(() => {
    stop?.();
    setProject(null);
  });

  it('starts a newly opened project on the items activity with nothing selected or expanded', () => {
    stop = followOpenProject();
    setActivity('logic');
    select({ kind: 'settings' });
    setFeatureExpanded('item/food', true);
    setProject(createProject('Next'));
    expect(state()).toMatchObject({ activity: 'items', selection: null, expandedFeatures: {} });
  });
});

describe('registry entries', () => {
  afterEach(() => select(null));

  it('selects a registry view with or without one of its entries', () => {
    selectEntry('lootSources', 'lootSources/2');
    expect(state().selection).toEqual({ kind: 'view', view: 'lootSources', entry: 'lootSources/2' });
    selectEntry('lootSources');
    expect(state().selection).toEqual({ kind: 'view', view: 'lootSources' });
  });

  it('opens the glyph, sound or painting an issue belongs to', () => {
    selectTarget({ kind: 'glyph', id: 'g1' });
    expect(state().selection).toEqual({ kind: 'view', view: 'glyphs', entry: 'g1' });
    selectTarget({ kind: 'sound', id: 's1' });
    expect(state().selection).toEqual({ kind: 'view', view: 'sounds', entry: 's1' });
    selectTarget({ kind: 'painting', id: 'p1' });
    expect(state().selection).toEqual({ kind: 'view', view: 'paintings', entry: 'p1' });
  });
});
