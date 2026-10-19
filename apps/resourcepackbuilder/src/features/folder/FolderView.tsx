/**
 * The folder page: a header with the folder's path and the file its items are written to, a compact drop zone for new
 * items, its subfolders, and its items as a table (thumbnail, name, id, kind, issues) that stays usable with hundreds
 * of items.
 */
import { FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getFolderPathLabel, type Item as ProjectItem, itemLabel, type Project } from '@resourcepackbuilder/core/project';
import { folderConfigPath } from '@resourcepackbuilder/export';
import { countIssues, issuesFor } from '@resourcepackbuilder/utils';
import {
  DropZone,
  EmptyHint,
  IconButton,
  type MenuEntry,
  Page,
  PageHeader,
  Panel,
  Section,
  StatusPill,
  Thumb,
  Tip,
} from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { useThumbnail } from '../../components/useThumbnail';
import { MODEL_ACCEPT, MODEL_FORMATS } from '../../components/modelFiles';
import { usePlan } from '../../shell/PlanProvider';
import { ITEM_KIND_ICONS } from '../../shell/sidebar/itemKindIcons';
import { itemKindOf } from '../../shell/sidebar/treeIndex';
import { useOpenProject } from '../../store/project';
import { select } from '../../store/ui';
import { newItemDialog } from '../newItem/NewItemDialog';
import { useFolderActions } from './useFolderActions';

/** Shared classes of the table's body and header cells. */
const CELL = 'h-9 px-2 align-middle';
const HEAD = 'h-8 px-2 text-left align-middle text-meta font-semibold text-text-muted';

/** A folder of the open project as a page. */
export function FolderView({ folderId }: { folderId: string }) {
  const t = useTranslations('layout.folderView');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const folders = useFolderActions();
  const folder = project.folders[folderId];
  if (!folder) return null;
  const items = folder.itemIds.map((id) => project.items[id]).filter((item) => item !== undefined);
  const subfolderIds = folder.folderIds.filter((id) => project.folders[id]);
  const newItem = () => newItemDialog.openWithPayload({ folderId });

  const menu: MenuEntry[] = [
    { icon: <Pencil />, label: tCommon('rename'), onSelect: () => void folders.rename(folder) },
    'separator',
    { icon: <Trash2 />, label: t('delete'), destructive: true, onSelect: () => void folders.remove(folder) },
  ];

  return (
    <Page
      wide
      header={
        <PageHeader
          icon={<FolderOpen />}
          title={folder.name}
          meta={
            <>
              <Badge variant="outline">{getFolderPathLabel(project, folderId)}</Badge>
              <Tip label={t('targetHint')}>
                <Badge variant="outline" className="max-w-full font-mono">
                  <span className="truncate">{folderConfigPath(project, folderId)}</span>
                </Badge>
              </Tip>
            </>
          }
          actions={
            <>
              <Button size="sm" onClick={newItem}>
                <Plus /> {t('newItem')}
              </Button>
              <IconButton label={t('newSubfolder')} variant="ghost" size="icon" onClick={() => void folders.create(folderId)}>
                <FolderPlus />
              </IconButton>
            </>
          }
          menu={menu}
        />
      }
    >
      <DropZone
        className="mb-4"
        onFiles={(files) => newItemDialog.openWithPayload({ folderId, files })}
        accept={MODEL_ACCEPT}
        title={t('dropTitle')}
        subtitle={t('dropSubtitle')}
        // The formats only while the folder is empty; with items the zone stays a slim strip
        formats={items.length === 0 ? MODEL_FORMATS : undefined}
        compact
      />

      {subfolderIds.length > 0 && (
        <Section id="subfolders" title={t('subfoldersHeading')} meta={<Count value={subfolderIds.length} />}>
          <div className="flex flex-wrap gap-1.5">
            {subfolderIds.map((id) => (
              <Button key={id} variant="outline" size="sm" className="max-w-full" onClick={() => select({ kind: 'folder', id })}>
                <FolderOpen className="text-muted-foreground" />
                <span className="truncate">{project.folders[id]?.name}</span>
              </Button>
            ))}
          </div>
        </Section>
      )}

      <Section id="items" title={t('itemsHeading')} meta={<Count value={items.length} />}>
        {items.length === 0 ? (
          <EmptyHint actionLabel={t('addItem')} onAction={newItem}>
            {t('noItems')}
          </EmptyHint>
        ) : (
          <ItemTable project={project} items={items} />
        )}
      </Section>
    </Page>
  );
}

/** The number of entries beside a section title. */
function Count({ value }: { value: number }) {
  return <span className="font-mono text-micro text-text-faint tabular-nums">{value}</span>;
}

/** The items of the folder, one row each; the id and kind columns give way first when the page is narrow. */
function ItemTable({ project, items }: { project: Project; items: ProjectItem[] }) {
  const t = useTranslations('layout.folderView.table');
  return (
    <Panel className="overflow-hidden">
      <table className="w-full table-fixed border-collapse text-body">
        <thead className="border-b border-line bg-surface-sunken">
          <tr>
            <th scope="col" className={`${HEAD} w-10`}>
              <span className="sr-only">{t('thumbnail')}</span>
            </th>
            <th scope="col" className={HEAD}>
              {t('name')}
            </th>
            <th scope="col" className={`${HEAD} hidden @2xl/page:table-cell`}>
              {t('id')}
            </th>
            <th scope="col" className={`${HEAD} hidden w-32 @xl/page:table-cell`}>
              {t('kind')}
            </th>
            <th scope="col" className={`${HEAD} w-44`}>
              {t('issues')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ItemRow key={item.id} project={project} item={item} />
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** One item of the table; a click on the row (or Enter on the name) opens the item. */
function ItemRow({ project, item }: { project: Project; item: ProjectItem }) {
  const t = useTranslations('layout.folderView.table');
  const tIssues = useTranslations('dialogs.issues');
  const plan = usePlan();
  const thumb = useThumbnail(item.model);
  const counts = countIssues(plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : []);
  const kind = itemKindOf(item, project.target);
  const KindIcon = ITEM_KIND_ICONS[kind];
  return (
    <tr
      data-testid="folder-item-row"
      className="cursor-pointer border-b border-line last:border-b-0 hover:bg-muted"
      onClick={() => select({ kind: 'item', id: item.id })}
    >
      <td className={`${CELL} pr-0`}>
        <Thumb size={24} src={thumb} checkered={false} fallback={<KindIcon className="size-4 text-muted-foreground" />} />
      </td>
      <td className={CELL}>
        {/* The click bubbles to the row; the button makes the row reachable by keyboard */}
        <button
          type="button"
          className="block max-w-full cursor-pointer truncate rounded-sm text-left font-medium text-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {itemLabel(item)}
        </button>
      </td>
      <td className={`${CELL} hidden truncate font-mono text-meta text-text-muted @2xl/page:table-cell`}>{item.itemId}</td>
      <td className={`${CELL} hidden text-meta text-text-muted @xl/page:table-cell`}>
        <span className="inline-flex items-center gap-1.5">
          <KindIcon className="size-3.5" aria-hidden />
          {t(`kinds.${kind}`)}
        </span>
      </td>
      <td className={CELL}>
        <span className="flex flex-wrap gap-1">
          {counts.error > 0 && <StatusPill tone="error" label={tIssues('errors', { count: counts.error })} />}
          {counts.warning > 0 && <StatusPill tone="warning" label={tIssues('warnings', { count: counts.warning })} />}
          {counts.error === 0 && counts.warning === 0 && <span className="text-meta text-text-faint">{t('noIssues')}</span>}
        </span>
      </td>
    </tr>
  );
}
