import { useState } from 'react';
import { FolderSync, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { createDialogHandle } from '@resourcepackbuilder/ui/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { DialogFrame, FeatureDialog } from '../../components/DialogFrame';
import { useProjectActions } from './useProjectActions';
import { NewProjectForm } from './NewProjectForm';
import { ProjectList } from './ProjectList';

type ProjectsTab = 'open' | 'new';

/** Opens the projects dialog on the given tab; works without an open project. */
export const projectsDialog = createDialogHandle<{ tab: ProjectsTab }>();

function ProjectsFrame({ tab: initialTab }: { tab: ProjectsTab }) {
  const t = useTranslations('layout');
  const actions = useProjectActions();
  const [tab, setTab] = useState<ProjectsTab>(initialTab);
  return (
    <DialogFrame title={t('projectsDialog.title')}>
      <Tabs value={tab} onValueChange={(value) => setTab(value === 'new' ? 'new' : 'open')}>
        <TabsList variant="line">
          <TabsTrigger value="open">{t('projectsDialog.openTab')}</TabsTrigger>
          <TabsTrigger value="new">{t('projectsDialog.newTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="flex flex-col gap-3 pt-2">
          <div className="max-h-90 overflow-auto">
            <ProjectList onOpened={() => projectsDialog.close()} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (await actions.openFile()) projectsDialog.close();
              }}
            >
              <Upload /> {t('welcome.openFile')}
            </Button>
            {actions.isShareAvailable && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (await actions.openShared()) projectsDialog.close();
                }}
              >
                <FolderSync /> {t('welcome.openShared')}
              </Button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="new" className="pt-2">
          <NewProjectForm onDone={() => projectsDialog.close()} />
        </TabsContent>
      </Tabs>
    </DialogFrame>
  );
}

/** Switch to a saved, file or shared project, or create a new one. */
export function ProjectsDialog() {
  return (
    <FeatureDialog handle={projectsDialog} isProjectBound={false}>
      {({ tab }) => <ProjectsFrame tab={tab} />}
    </FeatureDialog>
  );
}
