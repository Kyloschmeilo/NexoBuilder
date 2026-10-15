import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Download,
  FolderOpen,
  FolderSync,
  FilePlus2,
  PanelRight,
  PanelRightClose,
  Redo2,
  Save,
  Settings,
  TriangleAlert,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { countIssues } from '@resourcepackbuilder/core/issues';
import { StatusDot, Tip, type Tone } from '@resourcepackbuilder/ui';
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
import { MenuEntries, type MenuEntry } from '../components/MenuEntries';
import { useProjectActions } from '../features/projects/useProjectActions';
import { openDialog } from '../store/dialogs';
import { usePlan } from '../store/PlanProvider';
import { redo, undo, useProjectStore } from '../store/project';
import { useSaveStore } from '../store/save';
import { useShareStore, type ShareStatus } from '../store/share';
import { setRightPanelOpen, useUiStore } from '../store/ui';
import { THEME_CHOICES, THEME_ICONS } from '../theme/choices';
import { useTheme } from '../theme/ThemeProvider';
import { isThemeChoice } from '../theme/theme';

function shareTone(status: ShareStatus): Tone {
  return status === 'synced' ? 'success' : status === 'error' ? 'error' : status === 'off' ? 'neutral' : 'warning';
}

function ShareChip() {
  const t = useTranslations('layout.topBar');
  const projectId = useProjectStore((s) => s.project?.id);
  const share = useShareStore();
  const shared = share.projectId === projectId && share.status !== 'off';
  return (
    <Tip label={shared ? t('share.sharedHint', { folder: share.folder ?? '', status: t(`shareStatus.${share.status}`) }) : t('share.hint')}>
      <Button variant="ghost" onClick={() => openDialog({ id: 'share', props: {} })}>
        {shared ? (
          <>
            <StatusDot tone={shareTone(share.status)} /> {t('share.shared')}
          </>
        ) : (
          <>
            <Users /> {t('share.button')}
          </>
        )}
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
      <DropdownMenuTrigger render={<Button variant="ghost" className="max-w-[280px]" />}>
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
  const saveStatus = useSaveStore((s) => s.status);
  const isRightPanelOpen = useUiStore((s) => s.isRightPanelOpen);
  const plan = usePlan();
  const counts = plan ? countIssues(plan.issues) : null;
  const openExport = () => openDialog({ id: 'export', props: {} });

  return (
    <header className="flex min-w-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2.5 font-heading text-[17px] leading-5 font-bold tracking-[0.04em] whitespace-nowrap text-foreground uppercase">
        <div className="grid size-7 place-items-center rounded-sm bg-primary font-heading text-[17px] leading-none font-bold text-primary-foreground">
          R
        </div>
        ResourcepackBuilder
      </div>
      {project && (
        <>
          <ProjectMenu name={project.name} />
          <div className="flex items-center gap-0.5">
            <Tip
              label={
                <>
                  {t('undo')} <Kbd>{t('undoShortcut')}</Kbd>
                </>
              }
            >
              <Button variant="ghost" size="icon" aria-label={t('undo')} disabled={!canUndo} onClick={undo}>
                <Undo2 />
              </Button>
            </Tip>
            <Tip
              label={
                <>
                  {t('redo')} <Kbd>{t('redoShortcut')}</Kbd>
                </>
              }
            >
              <Button variant="ghost" size="icon" aria-label={t('redo')} disabled={!canRedo} onClick={redo}>
                <Redo2 />
              </Button>
            </Tip>
          </div>
          {saveStatus !== 'idle' && (
            <Tip label={t('saveStatus.hint')}>
              <span
                className={
                  saveStatus === 'error' ? 'text-xs whitespace-nowrap text-destructive' : 'text-xs whitespace-nowrap text-muted-foreground'
                }
              >
                {saveStatus === 'saving' ? t('saveStatus.saving') : saveStatus === 'saved' ? t('saveStatus.saved') : t('saveStatus.error')}
              </span>
            </Tip>
          )}
          <ShareChip />
        </>
      )}
      <span className="flex-1" />
      {project && counts && (
        <Tip label={t('checks.hint')}>
          <Button variant="ghost" onClick={openExport}>
            {counts.error > 0 ? (
              <>
                <CircleAlert className="text-destructive" /> {t('checks.errors', { count: counts.error })}
              </>
            ) : counts.warning > 0 ? (
              <>
                <TriangleAlert className="text-warning" /> {t('checks.warnings', { count: counts.warning })}
              </>
            ) : (
              <>
                <CircleCheck className="text-success" /> {t('checks.ok')}
              </>
            )}
          </Button>
        </Tip>
      )}
      <ThemeMenu />
      {project && (
        <>
          <Tip label={isRightPanelOpen ? t('preview.hide') : t('preview.show')}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={isRightPanelOpen ? t('preview.hide') : t('preview.show')}
              onClick={() => setRightPanelOpen(!isRightPanelOpen)}
            >
              {isRightPanelOpen ? <PanelRightClose /> : <PanelRight />}
            </Button>
          </Tip>
          <Button onClick={openExport}>
            <Download /> {t('export')}
          </Button>
        </>
      )}
    </header>
  );
}
