/**
 * The dialogs of a Nexo project, one file each in plugins/Nexo/dialogs. With a dialog selected (in the Media panel or
 * the overview) the page edits it; otherwise it is the overview with the dialogs' table. Unlike the other media pages
 * it has no drop zone; a new dialog starts as a notice with one button.
 */
import { useEffect } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { mediaDocsFor } from '@resourcepackbuilder/core/targets';
import { packTargetFor } from '@resourcepackbuilder/export';
import { DocsLink, Page, PageHeader, Section, StatusPill } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addDialog } from '../../commands/media';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { selectEntry, useSelectedEntry } from '../../store/ui';
import { mediaEntries } from '../media/mediaKinds';
import { EntryTable, FilePath, PageHint } from '../media/RegistryPageParts';
import { DialogPage } from './DialogPage';
import { NexoFieldContext } from './NexoFieldContext';

/** The overview: header with "Add dialog", hint and the dialogs. */
function DialogsOverview() {
  const t = useTranslations('media.dialogs');
  const tRegistry = useTranslations('media.registry');
  const project = useOpenProject();
  const plan = usePlan();
  const { layout } = packTargetFor(project);
  const entries = mediaEntries('dialog', project, plan);
  return (
    <Page
      header={
        <PageHeader
          thumb={<MessageSquare />}
          title={t('title')}
          meta={
            <>
              <StatusPill tone="muted" label={t('count', { count: entries.length })} />
              <FilePath path={`${layout.pluginDir}/${layout.mediaFile(project, 'dialog') ?? ''}`} />
            </>
          }
          actions={
            <>
              <Button
                data-testid="add-dialog"
                onClick={() => {
                  const id = addDialog(t('defaultId'));
                  if (id) selectEntry('dialogs', id);
                }}
              >
                <Plus /> {t('add')}
              </Button>
              <DocsLink url={mediaDocsFor(project.target, 'dialog')} target={project.target} label={t('title')} />
            </>
          }
        />
      }
    >
      <PageHint>{t('hint')}</PageHint>
      <Section id="entries" title={tRegistry('entries')} meta={<StatusPill tone="muted" label={String(entries.length)} />}>
        <EntryTable view="dialogs" group={{ id: 'dialogs', entries }} />
      </Section>
    </Page>
  );
}

export function DialogsView() {
  const project = useOpenProject();
  const plan = usePlan();
  const selected = useSelectedEntry('dialogs');
  const dialog = selected === undefined ? undefined : project.dialogs.find((candidate) => candidate.id === selected);
  const isGone = selected !== undefined && !dialog;
  // A gone dialog (deleted, undone) leaves the selection on the overview
  useEffect(() => {
    if (isGone) selectEntry('dialogs');
  }, [isGone]);
  return <NexoFieldContext>{dialog ? <DialogPage key={dialog.id} dialog={dialog} plan={plan} /> : <DialogsOverview />}</NexoFieldContext>;
}
