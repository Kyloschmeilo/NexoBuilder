/**
 * The slim bar above the workbench: the brand, the project menu with the project's target, undo and redo with the
 * save status, the command palette trigger, the checks counter (opens the dock on Checks), sharing, the dock toggle
 * and Export, the only primary button.
 */
import {
  ChevronDown,
  Download,
  FolderOpen,
  FolderSync,
  FilePlus2,
  PanelRight,
  PanelRightClose,
  Redo2,
  Save,
  Search,
  Settings,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { countIssues } from '@resourcepackbuilder/utils';
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { IconButton, MenuEntries, type MenuEntry, StatusDot, Tip, TONE_ICONS, TONE_TEXT_CLASS } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Kbd } from '@resourcepackbuilder/ui/components/kbd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { BrandMark } from '../components/BrandMark';
import { TargetDot } from '../components/TargetDot';
import { exportDialog } from '../features/export/ExportDialog';
import { projectsDialog } from '../features/projects/ProjectsDialog';
import { useProjectActions } from '../features/projects/useProjectActions';
import { shareDialog } from '../features/share/ShareDialog';
import { SHARE_STATUS_TONE, useShareStatusText } from '../features/share/ShareStatusBadge';
import { usePlan } from './PlanProvider';
import { useDockState, useIsDockColumn } from './useDockLayout';
import { redo, undo, useProjectStore } from '../store/project';
import { useSaveStore } from '../services/autosaveStore';
import { isProjectShared, useShareStore } from '../services/shareStore';
import { openSettings, setCommandPaletteOpen, showDock } from '../store/ui';

/** Opens the share dialog; shows the share status while the open project is shared. */
function ShareButton() {
  const t = useTranslations('layout.topBar.share');
  const statusText = useShareStatusText();
  const projectId = useProjectStore((s) => s.project?.id);
  const share = useShareStore();
  const isShared = isProjectShared(share, projectId);
  return (
    <Tip label={isShared ? t('sharedHint', { folder: share.folder ?? '', status: statusText(share.status) }) : t('hint')}>
      <Button variant="ghost" size="sm" data-testid="share-button" onClick={() => shareDialog.open(null)}>
        {isShared ? <StatusDot tone={SHARE_STATUS_TONE[share.status]} /> : <Users />}
        <span className="hidden @4xl/top:inline">{isShared ? t('shared') : t('button')}</span>
      </Button>
    </Tip>
  );
}

const SAVE_STATUS_CLASS = { saving: 'text-muted-foreground', saved: 'text-muted-foreground', error: 'text-destructive' } as const;

/** "Saving…", "Saved" or "Not saved!" next to undo and redo. */
function SaveStatus() {
  const t = useTranslations('layout.topBar.saveStatus');
  const status = useSaveStore((s) => s.status);
  if (status === 'idle') return null;
  return (
    <Tip label={t('hint')}>
      <span className={cn('hidden text-meta whitespace-nowrap @3xl/top:inline', SAVE_STATUS_CLASS[status])}>{t(status)}</span>
    </Tip>
  );
}

/** Issue summary of the open project; opens the output dock on its Checks tab. */
function ChecksButton() {
  const t = useTranslations('layout.topBar.checks');
  const plan = usePlan();
  const isDockColumn = useIsDockColumn();
  if (!plan) return null;
  const counts = countIssues(plan.issues);
  const [tone, label] =
    counts.error > 0
      ? (['error', t('errors', { count: counts.error })] as const)
      : counts.warning > 0
        ? (['warning', t('warnings', { count: counts.warning })] as const)
        : (['success', t('ok')] as const);
  const Icon = TONE_ICONS[tone];
  return (
    <Tip label={t('hint')}>
      <Button variant="ghost" size="sm" aria-label={label} onClick={() => showDock('checks', isDockColumn)}>
        <Icon className={TONE_TEXT_CLASS[tone]} />
        <span className="hidden @3xl/top:inline">{label}</span>
      </Button>
    </Tip>
  );
}

/** Shows or hides the output dock (Ctrl+J). */
function DockToggle() {
  const t = useTranslations('layout.dock');
  const { isVisible, toggle } = useDockState();
  const label = isVisible ? t('hide') : t('show');
  return (
    <IconButton
      label={
        <>
          {label} <Kbd>{t('toggleShortcut')}</Kbd>
        </>
      }
      aria-label={label}
      aria-pressed={isVisible}
      onClick={toggle}
    >
      {isVisible ? <PanelRightClose /> : <PanelRight />}
    </IconButton>
  );
}

