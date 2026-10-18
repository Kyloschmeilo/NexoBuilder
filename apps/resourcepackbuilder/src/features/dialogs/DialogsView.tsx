/**
 * The dialogs of a Nexo project: one card per dialog file in plugins/Nexo/dialogs. Unlike the other media pages it
 * has no drop zone; a new dialog starts as a notice with one button.
 */
import { MessageSquare, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { mediaDocsFor } from '@resourcepackbuilder/core/targets';
import { packTargetFor } from '@resourcepackbuilder/export';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addDialog } from '../../commands/media';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { DocsLinkButton } from '../media/DocsLinkButton';
import { MediaPage } from '../media/MediaPage';
import { DialogCard } from './DialogCard';
import { NexoFieldContext } from './NexoFieldContext';

export function DialogsView() {
  const t = useTranslations('media.dialogs');
  const tShared = useTranslations('media.shared');
  const project = useOpenProject();
  const plan = usePlan();
  const { layout } = packTargetFor(project);

  return (
    <NexoFieldContext>
      <MediaPage
        icon={<MessageSquare className="size-7" />}
        title={t('title')}
        count={t('count', { count: project.dialogs.length })}
        configPath={`${layout.pluginDir}/${layout.mediaFile(project, 'dialog') ?? ''}`}
        actions={
          <>
            <Button data-testid="add-dialog" onClick={() => addDialog(t('defaultId'))}>
              <Plus /> {t('add')}
            </Button>
            <DocsLinkButton href={mediaDocsFor(project.target, 'dialog')} label={tShared('docs', { target: project.target })} />
          </>
        }
        hint={t('hint')}
      >
        {project.dialogs.map((dialog) => (
          <DialogCard key={dialog.id} dialog={dialog} plan={plan} />
        ))}
      </MediaPage>
    </NexoFieldContext>
  );
}
