import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Download,
  FolderOpen,
  FolderSync,
  FilePlus2,
  Monitor,
  Moon,
  PanelRight,
  PanelRightClose,
  Redo2,
  Save,
  Settings,
  Sun,
  TriangleAlert,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { countIssues } from '@resourcepackbuilder/core/export/plan';
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
import { useStore } from '../../state/store';
import { closeProject, openProjectFile, openSharedProjectFromFolder, saveProjectFile } from '../projectActions';
import { isShareAvailable, useShareStore, type ShareStatus } from '../../state/share';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeChoice } from '../../theme/theme';
import { MenuEntries, StatusDot, Tip, type DotTone, type MenuEntry } from './parts';

function shareTone(status: ShareStatus): DotTone {
  return status === 'synced' ? 'success' : status === 'error' ? 'error' : status === 'off' ? 'neutral' : 'warning';
}

function ShareChip() {
  const t = useTranslations('layout.topBar');
  const projectId = useStore((s) => s.project?.id);
  const share = useShareStore();
  const shared = share.projectId === projectId && share.status !== 'off';
  return (
    <Tip label={shared ? t('share.sharedHint', { folder: share.folder ?? '', status: t(`shareStatus.${share.status}`) }) : t('share.hint')}>
      <Button variant="ghost" onClick={() => useStore.getState().openDialog({ type: 'share' })}>
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

const THEME_ICONS: Record<ThemeChoice, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/** Quick switch between light, dark and system appearance. */
function ThemeMenu() {
  const tc = useTranslations('common');
  const { choice, setTheme } = useTheme();
  const Icon = THEME_ICONS[choice];
  return (
    <DropdownMenu>
      <Tip label={tc('theme')}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={tc('theme')} />}>
          <Icon />
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{tc('theme')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={choice} onValueChange={(value) => setTheme(value as ThemeChoice)}>
            {(['light', 'dark', 'system'] as const).map((c) => {
              const ChoiceIcon = THEME_ICONS[c];
              return (
                <DropdownMenuRadioItem key={c} value={c}>
                  <ChoiceIcon /> {tc(`themeNames.${c}`)}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectMenu({ name }: { name: string }) {
  const t = useTranslations('layout.topBar');
  const open = useStore.getState().openDialog;
  const entries: MenuEntry[] = [
    {
      icon: <Settings />,
      label: t('projectMenu.settings'),
      description: t('projectMenu.settingsDescription'),
      onSelect: () => open({ type: 'settings' }),
    },
    {
      icon: <Users />,
      label: t('projectMenu.share'),
      description: t('projectMenu.shareDescription'),
      onSelect: () => open({ type: 'share' }),
    },
    'separator',
    {
      icon: <Save />,
      label: t('projectMenu.saveFile'),
      description: t('projectMenu.saveFileDescription'),
      onSelect: () => saveProjectFile(),
    },
    { icon: <Upload />, label: t('projectMenu.openFile'), onSelect: () => void openProjectFile() },
    { icon: <FolderOpen />, label: t('projectMenu.switchProjects'), onSelect: () => open({ type: 'projects' }) },
    ...(isShareAvailable()
      ? [{ icon: <FolderSync />, label: t('projectMenu.openShared'), onSelect: () => void openSharedProjectFromFolder() }]
      : []),
    { icon: <FilePlus2 />, label: t('projectMenu.newProject'), onSelect: () => open({ type: 'newProject' }) },
    'separator',
    { icon: <X />, label: t('projectMenu.close'), onSelect: () => void closeProject() },
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

export function TopBar({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('layout.topBar');
  const project = useStore((s) => s.project);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const saveStatus = useStore((s) => s.saveStatus);
  const rightPanel = useStore((s) => s.rightPanel);
  const counts = plan ? countIssues(plan.issues) : null;
  const open = useStore.getState().openDialog;

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
              <Button variant="ghost" size="icon" aria-label={t('undo')} disabled={!canUndo} onClick={() => useStore.getState().undo()}>
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
              <Button variant="ghost" size="icon" aria-label={t('redo')} disabled={!canRedo} onClick={() => useStore.getState().redo()}>
                <Redo2 />
              </Button>
            </Tip>
          </div>
          {saveStatus !== 'idle' && (
            <Tip label={t('saveStatus.hint')}>
              <span className={saveStatus === 'error' ? 'text-xs whitespace-nowrap text-destructive' : 'text-xs whitespace-nowrap text-muted-foreground'}>
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
          <Button variant="ghost" onClick={() => open({ type: 'export' })}>
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
          <Tip label={rightPanel ? t('preview.hide') : t('preview.show')}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={rightPanel ? t('preview.hide') : t('preview.show')}
              onClick={() => useStore.getState().setRightPanel(!rightPanel)}
            >
              {rightPanel ? <PanelRightClose /> : <PanelRight />}
            </Button>
          </Tip>
          <Button onClick={() => open({ type: 'export' })}>
            <Download /> {t('export')}
          </Button>
        </>
      )}
    </header>
  );
}
