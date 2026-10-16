/** The checks of everything that is exported, with a jump to the entries of the open project. */
import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { countIssues, type Issue } from '@resourcepackbuilder/core/issues';
import { SectionLabel } from '@resourcepackbuilder/ui';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { IssueCountBadges } from '../../components/IssueCountBadges';
import { IssueList } from '../../components/IssueList';
import { closeDialog } from '../../store/dialogs';
import { selectTarget } from '../../store/ui';

export function ExportChecks({ issues, openProjectId }: { issues: Issue[]; openProjectId: string }) {
  const t = useTranslations('dialogs.export');
  const tIssues = useTranslations('dialogs.issues');
  const showInfoId = useId();
  const [isInfoShown, setIsInfoShown] = useState(false);
  const infoCount = countIssues(issues).info;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SectionLabel>{t('check')}</SectionLabel>
        <IssueCountBadges issues={issues} okLabel={tIssues('allGood')} />
        {infoCount > 0 && (
          <Field orientation="horizontal" className="ml-auto w-auto gap-1.5">
            <Checkbox id={showInfoId} checked={isInfoShown} onCheckedChange={setIsInfoShown} />
            <FieldLabel htmlFor={showInfoId} className="text-xs font-normal text-muted-foreground">
              {tIssues('showInfo', { count: infoCount })}
            </FieldLabel>
          </Field>
        )}
      </div>
      <IssueList
        issues={issues}
        hideInfo={!isInfoShown}
        empty={t('noIssues')}
        canOpen={(issue) => !issue.projectId || issue.projectId === openProjectId}
        onOpen={(target) => {
          closeDialog();
          selectTarget(target);
        }}
      />
    </section>
  );
}