/** Opens the command palette (Ctrl+K). */
function CommandPaletteTrigger() {
  const t = useTranslations('layout.commandPalette');
  return (
    <button
      type="button"
      className="flex h-7 w-full max-w-90 min-w-0 items-center gap-2 rounded-(--radius-control) border border-line bg-canvas px-2 text-meta text-muted-foreground outline-none hover:border-line-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => setCommandPaletteOpen(true)}
    >
      <Search className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{t('trigger')}</span>
      <Kbd className="hidden @2xl/top:inline-flex">{t('shortcut')}</Kbd>
    </button>
  );
}

/** The project menu, labelled with the project's name and a chip of the plugin it is for. */
function ProjectMenu({ name, target }: { name: string; target: PackTargetId }) {
  const t = useTranslations('layout.topBar');
  const tTargets = useTranslations('layout.projectForm.targets');
  const actions = useProjectActions();
  const entries: MenuEntry[] = [
    {
      icon: <Settings />,
      label: t('projectMenu.settings'),
      description: t('projectMenu.settingsDescription'),
      onSelect: openSettings,
    },
    {
      icon: <Users />,
      label: t('projectMenu.share'),
      description: t('projectMenu.shareDescription'),
      onSelect: () => shareDialog.open(null),
    },
    'separator',
    {
      icon: <Save />,
      label: t('projectMenu.saveFile'),
      description: t('projectMenu.saveFileDescription'),
      onSelect: actions.saveFile,
    },
    { icon: <Upload />, label: t('projectMenu.openFile'), onSelect: () => void actions.openFile() },
    {
      icon: <FolderOpen />,
      label: t('projectMenu.switchProjects'),
      onSelect: () => projectsDialog.openWithPayload({ tab: 'open' }),
    },
    ...(actions.isShareAvailable
      ? [{ icon: <FolderSync />, label: t('projectMenu.openShared'), onSelect: () => void actions.openShared() }]
      : []),
    { icon: <FilePlus2 />, label: t('projectMenu.newProject'), onSelect: () => projectsDialog.openWithPayload({ tab: 'new' }) },
    'separator',
    { icon: <X />, label: t('projectMenu.close'), onSelect: () => void actions.close() },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="max-w-70 min-w-0 shrink px-2" />}>
        <span className="truncate font-semibold">{name || t('untitled')}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-1.5 text-micro font-medium text-muted-foreground">
          <TargetDot target={target} />
          {tTargets(`${target}.name`)}
        </span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-65">
        <MenuEntries kind="dropdown" entries={entries} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The top bar; without an open project it shows only the brand. */
export function TopBar() {
  const t = useTranslations('layout.topBar');
  const project = useProjectStore((s) => s.project);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const openExport = () => exportDialog.open(null);

  return (
    <header className="@container/top flex h-10 min-w-0 items-center gap-1.5 border-b border-line bg-surface px-2.5">
      <div className="flex shrink-0 items-center gap-2 pr-1 text-label font-semibold whitespace-nowrap text-foreground">
        <BrandMark className="size-6 text-base" />
        <span className={cn(project && 'hidden @7xl/top:inline')}>ResourcepackBuilder</span>
      </div>
      {project && (
        <>
          <ProjectMenu name={project.name} target={project.target} />
          <span aria-hidden="true" className="mx-0.5 h-4 w-px shrink-0 bg-line" />
          <div className="flex shrink-0 items-center">
            <IconButton
              label={
                <>
                  {t('undo')} <Kbd>{t('undoShortcut')}</Kbd>
                </>
              }
              aria-label={t('undo')}
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 />
            </IconButton>
            <IconButton
              label={
                <>
                  {t('redo')} <Kbd>{t('redoShortcut')}</Kbd>
                </>
              }
              aria-label={t('redo')}
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 />
            </IconButton>
          </div>
          <SaveStatus />
          <div className="flex min-w-0 flex-1 justify-center px-2">
            <CommandPaletteTrigger />
          </div>
          <ChecksButton />
          <ShareButton />
          <DockToggle />
          <Button size="sm" className="ml-1 shrink-0" onClick={openExport}>
            <Download /> {t('export')}
          </Button>
        </>
      )}
    </header>
  );
}
