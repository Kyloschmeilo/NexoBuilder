import { useDeferredValue, useId, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileArchive, FolderTree, Package, ScrollText } from 'lucide-react';
import { countIssues } from '@resourcepackbuilder/utils';
import type { ExportMode } from '@resourcepackbuilder/core/export/types';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { MEDIA_KIND_LIST, mediaList } from '@resourcepackbuilder/core/project/media/kinds';
import {
  planMultiExport,
  SELECT_ALL,
  selectNothing,
  type ExportEntry,
  type ExportSelection,
  type MultiExportPlan,
} from '@resourcepackbuilder/core/export/selection';
import { listMultiExportPaths } from '@resourcepackbuilder/core/export/zip';
import { getMcVersion } from '@resourcepackbuilder/minecraft';
import { SectionLabel } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { createDialogHandle } from '@resourcepackbuilder/ui/components/dialog';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@resourcepackbuilder/ui/components/radio-group';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { DialogFrame, FeatureDialog } from '../../components/DialogFrame';
import { useBusyAction } from '../../hooks/useBusyAction';
import { isOneOf } from '../../lib/isOneOf';
import { SelectionHeader } from '../../components/selection/SelectionTree';
import { richTags } from '../../i18n/richTags';
import { confirm } from '../../store/dialogs';
import { getProject, useOpenProject } from '../../store/project';
import { ExportChecks } from './ExportChecks';
import { ExportOptions } from './ExportOptions';
import { ProjectPicker } from './ProjectPicker';
import { useProjectChoices, type ProjectChoice } from './useProjectChoices';
import { useRunExport } from './useRunExport';

const MODES: Array<{ id: ExportMode; icon: ReactNode }> = [
  { id: 'full', icon: <FolderTree /> },
  { id: 'pack', icon: <Package /> },
  { id: 'items', icon: <ScrollText /> },
];
const MODE_IDS = MODES.map((m) => m.id);

/** The checked, loaded projects with their selection; `openProject` stands in for the open one. */
function exportEntries(
  choices: ProjectChoice[],
  includedIds: ReadonlySet<string>,
  selections: Record<string, ExportSelection>,
  openProject: Project,
): ExportEntry[] {
  return choices
    .filter((c) => includedIds.has(c.summary.id))
    .map((c) => (c.isOpen ? openProject : c.project))
    .filter((p): p is Project => p !== null)
    .map((p) => ({ project: p, selection: selections[p.id] }));
}

function isNothingExported({ plan, project }: MultiExportPlan['projects'][number]): boolean {
  return plan.items.length === 0 && MEDIA_KIND_LIST.every((kind) => mediaList(project, kind).length === 0);
}

function ModePicker({ mode, onChange }: { mode: ExportMode; onChange: (mode: ExportMode) => void }) {
  const t = useTranslations('dialogs.export.modes');
  const id = useId();
  return (
    <RadioGroup
      value={mode}
      onValueChange={(value) => {
        if (isOneOf(MODE_IDS, value)) onChange(value);
      }}
      className="grid gap-2 @2xl/dialog:grid-cols-3"
    >
      {MODES.map((m) => (
        <FieldLabel key={m.id} htmlFor={`${id}-${m.id}`}>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle className="[&_svg]:size-4 [&_svg]:text-primary">
                {m.icon}
                {t(`${m.id}.title`)}
              </FieldTitle>
              <FieldDescription className="text-xs">{t(`${m.id}.description`)}</FieldDescription>
            </FieldContent>
            <RadioGroupItem id={`${id}-${m.id}`} value={m.id} />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  );
}

/** Footer summary: what is exported, and from where. */
function ExportSummary({ multi }: { multi: MultiExportPlan }) {
  const t = useTranslations('dialogs.export.summary');
  const itemCount = multi.projects.reduce((n, p) => n + p.plan.items.length, 0);
  const glyphCount = multi.projects.reduce((n, p) => n + p.project.glyphs.length, 0);
  const [single] = multi.projects.length === 1 ? multi.projects : [];
  const parts: ReactNode[] = [t.rich('items', { ...richTags, count: itemCount })];
  if (glyphCount > 0) parts.push(t.rich('glyphs', { ...richTags, count: glyphCount }));
  if (single) {
    parts.push(t.rich('namespace', { ...richTags, namespace: single.project.namespace }));
    parts.push(t('minecraft', { version: getMcVersion(single.project.settings.minecraftVersion).label }));
  }
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {part}
        </span>
      ))}
      {multi.projects.length > 1 && <> {t.rich('fromProjects', { ...richTags, count: multi.projects.length })}</>}
    </>
  );
}

function ExportContents({ paths }: { paths: string[] }) {
  const t = useTranslations('dialogs.export');
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionLabel>{t.rich('contents', { ...richTags, count: paths.length })}</SectionLabel>
      <div className="max-h-80 overflow-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-5 whitespace-nowrap text-muted-foreground">
        {paths.length === 0 ? <p>{t('nothingSelected')}</p> : paths.map((path) => <div key={path}>{path}</div>)}
      </div>
    </section>
  );
}

/** Opens the export of the open project (and, optionally, other saved projects). */
export const exportDialog = createDialogHandle<void>();

