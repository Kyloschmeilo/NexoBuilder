import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { IssueKey } from '@resourcepackbuilder/i18n';
import type { Issue, IssueLevel, IssueTarget, MessageArgs } from '@resourcepackbuilder/core/issues';
import { TONE_ALERT_VARIANT, TONE_ICONS } from '@resourcepackbuilder/ui';
import { Alert, AlertAction, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';

const LEVEL_ORDER: Record<IssueLevel, number> = { error: 0, warning: 1, info: 2 };

/** Message key of the jump button label per target kind. */
const OPEN_LABEL_KEYS: Record<IssueTarget['kind'], IssueKey> = {
  item: 'issueList.openItem',
  folder: 'issueList.openFolder',
  glyph: 'issueList.openGlyphs',
  sound: 'issueList.openSounds',
  painting: 'issueList.openPaintings',
};

/**
 * Returns a function that renders an issue from core in the current language: the message `code` from
 * the `issues` namespace with its `args` (label args `{ key, args }` are translated from the `schema`
 * namespace), prefixed by its `context` frames (outermost first, each an `issues` message):
 * `frame › frame: message`.
 */
export function useIssueText(): (issue: Issue) => string {
  const t = useTranslations('issues');
  const tSchema = useTranslations('schema');
  return useCallback(
    (issue: Issue) => {
      // Codes and label keys are runtime keys; core's tests keep every one of them in the catalogues.
      const render = (code: string, args: MessageArgs = {}) => {
        const values: Record<string, string | number> = {};
        for (const [name, arg] of Object.entries(args)) {
          values[name] = typeof arg === 'object' ? tSchema(arg.key as never, (arg.args ?? {}) as never) : arg;
        }
        return t(code as never, values as never);
      };
      const message = render(issue.code, issue.args);
      if (!issue.context?.length) return message;
      return `${issue.context.map((frame) => render(frame.code, frame.args)).join(' › ')}: ${message}`;
    },
    [t, tSchema],
  );
}

interface IssueListProps {
  issues: Issue[];
  /** Jump to an issue's target; without it no jump buttons are shown. */
  onOpen?: (target: IssueTarget) => void;
  /** Whether the jump is offered for this issue (e.g. only for issues of the open project). */
  canOpen?: (issue: Issue) => boolean;
  /** Shown when there is nothing to list (nothing is rendered without it) */
  empty?: string;
  hideInfo?: boolean;
}

/** Issues sorted by severity, each with its icon and an optional jump to its target. */
export function IssueList({ issues, onOpen, canOpen = () => true, empty, hideInfo }: IssueListProps) {
  const t = useTranslations('issues');
  const text = useIssueText();
  const visibleIssues = issues.filter((i) => !hideInfo || i.level !== 'info').sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  if (visibleIssues.length === 0) return empty ? <div className="text-xs text-muted-foreground">{empty}</div> : null;
  return (
    <div role="list" className="flex flex-col gap-1.5">
      {visibleIssues.map((issue, i) => {
        const Icon = TONE_ICONS[issue.level];
        const target = issue.target;
        const jump = onOpen && target && canOpen(issue) ? { label: OPEN_LABEL_KEYS[target.kind], run: () => onOpen(target) } : null;
        return (
          <Alert key={i} role="listitem" variant={TONE_ALERT_VARIANT[issue.level]} className={jump ? 'py-1.5 pr-28' : 'py-1.5'}>
            <Icon aria-label={t(`issueList.level.${issue.level}`)} />
            <AlertDescription>{text(issue)}</AlertDescription>
            {jump && (
              <AlertAction className="top-1 flex">
                <Button variant="link" size="xs" onClick={jump.run}>
                  {t(jump.label)}
                </Button>
              </AlertAction>
            )}
          </Alert>
        );
      })}
    </div>
  );
}
