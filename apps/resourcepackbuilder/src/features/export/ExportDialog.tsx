import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Download, FileArchive, FolderTree, Package, ScrollText } from 'lucide-react';
import { countIssues } from '@resourcepackbuilder/core/issues';
import type { ExportMode } from '@resourcepackbuilder/core/export/types';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { planMultiExport, SELECT_ALL, type ExportEntry, type ExportSelection } from '@resourcepackbuilder/core/export/selection';
import { buildMultiExportZip, listMultiExportPaths } from '@resourcepackbuilder/core/export/zip';
import { getMcVersion } from '@resourcepackbuilder/core/minecraft/versions';
import { SectionLabel, downloadBytes } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@resourcepackbuilder/ui/components/collapsible';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@resourcepackbuilder/ui/components/radio-group';
import { updateProjectSettings } from '../../commands/settings';
import { DialogFrame } from '../../components/DialogFrame';
import { IssueList } from '../../components/IssueList';
import { useErrorMessage } from '../../i18n/errors';
import { richTags } from '../../i18n/richTags';
import { useServices } from '../../services/servicesContext';
import type { ProjectSummary } from '../../services/projectRepository';
import { closeDialog, confirm } from '../../store/dialogs';
import { toast } from '../../store/notifications';
import { getProject, useOpenProject } from '../../store/project';
import { selectTarget } from '../../store/ui';
import { ProjectPicker, type ProjectChoice } from './ExportSelection';

const MODES: Array<{ id: ExportMode; icon: ReactNode }> = [
  { id: 'full', icon: <FolderTree /> },
  { id: 'pack', icon: <Package /> },
  { id: 'items', icon: <ScrollText /> },
];

/** Last chosen selection – kept as long as ResourcepackBuilder is open */
const remembered: { included: string[] | null; selections: Record<string, ExportSelection> } = { included: null, selections: {} };

/** The checked projects with their selection; `current` stands in for the open project. */
function exportEntries(
  choices: ProjectChoice[],
  included: Set<string>,
  selections: Record<string, ExportSelection>,
  current: Project,
): ExportEntry[] {
  return choices
    .filter((c) => included.has(c.summary.id))
    .map((c) => (c.current ? current : c.project))
    .filter((p): p is Project => p !== null)
    .map((p) => ({ project: p, selection: selections[p.id] }));
}

/** Returns the function that builds the ZIP and starts the download (resolves with whether it worked). */
function useRunExport() {
  const t = useTranslations('dialogs.export');
  const errorMessage = useErrorMessage();
  return async (entries: ExportEntry[], mode: ExportMode): Promise<boolean> => {
    if (entries.length === 0) return false;
    try {
      const multi = planMultiExport(entries, { includeBinaries: true });
      const result = await buildMultiExportZip(multi, mode);
      downloadBytes(result.data, result.fileName, 'application/zip');
      toast('success', t('created', { file: result.fileName, count: result.paths.length }));
      return true;
    } catch (err) {
      console.error(err);
      toast('error', t('failed', { error: errorMessage(err) }));
      return false;
    }
  };
}

