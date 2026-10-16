import { useMemo, useState } from 'react';
import { FolderPlus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { SectionLabel, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@resourcepackbuilder/ui/components/input-group';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { moveFolder } from '../../commands/folders';
import { useFolderActions } from '../../features/folder/useFolderActions';
import { useServices } from '../../services/servicesContext';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { FolderNode } from './FolderNode';
import { countItemsPerFolder, foldersContaining, levelsByTarget, searchItems, type SidebarTree } from './treeIndex';
import { DRAG_FOLDER, useDropTarget } from './useDropTarget';
import { ResourceEntries, TestServerEntry } from './ViewEntries';

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
  const folders = useFolderActions();
  return (
    <Empty className="px-2 pt-10">
      <EmptyHeader>
        <EmptyMedia>
          <FolderPlus className="size-8 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle className="font-heading text-base tracking-wide uppercase">{t('title')}</EmptyTitle>
        <EmptyDescription className="text-xs">{t('description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => void folders.create(null)}>
          <FolderPlus /> {t('action')}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** Folders and items of the open project, with search, and the project-wide views below. */
export function Sidebar() {
  const t = useTranslations('layout.sidebar');
  const folders = useFolderActions();
  const isTestServerAvailable = useServices().testServer !== null;
  const [query, setQuery] = useState('');
  const tree = useSidebarTree(query);
  // A folder dropped beside the folders (not onto one) moves to the top level
  const rootDrop = useDropTarget([DRAG_FOLDER], (data) => {
    const folderId = data.getData(DRAG_FOLDER);
    if (folderId) moveFolder(folderId, null);
  });

  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SectionLabel
        className="pt-3 pr-3 pb-2 pl-4"
        actions={
          <Tip label={t('newFolder')}>
            <Button variant="ghost" size="sm" onClick={() => void folders.create(null)}>
              <FolderPlus /> {t('folderButton')}
            </Button>
          </Tip>
        }
      >
        <h2 className="truncate">{t('title')}</h2>
      </SectionLabel>
      <div className="px-3 pb-2">
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
        <div role="tree" aria-label={t('title')} className="px-2 pt-0.5 pb-4">
          {tree.project.rootFolderIds.length === 0 ? (
            <NoFolders />
          ) : (
            tree.project.rootFolderIds.map((id) => <FolderNode key={id} folderId={id} depth={0} tree={tree} />)
          )}
        </div>
      </ScrollArea>
      <ResourceEntries />
      {isTestServerAvailable && <TestServerEntry />}
    </aside>
  );
}
