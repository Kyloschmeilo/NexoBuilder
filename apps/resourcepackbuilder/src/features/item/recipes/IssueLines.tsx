/**
 * The problems of a recipe part as short coloured lines (icon and message) instead of alert boxes, so a recipe with a
 * few open slots stays calm; and the helpers that pick a row's worst problem or a field's error and warning text.
 */
import type { ReactNode } from 'react';
import type { Issue } from '@resourcepackbuilder/utils';
import { cn } from '@resourcepackbuilder/ui/cn';
import { TONE_ICONS } from '@resourcepackbuilder/ui';
import { useIssueText } from '../../../components/IssueList';
import type { FeatureIssue } from '../../../components/features';

const LEVEL_CLASS = { error: 'text-danger', warning: 'text-warning', info: 'text-text-muted' } as const;

/** The issues as one line each, errors first; nothing when there are none. */
export function IssueLines({ issues, className }: { issues: readonly Issue[]; className?: string }) {
  const text = useIssueText();
  if (issues.length === 0) return null;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const sorted = [...issues].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <ul className={cn('m-0 flex list-none flex-col gap-1 p-0', className)}>
      {sorted.map((issue, i) => {
        const Icon = TONE_ICONS[issue.level];
        return (
          <li key={i} className={cn('flex items-start gap-1.5 text-meta', LEVEL_CLASS[issue.level])}>
            <Icon className="mt-0.5 size-3.5 flex-none" aria-hidden />
            <span className="min-w-0">{text(issue)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One short coloured line with the tone's icon, for a note that is not an export issue. */
export function NoteLine({ tone, children }: { tone: 'warning' | 'error'; children: ReactNode }) {
  const Icon = TONE_ICONS[tone];
  return (
    <p className={cn('m-0 flex items-start gap-1.5 text-meta', LEVEL_CLASS[tone])}>
      <Icon className="mt-0.5 size-3.5 flex-none" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** The issue a collapsed row shows: the first error, else the first warning. */
export function useWorstIssue(issues: readonly Issue[]): FeatureIssue | undefined {
  const text = useIssueText();
  const worst = issues.find((issue) => issue.level === 'error') ?? issues.find((issue) => issue.level === 'warning');
  return worst && { tone: worst.level === 'error' ? 'error' : 'warning', message: text(worst) };
}

/** The error and warning texts of a field row (each joined into one line), for `FieldRow`'s `error` and `warning`. */
export function useFieldMessages(issues: readonly Issue[]): { error?: string; warning?: string } {
  const text = useIssueText();
  const join = (level: Issue['level']) =>
    issues
      .filter((issue) => issue.level === level)
      .map(text)
      .join(' ') || undefined;
  return { error: join('error'), warning: join('warning') };
}
