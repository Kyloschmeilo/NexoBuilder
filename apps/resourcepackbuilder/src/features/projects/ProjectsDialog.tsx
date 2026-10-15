import { useState } from 'react';
import { FolderOpen, FolderSync, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { DialogFrame } from '../../components/DialogFrame';
import { closeDialog, type FeatureDialogProps } from '../../store/dialogs';
import { useProjectActions } from './useProjectActions';
import { NewProjectForm } from './NewProjectForm';
import { ProjectList } from './ProjectList';

type ProjectsTab = FeatureDialogProps['projects']['tab'];

/** Switch to a saved, file or shared project, or create a new one. */
export function ProjectsDialog({ tab: initialTab }: FeatureDialogProps['projects']) {
  const t = useTranslations('layout');
  const actions = useProjectActions();
  const [tab, setTab] = useState<ProjectsTab>(initialTab);
  return (
    <DialogFrame title={t('projectsDialog.title')} icon={<FolderOpen />}>
      <Tabs value={tab} onValueChange={(value) => setTab(value === 'new' ? 'new' : 'open')}>
        <TabsList variant="line">
          <TabsTrigger value="open">{t('projectsDialog.openTab')}</TabsTrigger>
          <TabsTrigger value="new">{t('projectsDialog.newTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="flex flex-col gap-3 pt-2">
          <div className="max-h-90 overflow-auto">
            <ProjectList onOpened={closeDialog} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await actions.openFile();
                closeDialog();
              }}
            >
              <Upload /> {t('welcome.openFile')}
            </Button>
            {actions.isShareAvailable && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (await actions.openShared()) closeDialog();
                }}
              >
                <FolderSync /> {t('welcome.openShared')}
              </Button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="new" className="pt-2">
          <NewProjectForm onDone={closeDialog} />
        </TabsContent>
      </Tabs>
    </DialogFrame>
  );
}
