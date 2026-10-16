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
  Settings,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { countIssues } from '@resourcepackbuilder/core/issues';
import { IconButton, StatusDot, Tip, TONE_ICONS, TONE_TEXT_CLASS } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Kbd } from '@resourcepackbuilder/ui/components/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@resourcepackbuilder/ui/components/dropdown-menu';
import { BrandMark } from '../components/BrandMark';
import { MenuEntries, type MenuEntry } from '../components/MenuEntries';
import { useProjectActions } from '../features/projects/useProjectActions';
import { SHARE_STATUS_TONE, useShareStatusText } from '../features/share/ShareStatusBadge';
import { openDialog } from '../store/dialogs';
import { usePlan } from '../store/PlanProvider';
import { redo, undo, useProjectStore } from '../store/project';
import { useSaveStore } from '../store/save';
import { isProjectShared, useShareStore } from '../store/share';
import { setRightPanelOpen, useUiStore } from '../store/ui';
import { THEME_CHOICES, THEME_ICONS } from '../theme/choices';
import { useTheme } from '../theme/ThemeProvider';
import { isThemeChoice } from '../theme/theme';

/** Opens the share dialog; shows the share status while the open project is shared. */
function ShareButton() {
  const t = useTranslations('layout.topBar.share');
  const statusText = useShareStatusText();
  const projectId = useProjectStore((s) => s.project?.id);
  const share = useShareStore();
  const isShared = isProjectShared(share, projectId);
  return (
    <Tip label={isShared ? t('sharedHint', { folder: share.folder ?? '', status: statusText(share.status) }) : t('hint')}>
      <Button variant="ghost" data-testid="share-button" onClick={() => openDialog({ id: 'share', props: {} })}>
        {isShared ? <StatusDot tone={SHARE_STATUS_TONE[share.status]} /> : <Users />}
        <span className="hidden @3xl/top:inline">{isShared ? t('shared') : t('button')}</span>
      </Button>
    </Tip>
  );
}

const SAVE_STATUS_CLASS = { saving: 'text-muted-foreground', saved: 'text-muted-foreground', error: 'text-destructive' } as const;

/** "Saving…", "Saved" or "Not saved!" next to the project menu. */
function SaveStatus() {
  const t = useTranslations('layout.topBar.saveStatus');
  const status = useSaveStore((s) => s.status);
  if (status === 'idle') return null;
  return (
    <Tip label={t('hint')}>
      <span className={cn('hidden text-xs whitespace-nowrap @2xl/top:inline', SAVE_STATUS_CLASS[status])}>{t(status)}</span>
    </Tip>
  );
}

/** Issue summary of the open project; opens the export dialog with the full list. */
function ChecksButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations('layout.topBar.checks');
  const plan = usePlan();
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
      <Button variant="ghost" aria-label={label} onClick={onClick}>
        <Icon className={TONE_TEXT_CLASS[tone]} />
        <span className="hidden @2xl/top:inline">{label}</span>
      </Button>
    </Tip>
  );
}

/** Quick switch between light, dark and system appearance. */
function ThemeMenu() {
  const tCommon = useTranslations('common');
  const { choice, setTheme } = useTheme();
  const Icon = THEME_ICONS[choice];
  return (
    <DropdownMenu>
      <Tip label={tCommon('theme')}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={tCommon('theme')} />}>
          <Icon />
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{tCommon('theme')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={choice}
            onValueChange={(value) => {
              if (isThemeChoice(value)) setTheme(value);
            }}
          >
            {THEME_CHOICES.map(({ id, icon: ChoiceIcon }) => (
              <DropdownMenuRadioItem key={id} value={id}>
                <ChoiceIcon /> {tCommon(`themeNames.${id}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectMenu({ name }: { name: string }) {
  const t = useTranslations('layout.topBar');
  const actions = useProjectActions();
  const entries: MenuEntry[] = [
    {
      icon: <Settings />,
      label: t('projectMenu.settings'),
      description: t('projectMenu.settingsDescription'),
      onSelect: () => openDialog({ id: 'settings', props: {} }),
    },
    {
      icon: <Users />,
      label: t('projectMenu.share'),
      description: t('projectMenu.shareDescription'),
      onSelect: () => openDialog({ id: 'share', props: {} }),
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
      onSelect: () => openDialog({ id: 'projects', props: { tab: 'open' } }),
    },
    ...(actions.isShareAvailable
      ? [{ icon: <FolderSync />, label: t('projectMenu.openShared'), onSelect: () => void actions.openShared() }]
      : []),
    { icon: <FilePlus2 />, label: t('projectMenu.newProject'), onSelect: () => openDialog({ id: 'projects', props: { tab: 'new' } }) },
    'separator',
    { icon: <X />, label: t('projectMenu.close'), onSelect: () => void actions.close() },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="max-w-70 min-w-0 shrink" />}>
        <span className="truncate">{name || t('untitled')}</span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-65">
        <MenuEntries kind="dropdown" entries={entries} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar() {
  const t = useTranslations('layout.topBar');
  const project = useProjectStore((s) => s.project);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const isRightPanelOpen = useUiStore((s) => s.isRightPanelOpen);
  const openExport = () => openDialog({ id: 'export', props: {} });
  const previewLabel = isRightPanelOpen ? t('preview.hide') : t('preview.show');

  return (
    <header className="@container/top flex h-14 min-w-0 items-center gap-2 border-b border-border bg-background px-4 @4xl/top:gap-3">
      <div className="flex shrink-0 items-center gap-2.5 font-heading text-lg leading-5 font-bold tracking-wide whitespace-nowrap text-foreground uppercase">
        <BrandMark />
        <span className={cn(project && 'hidden @6xl/top:inline')}>ResourcepackBuilder</span>
      </div>
      {project && (
        <>
          <ProjectMenu name={project.name} />
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              label={
                <>
                  {t('undo')} <Kbd>{t('undoShortcut')}</Kbd>
                </>
              }
              aria-label={t('undo')}
              size="icon"
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
              size="icon"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 />
            </IconButton>
          </div>
          <SaveStatus />
          <ShareButton />
        </>
      )}
      <span className="flex-1" />
      {project && <ChecksButton onClick={openExport} />}
      <ThemeMenu />
      {project && (
        <>
          <IconButton label={previewLabel} size="icon" onClick={() => setRightPanelOpen(!isRightPanelOpen)}>
            {isRightPanelOpen ? <PanelRightClose /> : <PanelRight />}
          </IconButton>
          <Button className="shrink-0" onClick={openExport}>
            <Download /> {t('export')}
          </Button>
        </>
      )}
    </header>
  );
}
