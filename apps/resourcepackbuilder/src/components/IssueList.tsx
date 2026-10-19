import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { IssueKey } from '@resourcepackbuilder/i18n';
import type { Issue, IssueLevel, IssueTarget } from '@resourcepackbuilder/utils';
import { useRenderMessage } from '../i18n/errors';
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
  dialog: 'issueList.openDialogs',
};

/**
 * Returns a function that renders an issue from core in the current language: the message `code` from
 * the `issues` namespace with its `args` (label args `{ key, args }` are translated from the `schema`
 * namespace), prefixed by its `context` frames (outermost first, each an `issues` message):
 * `frame › frame: message`.
 */
export function useIssueText(): (issue: Issue) => string {
  const render = useRenderMessage();
  return useCallback(
    (issue: Issue) => {
      const message = render(issue.code, issue.args);
      if (!issue.context?.length) return message;
      return `${issue.context.map((frame) => render(frame.code, frame.args)).join(' › ')}: ${message}`;
    },
    [render],
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
