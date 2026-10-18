/**
 * The activity bar as data. Each activity has an icon, a label (`layout.activities.<id>.label` and `.hint`), the pack
 * targets that offer it, where it sits on the bar, and what it opens: a sidebar panel (items tree, media lists,
 * CraftEngine logic lists) or a page (test server, settings). The registry panels take their entries from the view
 * lists in `sidebar/ViewEntries.tsx`, so a new project-level view appears in its activity by adding one entry there.
 */
import { Blocks, Folders, Images, Server, Settings, type LucideIcon } from 'lucide-react';
import type { ExportPlan } from '@resourcepackbuilder/export';
import type { PackTargetId, Project } from '@resourcepackbuilder/core/project';
import type { TestServerStatus } from '@resourcepackbuilder/test-server';
import { countIssues } from '@resourcepackbuilder/utils';
import type { Tone } from '@resourcepackbuilder/ui';
import type { ActivityId, Selection, ViewName } from '../store/ui';
import { TEST_SERVER_STATUS_TONE } from '../features/testServer/status';
import { CRAFT_ENGINE_VIEW_NAMES, MEDIA_VIEW_NAMES } from './sidebar/ViewEntries';

/** What the bar knows when it decides which activities to show and what their badges say. */
export interface ActivityContext {
  project: Project;
  plan: ExportPlan | null;
  /** Whether the desktop program's test server is available (absent in the browser) */
  hasTestServer: boolean;
  testServerStatus: TestServerStatus;
}

/** A count or a status dot on an activity's icon. */
export interface ActivityBadge {
  tone: Tone;
  /** Shown as a number; without one the badge is a dot */
  count?: number;
}

/** One entry of the activity bar. */
export interface Activity {
  id: ActivityId;
  icon: LucideIcon;
  /** Top group (navigation) or bottom group (tools and settings) */
  placement: 'top' | 'bottom';
  /** The pack targets that offer this activity; every target when absent */
  targets?: readonly PackTargetId[];
  /** Whether it needs the desktop program's test server */
  needsTestServer?: boolean;
  /** The project-wide views whose pages belong to this activity (selecting one switches to it) */
  views: readonly ViewName[];
  /** Opened by the activity instead of a sidebar panel; the page then gets the sidebar's room */
  page?: Exclude<Selection, null>;
  badge?: (context: ActivityContext) => ActivityBadge | null;
}

/** Errors (or else warnings) of the issues whose target is one of `kinds`. */
function issueBadge(plan: ExportPlan | null, kinds: ReadonlyArray<string>): ActivityBadge | null {
  if (!plan) return null;
  const counts = countIssues(plan.issues.filter((issue) => issue.target && kinds.includes(issue.target.kind)));
  if (counts.error > 0) return { tone: 'error', count: counts.error };
  if (counts.warning > 0) return { tone: 'warning', count: counts.warning };
  return null;
}

/** Every activity, in bar order within its group. */
export const ACTIVITIES: readonly Activity[] = [
  {
    id: 'items',
    icon: Folders,
    placement: 'top',
    views: [],
    badge: ({ plan }) => issueBadge(plan, ['item', 'folder']),
  },
  {
    id: 'media',
    icon: Images,
    placement: 'top',
    views: MEDIA_VIEW_NAMES,
    badge: ({ plan }) => issueBadge(plan, ['glyph', 'sound', 'painting']),
  },
  {
    id: 'logic',
    icon: Blocks,
    placement: 'top',
    targets: ['craftengine'],
    views: CRAFT_ENGINE_VIEW_NAMES,
  },
  {
    id: 'testServer',
    icon: Server,
    placement: 'bottom',
    needsTestServer: true,
    views: ['testServer'],
    page: { kind: 'view', view: 'testServer' },
    badge: ({ testServerStatus }) => (testServerStatus === 'stopped' ? null : { tone: TEST_SERVER_STATUS_TONE[testServerStatus] }),
  },
  {
    id: 'settings',
    icon: Settings,
    placement: 'bottom',
    views: [],
    page: { kind: 'settings' },
  },
];

/** Whether `activity` is offered for the open project on this platform. */
export function isActivityAvailable(activity: Activity, context: Pick<ActivityContext, 'project' | 'hasTestServer'>): boolean {
  if (activity.targets && !activity.targets.includes(context.project.target)) return false;
  return !activity.needsTestServer || context.hasTestServer;
}

/** The activities offered for the open project on this platform, in bar order. */
export function availableActivities(context: Pick<ActivityContext, 'project' | 'hasTestServer'>): Activity[] {
  return ACTIVITIES.filter((activity) => isActivityAvailable(activity, context));
}

/** The activity with `id`, if there is one. */
export function activityById(id: ActivityId): Activity | undefined {
  return ACTIVITIES.find((activity) => activity.id === id);
}

/** The activity a selection belongs to: items and folders to Items, views to the activity listing them, settings to Settings. */
export function activityForSelection(selection: Selection): ActivityId | null {
  if (!selection) return null;
  switch (selection.kind) {
    case 'item':
    case 'folder':
      return 'items';
    case 'settings':
      return 'settings';
    case 'view':
      return ACTIVITIES.find((activity) => activity.views.includes(selection.view))?.id ?? null;
  }
}