export function ExportDialog() {
  const t = useTranslations('dialogs.export');
  const tSelection = useTranslations('dialogs.selection');
  const tIssues = useTranslations('dialogs.issues');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const { repository } = useServices();
  const runExport = useRunExport();
  const close = closeDialog;
  const deferredProject = useDeferredValue(project);
  const [mode, setMode] = useState<ExportMode>('full');
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Saved projects (the open one is always at the top)
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [loaded, setLoaded] = useState<Record<string, Project>>({});
  // The open project is always checked on open, others are remembered from before
  const [included, setIncluded] = useState<Set<string>>(() => new Set([project.id, ...(remembered.included ?? [])]));
  const [selections, setSelections] = useState<Record<string, ExportSelection>>(() => ({ ...remembered.selections }));
  const [expanded, setExpanded] = useState<string | null>(project.id);

  useEffect(() => {
    void repository.list().then((list) => setSummaries(list.filter((p) => p.id !== project.id)));
  }, [project.id, repository]);

  // Only load other projects once they are checked
  useEffect(() => {
    for (const id of included) {
      if (id === project.id || loaded[id]) continue;
      if (summaries.length > 0 && !summaries.some((s) => s.id === id)) continue;
      void repository.load(id).then((p) => {
        if (p) setLoaded((prev) => ({ ...prev, [id]: p }));
        else setIncluded((prev) => new Set([...prev].filter((x) => x !== id)));
      });
    }
  }, [included, loaded, project.id, summaries, repository]);

  useEffect(() => {
    remembered.included = [...included];
    remembered.selections = selections;
  }, [included, selections]);

  const choices: ProjectChoice[] = useMemo(
    () => [
      {
        summary: {
          id: project.id,
          name: project.name,
          namespace: project.namespace,
          itemCount: Object.keys(project.items).length,
          updatedAt: project.updatedAt,
        },
        project,
        current: true,
      },
      ...summaries.map((summary) => ({ summary, project: loaded[summary.id] ?? null, current: false })),
    ],
    [project, summaries, loaded],
  );

  const entriesFor = (current: Project) => exportEntries(choices, included, selections, current);

  const loading = choices.some((c) => included.has(c.summary.id) && !c.project);
  const multi = useMemo(
    () => planMultiExport(exportEntries(choices, included, selections, deferredProject), { includeBinaries: false }),
    [deferredProject, choices, included, selections],
  );

  const counts = countIssues(multi.issues);
  const paths = useMemo(() => listMultiExportPaths(multi, mode), [multi, mode]);
  const itemCount = multi.projects.reduce((n, p) => n + p.plan.items.length, 0);
  const glyphCount = multi.projects.reduce((n, p) => n + (p.project.glyphs?.length ?? 0), 0);
  const mediaCount = multi.projects.reduce((n, p) => n + (p.project.sounds?.length ?? 0) + (p.project.paintings?.length ?? 0), 0);
  const several = multi.projects.length > 1;
  const empty = itemCount + glyphCount + mediaCount === 0;

  const confirmAndExport = async () => {
    if (counts.error > 0) {
      const confirmed = await confirm({
        title: t('confirmErrors.title'),
        message: t('confirmErrors.message', { count: counts.error }),
        confirmLabel: t('confirmErrors.confirm'),
        destructive: true,
      });
      if (!confirmed) return;
    }
    setBusy(true);
    const ok = await runExport(entriesFor(getProject() ?? project), mode);
    setBusy(false);
    if (ok) close();
  };

  const toggleProject = (id: string, include: boolean) => {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (include) next.add(id);
      else next.delete(id);
      return next;
    });
    if (include) setExpanded(id);
  };

  const first = multi.projects[0];
  const summaryParts: ReactNode[] = [t.rich('summary.items', { ...richTags, count: itemCount })];
  if (glyphCount > 0) summaryParts.push(t.rich('summary.glyphs', { ...richTags, count: glyphCount }));
  const footerStart = (
    <>
      {summaryParts.map((part, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {part}
        </span>
      ))}
      {several ? (
        <> {t.rich('summary.fromProjects', { ...richTags, count: multi.projects.length })}</>
      ) : (
        first && (
          <>
            {' · '}
            {t.rich('summary.namespace', { ...richTags, namespace: first.project.namespace })}
            {' · '}
            {t('summary.minecraft', { version: getMcVersion(first.project.settings.minecraftVersion).label })}
          </>
        )
      )}
    </>
  );

  const selectionDisabled = !expanded || !included.has(expanded);

  return (
    <DialogFrame
      title={t('title')}
      icon={<FileArchive />}
      size="wide"
      footerStart={footerStart}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {tCommon('cancel')}
          </Button>
          <Button disabled={busy || loading || empty} onClick={() => void confirmAndExport()}>
            <Download /> {busy ? t('busy') : t('download')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <RadioGroup
          value={mode}
          onValueChange={(value) => setMode(MODES.find((m) => m.id === value)?.id ?? 'full')}
          className="grid gap-2 sm:grid-cols-3"
        >
          {MODES.map((m) => (
            <FieldLabel key={m.id} htmlFor={`export-mode-${m.id}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle className="[&_svg]:size-4 [&_svg]:text-primary">
                    {m.icon}
                    {t(`modes.${m.id}.title`)}
                  </FieldTitle>
                  <FieldDescription className="text-xs">{t(`modes.${m.id}.description`)}</FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`export-mode-${m.id}`} value={m.id} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>

        <div className="grid items-start gap-5 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <SectionLabel
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelections((prev) => ({ ...prev, [expanded ?? project.id]: SELECT_ALL }))}
                    disabled={selectionDisabled}
                  >
                    {tSelection('all')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={selectionDisabled}
                    onClick={() => {
                      const target = choices.find((c) => c.summary.id === expanded)?.project;
                      if (!target) return;
                      setSelections((prev) => ({
                        ...prev,
                        [target.id]: {
                          excludedItemIds: Object.keys(target.items),
                          excludedGlyphIds: (target.glyphs ?? []).map((g) => g.id),
                          excludedSoundIds: (target.sounds ?? []).map((g) => g.id),
                          excludedPaintingIds: (target.paintings ?? []).map((g) => g.id),
                        },
                      }));
                    }}
                  >
                    {tSelection('none')}
                  </Button>
                </>
              }
            >
              {tSelection('title')}
            </SectionLabel>
            <ProjectPicker
              choices={choices}
              included={included}
              selections={selections}
              expanded={expanded}
              onToggleProject={toggleProject}
              onExpand={setExpanded}
              onSelectionChange={(id, next) => setSelections((prev) => ({ ...prev, [id]: next }))}
            />
            {several && <p className="m-0 text-xs text-muted-foreground">{t('severalProjects')}</p>}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <SectionLabel>{t.rich('contents', { ...richTags, count: paths.length })}</SectionLabel>
            <div className="max-h-80 overflow-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-5 whitespace-nowrap text-muted-foreground">
              {paths.map((p) => (
                <div key={p}>{p}</div>
              ))}
              {paths.length === 0 && <div>{t('nothingSelected')}</div>}
            </div>
          </div>
        </div>

        <Collapsible className="rounded-md border border-border">
          <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted">
            <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90" />
            {t('options', { name: project.name })}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
              <Field orientation="horizontal" data-disabled={mode !== 'full'}>
                <Checkbox
                  id="export-external-zip"
                  checked={project.settings.externalPackAsZip}
                  disabled={mode !== 'full'}
                  onCheckedChange={(checked) => updateProjectSettings((p) => (p.settings.externalPackAsZip = checked))}
                />
                <FieldContent>
                  <FieldLabel htmlFor="export-external-zip">{t('externalPackAsZip')}</FieldLabel>
                  <FieldDescription className="text-xs">
                    {t('externalPackAsZipHelp', { packName: project.settings.packName })}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal" data-disabled={mode === 'pack' || several}>
                <Checkbox
                  id="export-items-folder"
                  checked={project.settings.itemsInProjectFolder || several}
                  disabled={mode === 'pack' || several}
                  onCheckedChange={(checked) => updateProjectSettings((p) => (p.settings.itemsInProjectFolder = checked))}
                />
                <FieldContent>
                  <FieldLabel htmlFor="export-items-folder">{t('itemsInProjectFolder')}</FieldLabel>
                  <FieldDescription className="text-xs">
                    {several
                      ? t('itemsInProjectFolderSeveral')
                      : t('itemsInProjectFolderHelp', { project: `<${t('projectPlaceholder')}>` })}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field className="max-w-md" data-disabled={mode === 'pack'}>
                <FieldLabel htmlFor="export-yaml-mode">{t('yamlFiles')}</FieldLabel>
                <NativeSelect
                  id="export-yaml-mode"
                  className="w-full"
                  value={project.settings.yamlFileMode}
                  disabled={mode === 'pack'}
                  onChange={(e) => updateProjectSettings((p) => (p.settings.yamlFileMode = e.target.value as 'folder' | 'item'))}
                >
                  <NativeSelectOption value="folder">{t('yamlPerFolder')}</NativeSelectOption>
                  <NativeSelectOption value="item">{t('yamlPerItem')}</NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SectionLabel>{t('check')}</SectionLabel>
            {counts.error > 0 && <Badge variant="destructive">{tIssues('errors', { count: counts.error })}</Badge>}
            {counts.warning > 0 && <Badge className="bg-warning/15 text-warning">{tIssues('warnings', { count: counts.warning })}</Badge>}
            {counts.error === 0 && counts.warning === 0 && <Badge className="bg-success/15 text-success">{tIssues('allGood')}</Badge>}
            <span className="flex-1" />
            {counts.info > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={showInfo} onCheckedChange={setShowInfo} />
                {tIssues('showInfo', { count: counts.info })}
              </label>
            )}
          </div>
          <IssueList
            issues={multi.issues}
            hideInfo={!showInfo}
            empty={t('noIssues')}
            canOpen={(issue) => !issue.projectId || issue.projectId === project.id}
            onOpen={(target) => {
              close();
              selectTarget(target);
            }}
          />
        </div>

        {mode === 'full' && (
          <Alert>
            <AlertDescription className="text-xs">{t.rich('install', richTags)}</AlertDescription>
          </Alert>
        )}
      </div>
    </DialogFrame>
  );
}
