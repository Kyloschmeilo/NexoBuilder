/**
 * The activity bar: a narrow rail of icon buttons on the left that switches the sidebar panel (items, media,
 * CraftEngine logic) or opens a page (test server, settings). Its entries come from `activities.ts`.
 */
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Tip } from '@resourcepackbuilder/ui';
import { useServices } from '../services/bootstrap';
import { useTestServerStore } from '../services/testServerStore';
import { useOpenProject } from '../store/project';
import { select, setActivity, useUiStore } from '../store/ui';
import { type Activity, type ActivityBadge, type ActivityContext, availableActivities } from './activities';
import { usePlan } from './PlanProvider';

/** Background of a badge per tone. */
const BADGE_CLASS: Record<ActivityBadge['tone'], string> = {
  neutral: 'bg-text-muted text-surface',
  info: 'bg-primary text-primary-foreground',
  busy: 'bg-transparent ring-[1.5px] ring-primary ring-inset',
  success: 'bg-success text-success-contrast',
  warning: 'bg-warning text-warning-contrast',
  error: 'bg-danger text-danger-contrast',
};

/** Largest count shown as a number; above it the badge says "99+". */
const MAX_BADGE_COUNT = 99;

function Badge({ badge }: { badge: ActivityBadge }) {
  const hasCount = badge.count !== undefined;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute grid place-items-center rounded-full font-mono font-medium',
        hasCount ? 'top-0.5 right-0.5 h-3.5 min-w-3.5 px-0.5 text-[10px] leading-none' : 'top-1.5 right-1.5 size-2',
        BADGE_CLASS[badge.tone],
      )}
    >
      {hasCount && (badge.count! > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : badge.count)}
    </span>
  );
}

function ActivityButton({ activity, context }: { activity: Activity; context: ActivityContext }) {
  const t = useTranslations('layout.activities');
  const tBadge = useTranslations('layout.activities.badge');
  const isActive = useUiStore((s) => s.activity === activity.id);
  const label = t(`${activity.id}.label`);
  const badge = activity.badge?.(context) ?? null;
  const badgeText = badge?.count !== undefined ? tBadge(badge.tone === 'error' ? 'errors' : 'warnings', { count: badge.count }) : undefined;
  const Icon = activity.icon;
  const open = () => {
    setActivity(activity.id);
    if (activity.page) select(activity.page);
  };
  return (
    <Tip
      side="right"
      label={
        <span className="flex flex-col">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">{t(`${activity.id}.hint`)}</span>
        </span>
      }
    >
      <button
        type="button"
        aria-current={isActive ? 'true' : undefined}
        data-activity={activity.id}
        className={cn(
          'relative grid size-8.5 place-items-center rounded-(--radius-control) text-text-muted outline-none hover:bg-muted hover:text-text',
          'focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'bg-accent-soft text-primary hover:bg-accent-soft hover:text-primary',
          '[&_svg]:size-4.5',
        )}
        onClick={open}
      >
        {isActive && <span aria-hidden="true" className="absolute inset-y-1.5 -left-1.5 w-0.5 rounded-full bg-primary" />}
        <Icon aria-hidden="true" />
        <span className="sr-only">{badgeText ? tBadge('withBadge', { label, badge: badgeText }) : label}</span>
        {badge && <Badge badge={badge} />}
      </button>
    </Tip>
  );
}

/** The rail of activities; the bottom group (test server, settings) sits at the bottom. */
export function ActivityBar() {
  const t = useTranslations('layout.activities');
  const project = useOpenProject();
  const plan = usePlan();
  const hasTestServer = useServices().testServer !== null;
  const testServerStatus = useTestServerStore((s) => s.server?.status ?? 'stopped');
  const context: ActivityContext = { project, plan, hasTestServer, testServerStatus };
  const activities = availableActivities(context);
  const group = (placement: Activity['placement']) =>
    activities
      .filter((activity) => activity.placement === placement)
      .map((activity) => <ActivityButton key={activity.id} activity={activity} context={context} />);

  return (
    <nav aria-label={t('title')} className="flex w-11.5 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2">
      {group('top')}
      <span className="flex-1" />
      {group('bottom')}
    </nav>
  );
}