/** What the export dialog remembers between openings while the app runs. */
interface ExportChoices {
  /** Saved projects (besides the open one) checked for export */
  otherProjectIds: string[];
  /** Selection per project id; a project without one is exported completely */
  selections: Record<string, ExportSelection>;
}

interface ExportFrameProps {
  choices: ExportChoices;
  onChoicesChange: Dispatch<SetStateAction<ExportChoices>>;
}

function ExportFrame({ choices: { otherProjectIds, selections }, onChoicesChange }: ExportFrameProps) {
  const t = useTranslations('dialogs.export');
  const tSelection = useTranslations('dialogs.selection');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const deferredProject = useDeferredValue(project);
  const runExport = useRunExport();
  const [mode, setMode] = useState<ExportMode>('full');
  const { isBusy: isExporting, run } = useBusyAction();
  // The open project starts checked; the other projects and all selections are remembered from last time
  const [isOpenProjectIncluded, setIsOpenProjectIncluded] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(project.id);

  const setOtherProjectIncluded = (projectId: string, isIncluded: boolean) =>
    onChoicesChange((c) => {
      const others = c.otherProjectIds.filter((id) => id !== projectId);
      return { ...c, otherProjectIds: isIncluded ? [...others, projectId] : others };
    });
  const setExportSelection = (projectId: string, selection: ExportSelection) =>
    onChoicesChange((c) => ({ ...c, selections: { ...c.selections, [projectId]: selection } }));

  const includedIds = useMemo(
    () => new Set([...(isOpenProjectIncluded ? [project.id] : []), ...otherProjectIds.filter((id) => id !== project.id)]),
    [isOpenProjectIncluded, otherProjectIds, project.id],
  );
  const { choices, isLoading } = useProjectChoices(deferredProject, includedIds, (id) => setOtherProjectIncluded(id, false));
  const multi = useMemo(
    () => planMultiExport(exportEntries(choices, includedIds, selections, deferredProject), { includeBinaries: false }),
    [choices, includedIds, selections, deferredProject],
  );
  const paths = useMemo(() => listMultiExportPaths(multi, mode), [multi, mode]);
  const hasSeveralProjects = multi.projects.length > 1;
  const isEmpty = multi.projects.every(isNothingExported);
  const expandedProject = choices.find((c) => c.summary.id === expandedId && includedIds.has(c.summary.id))?.project ?? null;

  const setIncluded = (projectId: string, isIncluded: boolean) => {
    if (projectId === project.id) setIsOpenProjectIncluded(isIncluded);
    else setOtherProjectIncluded(projectId, isIncluded);
    if (isIncluded) setExpandedId(projectId);
  };

  const confirmAndExport = async () => {
    const errorCount = countIssues(multi.issues).error;
    if (errorCount > 0) {
      const confirmed = await confirm({
        title: t('confirmErrors.title'),
        message: t('confirmErrors.message', { count: errorCount }),
        confirmLabel: t('confirmErrors.confirm'),
        destructive: true,
      });
      if (!confirmed) return;
    }
    const isDone = await run(() => runExport(exportEntries(choices, includedIds, selections, getProject() ?? project), mode));
    if (isDone) exportDialog.close();
  };

  return (
    <DialogFrame
      title={t('title')}
      icon={<FileArchive />}
      size="wide"
      footerStart={<ExportSummary multi={multi} />}
      footer={
        <>
          <Button variant="outline" onClick={() => exportDialog.close()}>
            {tCommon('cancel')}
          </Button>
          <Button disabled={isExporting || isLoading || isEmpty} onClick={() => void confirmAndExport()}>
            {isExporting ? <Spinner /> : <Download />} {isExporting ? t('busy') : t('download')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ModePicker mode={mode} onChange={setMode} />

        <div className="grid items-start gap-5 @3xl/dialog:grid-cols-2">
          <section className="flex min-w-0 flex-col gap-2">
            <SelectionHeader
              title={tSelection('title')}
              disabled={!expandedProject}
              onAll={() => expandedProject && setExportSelection(expandedProject.id, SELECT_ALL)}
              onNone={() => expandedProject && setExportSelection(expandedProject.id, selectNothing(expandedProject))}
            />
            <ProjectPicker
              choices={choices}
              includedIds={includedIds}
              selections={selections}
              expandedId={expandedId}
              onIncludedChange={setIncluded}
              onExpand={setExpandedId}
              onSelectionChange={setExportSelection}
            />
            {hasSeveralProjects && <p className="text-xs text-muted-foreground">{t('severalProjects')}</p>}
          </section>
          <ExportContents paths={paths} />
        </div>

        <ExportOptions mode={mode} hasSeveralProjects={hasSeveralProjects} />
        <ExportChecks issues={multi.issues} openProjectId={project.id} />

        {mode === 'full' && (
          <Alert variant="info">
            <AlertDescription className="text-xs">{t.rich('install', richTags)}</AlertDescription>
          </Alert>
        )}
      </div>
    </DialogFrame>
  );
}

export function ExportDialog() {
  // The open project starts checked each time; the other projects and all selections are remembered
  const [choices, setChoices] = useState<ExportChoices>({ otherProjectIds: [], selections: {} });
  return <FeatureDialog handle={exportDialog}>{() => <ExportFrame choices={choices} onChoicesChange={setChoices} />}</FeatureDialog>;
}
