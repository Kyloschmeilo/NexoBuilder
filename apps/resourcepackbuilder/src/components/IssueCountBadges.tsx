/** The error and warning counts of a list of issues as status pills. */
import { useTranslations } from 'next-intl';
import { countIssues, type Issue } from '@resourcepackbuilder/utils';
import { StatusPill } from '@resourcepackbuilder/ui';

interface IssueCountBadgesProps {
  issues: Issue[];
  /** Label of an "ok" pill shown when there are neither errors nor warnings; nothing is shown without it. */
  okLabel?: string;
}

/** Error and warning counts of `issues` as outlined status pills (hints are not counted). */
export function IssueCountBadges({ issues, okLabel }: IssueCountBadgesProps) {
  const t = useTranslations('dialogs.issues');
  const counts = countIssues(issues);
  return (
    <>
      {counts.error > 0 && <StatusPill tone="error" dot label={t('errors', { count: counts.error })} />}
      {counts.warning > 0 && <StatusPill tone="warning" dot label={t('warnings', { count: counts.warning })} />}
      {okLabel && counts.error === 0 && counts.warning === 0 && <StatusPill tone="ok" dot label={okLabel} />}
    </>
  );
}
