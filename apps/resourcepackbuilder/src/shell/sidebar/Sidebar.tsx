/**
 * The sidebar: the panel of the current activity (the folder and item tree, the media lists, or a CraftEngine
 * project's logic lists), resizable by its right edge. Activities that open a page have no panel; the sidebar is
 * then left out and the page gets its room.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { FolderPlus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { SectionLabel, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@resourcepackbuilder/ui/components/input-group';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { moveFolder } from '../../commands/folders';
import { folderDirPath } from '../../features/folder/folderDir';
import { useFolderActions } from '../../features/folder/useFolderActions';
import { useServices } from '../../services/bootstrap';
import { usePlan } from '../PlanProvider';
import { ResizeHandle } from '../ResizeHandle';
import { activityById, isActivityAvailable } from '../activities';
import { useOpenProject } from '../../store/project';
import { type ActivityId, SIDEBAR_WIDTH, setSidebarWidth, useUiStore } from '../../store/ui';
import { FolderNode } from './FolderNode';
import { countItemsPerFolder, foldersContaining, levelsByTarget, searchItems, type SidebarTree } from './treeIndex';
import { DRAG_FOLDER, useDropTarget } from './useDropTarget';
import { CraftEngineEntries, MediaEntries } from './ViewEntries';

/** The tree data, derived once per project, plan or search change. */
function useSidebarTree(query: string): SidebarTree {
  const project = useOpenProject();
  const plan = usePlan();
  const itemCounts = useMemo(() => countItemsPerFolder(project), [project]);
  const itemLevels = useMemo(() => levelsByTarget(plan?.issues ?? [], 'item'), [plan]);
  const search = useMemo(() => {
    const items = searchItems(project, query);
    return items && { items, folders: foldersContaining(project, items) };
  }, [project, query]);
  return { project, itemCounts, itemLevels, search };
}

function NoFolders() {
  const t = useTranslations('layout.sidebar.empty');
  const project = useOpenProject();
  const folders = useFolderActions();
  return (
    <Empty className="px-2 pt-10">
      <EmptyHeader>
        <EmptyMedia>
          <FolderPlus className="size-8 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle className="text-title font-semibold">{t('title')}</EmptyTitle>
        <EmptyDescription className="text-meta">{t('description', { path: folderDirPath(project, null) })}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => void folders.create(null)}>
          <FolderPlus /> {t('action')}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** The heading of a panel, with optional actions on the right. */
function PanelHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <SectionLabel className="min-h-9 pt-1.5 pr-2 pb-1 pl-3" actions={actions}>
      <h2 className="truncate">{title}</h2>
    </SectionLabel>
  );
}

/** Folders and items of the open project, with search. */
function ItemsPanel() {
  const t = useTranslations('layout.sidebar');
  const folders = useFolderActions();
  const [query, setQuery] = useState('');
  const tree = useSidebarTree(query);
  // A folder dropped beside the folders (not onto one) moves to the top level
  const rootDrop = useDropTarget([DRAG_FOLDER], (data) => {
    const folderId = data.getData(DRAG_FOLDER);
    if (folderId) moveFolder(folderId, null);
  });

  return (
    <>
      <PanelHeader
        title={t('title')}
        actions={
          <Tip label={t('newFolder')}>
            <Button variant="ghost" size="sm" onClick={() => void folders.create(null)}>
              <FolderPlus /> {t('folderButton')}
            </Button>
          </Tip>
        }
      />
      <div className="px-2.5 pb-2">
        <InputGroup className="h-7.5">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={t('searchPlaceholder')}
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </div>
      <ScrollArea className={cn('min-h-0 flex-1', rootDrop.isOver && 'bg-primary/10')} {...rootDrop.handlers}>
        <div role="tree" aria-label={t('title')} className="px-1.5 pt-0.5 pb-4">
          {tree.project.rootFolderIds.length === 0 ? (
            <NoFolders />
          ) : tree.search?.items.size === 0 ? (
            <p role="status" className="px-2 pt-6 text-center text-meta text-muted-foreground">
              {t('noMatches')}
            </p>
          ) : (
            tree.project.rootFolderIds.map((id) => <FolderNode key={id} folderId={id} depth={0} tree={tree} />)
          )}
        </div>
      </ScrollArea>
    </>
  );
}

/** A panel listing project-wide views (the media lists or a CraftEngine project's own lists). */
function RegistryPanel({ activity, children }: { activity: ActivityId; children: ReactNode }) {
  const t = useTranslations('layout.activities');
  return (
    <>
      <PanelHeader title={t(`${activity}.label`)} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-px px-1.5 pt-0.5 pb-4">{children}</div>
      </ScrollArea>
    </>
  );
}

/** The panel content of each activity that has one. */
const PANELS: Partial<Record<ActivityId, () => ReactNode>> = {
  items: () => <ItemsPanel />,
  media: () => (
    <RegistryPanel activity="media">
      <MediaEntries />
    </RegistryPanel>
  ),
  logic: () => (
    <RegistryPanel activity="logic">
      <CraftEngineEntries />
    </RegistryPanel>
  ),
};

/** The activity whose panel the sidebar shows: the current one, or Items when the current one is not offered here. */
export function usePanelActivity(): ActivityId | null {
  const project = useOpenProject();
  const hasTestServer = useServices().testServer !== null;
  const activityId = useUiStore((s) => s.activity);
  const activity = activityById(activityId);
  if (!activity || !isActivityAvailable(activity, { project, hasTestServer })) return 'items';
  return PANELS[activity.id] ? activity.id : null;
}

/** The sidebar with the panel of `activity`, resizable by its right edge. */
export function Sidebar({ activity }: { activity: ActivityId }) {
  const t = useTranslations('layout.sidebar');
  const width = useUiStore((s) => s.sidebarWidth);
  const panel = PANELS[activity];
  if (!panel) return null;
  return (
    <aside
      aria-label={t('label')}
      style={{ width }}
      className="relative flex min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      {panel()}
      <ResizeHandle edge="right" width={width} range={SIDEBAR_WIDTH} onResize={setSidebarWidth} label={t('resize')} />
    </aside>
  );
}
