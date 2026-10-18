/** The activity bar data: which activities each target offers, where a selection belongs, badges and their texts. */
import { describe, expect, it } from 'vitest';
import { createProject, type PackTargetId } from '@resourcepackbuilder/core/project';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import type { ExportPlan } from '@resourcepackbuilder/export';
import type { Issue } from '@resourcepackbuilder/utils';
import { ACTIVITIES, type ActivityContext, activityById, activityForSelection, availableActivities } from './activities';
import { CRAFT_ENGINE_VIEW_NAMES, MEDIA_VIEW_NAMES } from './sidebar/ViewEntries';

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);
}

function context(target: PackTargetId, overrides: Partial<ActivityContext> = {}): ActivityContext {
  return {
    project: createProject('Demo', undefined, undefined, target),
    plan: null,
    hasTestServer: false,
    testServerStatus: 'stopped',
    ...overrides,
  };
}

const ids = (ctx: ActivityContext) => availableActivities(ctx).map((activity) => activity.id);

describe('availableActivities', () => {
  it('offers the CraftEngine logic lists only in CraftEngine projects', () => {
    expect(ids(context('nexo'))).toEqual(['items', 'media', 'settings']);
    expect(ids(context('craftengine'))).toEqual(['items', 'media', 'logic', 'settings']);
  });

  it('offers the test server only where the desktop program provides it', () => {
    expect(ids(context('nexo', { hasTestServer: true }))).toEqual(['items', 'media', 'testServer', 'settings']);
  });

  it('keeps the test server and settings in the bottom group', () => {
    const bottom = ACTIVITIES.filter((activity) => activity.placement === 'bottom').map((activity) => activity.id);
    expect(bottom).toEqual(['testServer', 'settings']);
  });
});

describe('activityForSelection', () => {
  it('maps items and folders to Items and the settings page to Settings', () => {
    expect(activityForSelection({ kind: 'item', id: 'i' })).toBe('items');
    expect(activityForSelection({ kind: 'folder', id: 'f' })).toBe('items');
    expect(activityForSelection({ kind: 'settings' })).toBe('settings');
    expect(activityForSelection(null)).toBeNull();
  });

  it('maps every registry view to the activity that lists it', () => {
    for (const view of MEDIA_VIEW_NAMES) expect(activityForSelection({ kind: 'view', view })).toBe('media');
    for (const view of CRAFT_ENGINE_VIEW_NAMES) expect(activityForSelection({ kind: 'view', view })).toBe('logic');
    expect(activityForSelection({ kind: 'view', view: 'testServer' })).toBe('testServer');
  });

  it('lists every CraftEngine registry view in the logic activity', () => {
    expect(activityById('logic')?.views).toEqual(CRAFT_ENGINE_VIEW_NAMES);
  });
});

describe('badges', () => {
  const issue = (level: Issue['level'], kind: NonNullable<Issue['target']>['kind']): Issue => ({
    level,
    code: 'plan.duplicateFile' as Issue['code'],
    target: { kind, id: 'x' },
  });
  const withIssues = (issues: Issue[]) => context('nexo', { plan: { issues } as ExportPlan });
  const items = activityById('items')!;
  const media = activityById('media')!;

  it('counts the errors of items and folders, else their warnings', () => {
    expect(items.badge?.(withIssues([issue('warning', 'item'), issue('error', 'folder'), issue('error', 'glyph')]))).toEqual({
      tone: 'error',
      count: 1,
    });
    expect(items.badge?.(withIssues([issue('warning', 'item'), issue('info', 'item')]))).toEqual({ tone: 'warning', count: 1 });
    expect(items.badge?.(withIssues([issue('info', 'item')]))).toBeNull();
  });

  it('counts the media issues on the media activity', () => {
    expect(media.badge?.(withIssues([issue('error', 'sound'), issue('error', 'painting')]))).toEqual({ tone: 'error', count: 2 });
  });

  it('shows the test server status as a dot while it is not stopped', () => {
    const testServer = activityById('testServer')!;
    expect(testServer.badge?.(context('nexo'))).toBeNull();
    expect(testServer.badge?.(context('nexo', { testServerStatus: 'running' }))).toEqual({ tone: 'success' });
  });
});

describe('activity and registry texts', () => {
  for (const [locale, messages] of Object.entries(MESSAGES_BY_LOCALE)) {
    it(`has the ${locale} label and hint of every activity and registry view`, () => {
      const keys = [
        ...ACTIVITIES.flatMap(({ id }) => [`layout.activities.${id}.label`, `layout.activities.${id}.hint`]),
        ...[...MEDIA_VIEW_NAMES, ...CRAFT_ENGINE_VIEW_NAMES].flatMap((view) => [
          `layout.sidebar.resources.${view}.label`,
          `layout.sidebar.resources.${view}.hint`,
        ]),
      ];
      expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
    });
  }
});
