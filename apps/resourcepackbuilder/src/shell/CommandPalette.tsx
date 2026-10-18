/**
 * The command palette (Ctrl+K or the search field in the top bar): finds actions, pages, folders and items by name
 * or id and runs or opens the chosen one.
 */
import { type ReactNode, useState } from 'react';
import {
  Box,
  Download,
  SlidersHorizontal,
  Folder,
  FolderOpen,
  FolderPlus,
  PanelRight,
  Plus,
  Save,
  Server,
  Settings,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@resourcepackbuilder/ui/components/command';
import { exportDialog } from '../features/export/ExportDialog';
import { useFolderActions } from '../features/folder/useFolderActions';
import { useItemSettingEntries } from '../features/item/useItemSettingEntries';
import { newItemDialog } from '../features/newItem/NewItemDialog';
import { projectsDialog } from '../features/projects/ProjectsDialog';
import { useProjectActions } from '../features/projects/useProjectActions';
import { shareDialog } from '../features/share/ShareDialog';
import { useServices } from '../services/bootstrap';
import { useOpenProject } from '../store/project';
import { openSettings, select, setCommandPaletteOpen, useUiStore, type ViewName } from '../store/ui';
import { availableActivities } from './activities';
import { newItemFolderId, paletteFolders, paletteItems, palettePages, scorePaletteEntry, type PalettePage } from './commandPaletteEntries';
import { CRAFT_ENGINE_VIEWS, RESOURCES } from './sidebar/ViewEntries';
import { useDockState } from './useDockLayout';

interface Entry {
  /** Unique within the palette */
  id: string;
  icon: ReactNode;
  label: string;
  /** Muted text after the label (an id, a folder path) */
  detail?: string;
  /** Texts the search matches against */
  keywords: string[];
  shortcut?: string;
  run: () => void;
}

/** The icon of each view in the registry lists; other pages use their activity's icon. */
const VIEW_ICONS: Partial<Record<ViewName, ReactNode>> = Object.fromEntries(
  [...RESOURCES, ...CRAFT_ENGINE_VIEWS].map(({ view, icon }) => [view, icon]),
);

/** The label of a page: registry views use their sidebar label, the test server and settings their own. */
function usePageLabel(): (page: PalettePage) => string {
  const tResources = useTranslations('layout.sidebar.resources');
  const tActivities = useTranslations('layout.activities');
  const tCommon = useTranslations('common');
  return (page) => {
    if (page.kind === 'settings') return tCommon('settings');
    if (page.view === 'testServer') return tActivities('testServer.label');
    // Every view of a registry list has its label under layout.sidebar.resources.<view>
    return tResources(`${page.view}.label` as never);
  };
}

function EntryGroup({ heading, entries, onRun }: { heading: string; entries: Entry[]; onRun: (entry: Entry) => void }) {
  if (entries.length === 0) return null;
  return (
    <CommandGroup heading={heading}>
      {entries.map((entry) => (
        <CommandItem key={entry.id} value={entry.id} keywords={entry.keywords} onSelect={() => onRun(entry)}>
          {entry.icon}
          <span className="truncate">{entry.label}</span>
          {entry.detail && <span className="min-w-0 truncate font-mono text-meta text-muted-foreground">{entry.detail}</span>}
          {entry.shortcut && <CommandShortcut>{entry.shortcut}</CommandShortcut>}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

/** The palette's dialog; mounted while a project is open. */
export function CommandPalette() {
  const t = useTranslations('layout.commandPalette');
  const tTopBar = useTranslations('layout.topBar');
  const tDock = useTranslations('layout.dock');
  const tSidebar = useTranslations('layout.sidebar');
  const tFolder = useTranslations('layout.folderView');
  const isOpen = useUiStore((s) => s.isCommandPaletteOpen);
  const selection = useUiStore((s) => s.selection);
  const project = useOpenProject();
  const hasTestServer = useServices().testServer !== null;
  const folders = useFolderActions();
  const projectActions = useProjectActions();
  const dock = useDockState();
  const pageLabel = usePageLabel();
  const [search, setSearch] = useState('');
  const settings = useItemSettingEntries(selection?.kind === 'item' ? selection.id : null);

  const close = () => {
    setCommandPaletteOpen(false);
    setSearch('');
  };
  const run = (entry: Entry) => {
    close();
    entry.run();
  };

  const targetFolderId = newItemFolderId(project, selection);
  const dockLabel = dock.isVisible ? tDock('hide') : tDock('show');
  const actions: Entry[] = [
    ...(targetFolderId
      ? [
          {
            id: 'action:newItem',
            icon: <Plus />,
            label: tFolder('newItem'),
            keywords: [tFolder('newItem')],
            run: () => newItemDialog.openWithPayload({ folderId: targetFolderId }),
          },
        ]
      : []),
    {
      id: 'action:newFolder',
      icon: <FolderPlus />,
      label: tSidebar('newFolder'),
      keywords: [tSidebar('newFolder')],
      run: () => void folders.create(null),
    },
    {
      id: 'action:export',
      icon: <Download />,
      label: tTopBar('export'),
      keywords: [tTopBar('export')],
      run: () => exportDialog.open(null),
    },
    {
      id: 'action:share',
      icon: <Users />,
      label: tTopBar('projectMenu.share'),
      keywords: [tTopBar('projectMenu.share')],
      run: () => shareDialog.open(null),
    },
    {
      id: 'action:dock',
      icon: <PanelRight />,
      label: dockLabel,
      keywords: [dockLabel, tDock('yamlTab'), tDock('checksTab')],
      shortcut: tDock('toggleShortcut'),
      run: dock.toggle,
    },
    {
      id: 'action:settings',
      icon: <Settings />,
      label: tTopBar('projectMenu.settings'),
      keywords: [tTopBar('projectMenu.settings')],
      run: openSettings,
    },
    {
      id: 'action:saveFile',
      icon: <Save />,
      label: tTopBar('projectMenu.saveFile'),
      keywords: [tTopBar('projectMenu.saveFile')],
      run: projectActions.saveFile,
    },
    {
      id: 'action:switchProjects',
      icon: <FolderOpen />,
      label: tTopBar('projectMenu.switchProjects'),
      keywords: [tTopBar('projectMenu.switchProjects')],
      run: () => projectsDialog.openWithPayload({ tab: 'open' }),
    },
  ];

  const pages: Entry[] = palettePages(availableActivities({ project, hasTestServer }), project.target).map((page) => {
    const label = pageLabel(page);
    return {
      id: page.kind === 'settings' ? 'page:settings' : `page:${page.view}`,
      icon: page.kind === 'settings' ? <Settings /> : (VIEW_ICONS[page.view] ?? <Server />),
      label,
      keywords: [label],
      run: () => select(page),
    };
  });

  const folderEntries: Entry[] = paletteFolders(project).map((folder) => ({
    id: `folder:${folder.id}`,
    icon: <Folder />,
    label: folder.name,
    detail: folder.parentPath || undefined,
    keywords: [folder.name, folder.parentPath],
    run: () => select({ kind: 'folder', id: folder.id }),
  }));

  const itemEntries: Entry[] = paletteItems(project).map((item) => ({
    id: `item:${item.id}`,
    icon: <Box />,
    label: item.label,
    detail: item.itemId,
    keywords: [item.label, item.itemId, item.folderPath],
    run: () => select({ kind: 'item', id: item.id }),
  }));

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => (open ? setCommandPaletteOpen(true) : close())}
      title={t('title')}
      description={t('description')}
    >
      <CommandWithFilter>
        <CommandInput placeholder={t('placeholder')} value={search} onValueChange={setSearch} />
        <CommandList className="max-h-[min(60vh,420px)]">
          <CommandEmpty>{t('empty')}</CommandEmpty>
          <EntryGroup heading={t('groups.actions')} entries={actions} onRun={run} />
          <EntryGroup heading={t('groups.pages')} entries={pages} onRun={run} />
          <EntryGroup heading={t('groups.folders')} entries={folderEntries} onRun={run} />
          <EntryGroup heading={t('groups.items')} entries={itemEntries} onRun={run} />
          {/* The open item's settings only while searching: there are too many to list them all */}
          {search.trim() && settings && (
            <EntryGroup
              heading={settings.heading}
              entries={settings.entries.map((entry) => ({ ...entry, icon: <SlidersHorizontal /> }))}
              onRun={run}
            />
          )}
        </CommandList>
      </CommandWithFilter>
    </CommandDialog>
  );
}

/**
 * The cmdk root, searching the entries' texts (not their ids) with {@link scorePaletteEntry}. Its Ctrl+J/K/N/P list
 * navigation is off: Ctrl+J and Ctrl+K are the app's own shortcuts, which do nothing while the palette is open.
 */
function CommandWithFilter({ children }: { children: ReactNode }) {
  return (
    <Command filter={(_value, search, keywords) => scorePaletteEntry(keywords ?? [], search)} loop vimBindings={false}>
      {children}
    </Command>
  );
}
