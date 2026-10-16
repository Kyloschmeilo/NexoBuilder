import { useTranslations } from 'next-intl';
import { countIssues, type Issue } from '@resourcepackbuilder/utils';
import { StatusBadge } from '@resourcepackbuilder/ui';

interface IssueCountBadgesProps {
  issues: Issue[];
  /** Label of a success badge shown when there are neither errors nor warnings; nothing is shown without it. */
  okLabel?: string;
}

/** Error and warning counts of `issues` as badges (hints are not counted). */
export function IssueCountBadges({ issues, okLabel }: IssueCountBadgesProps) {
  const t = useTranslations('dialogs.issues');
  const counts = countIssues(issues);
  return (
    <>
      {counts.error > 0 && <StatusBadge tone="error">{t('errors', { count: counts.error })}</StatusBadge>}
      {counts.warning > 0 && <StatusBadge tone="warning">{t('warnings', { count: counts.warning })}</StatusBadge>}
      {okLabel && counts.error === 0 && counts.warning === 0 && <StatusBadge tone="success">{okLabel}</StatusBadge>}
    </>
  );
}
