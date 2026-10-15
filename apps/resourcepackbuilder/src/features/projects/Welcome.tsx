import { FolderSync, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { useProjectActions } from './useProjectActions';
import { NewProjectForm } from './NewProjectForm';
import { ProjectList } from './ProjectList';

const STEPS = ['folders', 'model', 'properties', 'export'] as const;

export function Welcome() {
  const t = useTranslations('layout.welcome');
  const actions = useProjectActions();
  return (
    <div className="min-h-0 min-w-0 overflow-auto">
      <div className="mx-auto max-w-[960px] px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-sm bg-primary font-heading text-[32px] leading-none font-bold text-primary-foreground">
            N
          </div>
          <h1 className="mt-4 mb-2 font-heading text-[56px] leading-[60px] font-bold tracking-[0.01em]">ResourcepackBuilder</h1>
          <p className="mx-auto max-w-[620px] text-lg leading-7 text-muted-foreground">{t('tagline')}</p>
        </div>
        <div className="grid grid-cols-[1.1fr_1fr] gap-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-heading">{t('newProject')}</CardTitle>
            </CardHeader>
            <CardContent>
              <NewProjectForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-heading">{t('savedProjects')}</CardTitle>
              <CardAction className="flex gap-1.5">
                {actions.isShareAvailable && (
                  <Button variant="outline" size="sm" onClick={() => void actions.openShared()}>
                    <FolderSync /> {t('openShared')}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => void actions.openFile()}>
                  <Upload /> {t('openFile')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ProjectList />
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 grid grid-cols-4 gap-3">
          {STEPS.map((step, i) => (
            <div key={step} className="rounded-lg border border-border bg-card p-4 text-[13px] leading-5 text-muted-foreground">
              <div className="mb-2 inline-grid size-6 place-items-center rounded-sm border border-primary bg-primary/10 font-heading text-xs font-bold text-primary">
                {i + 1}
              </div>
              <b className="mb-1 block font-heading text-[13px] leading-4 font-semibold tracking-[0.06em] text-foreground uppercase">
                {t(`steps.${step}.title`)}
              </b>
              {t(`steps.${step}.text`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
