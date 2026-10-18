/**
 * The start screen while no project is open: the brand with the appearance menu, a one-line row of the four steps,
 * and two columns, creating a project and opening a saved, shared or file project.
 */
import type { ReactNode } from 'react';
import { FolderSync, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Help, Panel } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { BrandMark } from '../../components/BrandMark';
import { useProjectActions } from './useProjectActions';
import { NewProjectForm } from './NewProjectForm';
import { ProjectList } from './ProjectList';
import { WelcomeAppearance } from './WelcomeAppearance';

const STEPS = ['folders', 'model', 'properties', 'export'] as const;

/** How a project comes together, as numbered step names; the details are in the ⓘ popover at the end of the row. */
function StepsRow() {
  const t = useTranslations('layout.welcome');
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-label text-text-muted">
      <ol aria-label={t('stepsLabel')} className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1.5 p-0">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded-full border border-line font-mono text-micro text-text-muted">
              {i + 1}
            </span>
            {t(`steps.${step}.title`)}
          </li>
        ))}
      </ol>
      <Help label={t('stepsHelp')}>
        <ol className="m-0 flex flex-col gap-2 pl-4">
          {STEPS.map((step) => (
            <li key={step}>
              <b className="font-semibold">{t(`steps.${step}.title`)}</b>
              <br />
              <span className="text-text-muted">{t(`steps.${step}.text`)}</span>
            </li>
          ))}
        </ol>
      </Help>
    </div>
  );
}

/** A column of the welcome screen: a title with actions above a panel. */
function WelcomeColumn({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        <h2 className="m-0 flex-1 text-title font-semibold text-text">{title}</h2>
        {actions}
      </div>
      <Panel className="p-4">{children}</Panel>
    </section>
  );
}

/** Start screen while no project is open: create one, open a saved one, and how it works. */
export function Welcome() {
  const t = useTranslations('layout.welcome');
  const actions = useProjectActions();
  return (
    <div className="@container min-h-0 min-w-0 overflow-auto bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 @3xl:py-10">
        <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <BrandMark size="lg" />
          <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1">
            <h1 className="m-0 text-2xl font-semibold break-words text-text">ResourcepackBuilder</h1>
            <p className="m-0 max-w-2xl text-label text-text-muted">{t('tagline')}</p>
          </div>
          <WelcomeAppearance />
        </header>
        <StepsRow />
        <div className="grid items-start gap-6 @3xl:grid-cols-[1.1fr_1fr]">
          <WelcomeColumn title={t('newProject')}>
            <NewProjectForm />
          </WelcomeColumn>
          <WelcomeColumn
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
          </WelcomeColumn>
        </div>
      </div>
    </div>
  );
}
