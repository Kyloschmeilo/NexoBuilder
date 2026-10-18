/**
 * The rows of a feature list (UX §3.4). A collapsed row is 44 px: chevron, label, an inline summary of the value, the
 * YAML key in the key rail, the docs link, an issue icon and the `⋯` menu. A scalar feature passes its control instead
 * of children and is edited right in the row, without an expanded state. `FeatureList` stacks rows in one panel with
 * hairlines between them.
 */
import { type ComponentProps, type ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, CircleAlert, Ellipsis, TriangleAlert } from 'lucide-react';
import { clsx } from 'cn';
import { DocsLink, type DocsRef, MenuEntries, type MenuEntry, Panel, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';

/** A problem of a feature's value, shown as an icon with the message as tooltip. */
export interface FeatureIssue {
  tone: 'error' | 'warning';
  message: string;
}

export interface FeatureRowProps {
  /** Human name of the feature. */
  label: string;
  /** The value in a few words ("4 food, 2.4 sat", "On"), shown while collapsed. */
  summary?: ReactNode;
  /** The YAML path, in the key rail. */
  yamlKey?: string;
  docs?: DocsRef;
  /** Small pills after the label (Premium, version). */
  badges?: ReactNode;
  /** The worst problem of the value; more go into the expanded content. */
  issue?: FeatureIssue;
  /** A control edited right in the row (a switch, one number). The row then has no chevron and no expanded state. */
  control?: ReactNode;
  /** The expanded content: the feature's fields, more options and notes. */
  children?: ReactNode;
  /** Controlled expansion (e.g. kept in the ui store per item); uncontrolled with `defaultOpen` otherwise. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The `⋯` menu (Reset, Copy YAML, Remove). */
  menu?: MenuEntry[];
  /** Set on the row, for jumping to a feature (`[data-feature-id]`). */
  featureId?: string;
  className?: string;
}

/** One feature: a collapsed 44 px row, expanded on demand. */
export function FeatureRow({
  label,
  summary,
  yamlKey,
  docs,
  badges,
  issue,
  control,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  menu,
  featureId,
  className,
}: FeatureRowProps) {
  const t = useTranslations('editor.feature');
  const contentId = useId();
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const expandable = !control && children !== undefined && children !== null && children !== false;
  const isOpen = expandable && (open ?? ownOpen);
  const toggle = () => {
    setOwnOpen(!isOpen);
    onOpenChange?.(!isOpen);
  };
  const IssueIcon = issue?.tone === 'error' ? CircleAlert : TriangleAlert;

  return (
    <div
      data-slot="feature-row"
      data-feature-id={featureId}
      data-open={isOpen || undefined}
      className={clsx('@container/feature min-w-0', className)}
    >
      <div className="flex min-h-11 items-center gap-2 px-2">
        {expandable ? (
          <button
            type="button"
            data-slot="feature-toggle"
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={toggle}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={clsx('size-4 flex-none text-text-muted transition-transform', isOpen && 'rotate-90')} aria-hidden />
            <RowLabel label={label} badges={badges} />
            {summary !== undefined && !isOpen && <Summary>{summary}</Summary>}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-6">
            <RowLabel label={label} badges={badges} />
            {control ? (
              <div className="ml-auto flex min-w-0 items-center">{control}</div>
            ) : (
              summary !== undefined && <Summary>{summary}</Summary>
            )}
          </div>
        )}
        {yamlKey && (
          <code
            data-slot="yaml-key"
            className="hidden max-w-48 flex-none truncate font-mono text-micro text-text-faint @xl/feature:block"
            title={yamlKey}
          >
            {yamlKey}
          </code>
        )}
        {docs && <DocsLink {...docs} label={label} />}
        {issue && (
          <Tip label={issue.message}>
            <span
              role="img"
              aria-label={issue.message}
              className={clsx('inline-grid size-5 flex-none place-items-center', issue.tone === 'error' ? 'text-danger' : 'text-warning')}
            >
              <IssueIcon className="size-4" aria-hidden />
            </span>
          </Tip>
        )}
        {menu && menu.length > 0 && (
          <DropdownMenu>
            <Tip label={t('actions', { name: label })}>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('actions', { name: label })} />}>
                <Ellipsis />
              </DropdownMenuTrigger>
            </Tip>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <MenuEntries entries={menu} kind="dropdown" />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {expandable && (
        <div id={contentId} hidden={!isOpen} className="pr-3 pb-3 pl-8">
          {isOpen && children}
        </div>
      )}
    </div>
  );
}

function RowLabel({ label, badges }: { label: string; badges?: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-none items-center gap-1.5 [max-width:60%]">
      <span className="truncate text-label font-medium text-text">{label}</span>
      {badges}
    </span>
  );
}

function Summary({ children }: { children: ReactNode }) {
  return <span className="min-w-0 flex-1 truncate text-meta text-text-muted">{children}</span>;
}

/** A panel of feature rows separated by hairlines, without gaps. */
export function FeatureList({ className, ...props }: ComponentProps<'div'>) {
  return <Panel data-slot="feature-list" className={clsx('divide-y divide-line', className)} {...props} />;
}

/** One muted line of notes below a feature's fields (version, Premium, conflicts). */
export function FeatureNotes({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-meta text-text-muted">{children}</p>;
}
