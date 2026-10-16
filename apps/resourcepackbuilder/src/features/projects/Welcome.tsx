import { FolderSync, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { SectionCard } from '@resourcepackbuilder/ui';
import { BrandMark } from '../../components/BrandMark';
import { useProjectActions } from './useProjectActions';
import { NewProjectForm } from './NewProjectForm';
import { ProjectList } from './ProjectList';

const STEPS = ['folders', 'model', 'properties', 'export'] as const;

/** Start screen while no project is open: create one, open a saved one, and how it works. */
export function Welcome() {
  const t = useTranslations('layout.welcome');
  const actions = useProjectActions();
  return (
    <div className="@container min-h-0 min-w-0 overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-8 @3xl:py-12">
        <header className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandMark size="lg" />
          <h1 className="font-heading text-4xl font-bold tracking-tight break-words @3xl:text-6xl">ResourcepackBuilder</h1>
          <p className="max-w-2xl text-base text-muted-foreground @3xl:text-lg">{t('tagline')}</p>
        </header>
        <div className="grid gap-4 @3xl:grid-cols-[1.1fr_1fr]">
          <SectionCard title={t('newProject')}>
            <NewProjectForm />
          </SectionCard>
          <SectionCard
            title={t('savedProjects')}
            actions={
              <>
                {actions.isShareAvailable && (
                  <Button variant="outline" size="sm" onClick={() => void actions.openShared()}>
                    <FolderSync /> {t('openShared')}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => void actions.openFile()}>
                  <Upload /> {t('openFile')}
                </Button>
              </>
            }
          >
            <ProjectList />
          </SectionCard>
        </div>
        <ol className="mt-8 grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step} className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              <span className="mb-2 inline-grid size-6 place-items-center rounded-sm border border-primary bg-primary/10 font-heading text-xs font-bold text-primary">
                {i + 1}
              </span>
              <b className="mb-1 block font-heading text-sm font-semibold tracking-wider text-foreground uppercase">
                {t(`steps.${step}.title`)}
              </b>
              {t(`steps.${step}.text`)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
