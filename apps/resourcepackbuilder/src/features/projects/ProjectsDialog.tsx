import { useState } from 'react';
import { FolderOpen, FolderSync, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@resourcepackbuilder/ui/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { closeDialog, type FeatureDialogProps } from '../../store/dialogs';
import { useProjectActions } from './useProjectActions';
import { NewProjectForm } from './NewProjectForm';
import { ProjectList } from './ProjectList';

export function ProjectsDialog({ tab: initialTab }: FeatureDialogProps['projects']) {
  const t = useTranslations('layout');
  const close = closeDialog;
  const actions = useProjectActions();
  const [tab, setTab] = useState<'open' | 'new'>(initialTab);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <FolderOpen className="size-5" /> {t('projectsDialog.title')}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value === 'new' ? 'new' : 'open')}>
          <TabsList variant="line">
            <TabsTrigger value="open">{t('projectsDialog.openTab')}</TabsTrigger>
            <TabsTrigger value="new">{t('projectsDialog.newTab')}</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="flex flex-col gap-3 pt-2">
            <div className="max-h-[360px] overflow-auto">
              <ProjectList onOpened={close} />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await actions.openFile();
                  close();
                }}
              >
                <Upload /> {t('welcome.openFile')}
              </Button>
              {actions.isShareAvailable && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (await actions.openShared()) close();
                  }}
                >
                  <FolderSync /> {t('welcome.openShared')}
                </Button>
              )}
            </div>
          </TabsContent>
          <TabsContent value="new" className="pt-2">
            <NewProjectForm onDone={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
