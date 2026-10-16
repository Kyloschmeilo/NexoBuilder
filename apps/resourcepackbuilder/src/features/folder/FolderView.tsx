import { Box, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Item as ProjectItem } from '@resourcepackbuilder/core/project/types';
import { folderYamlFile, nexoPluginPath } from '@resourcepackbuilder/core/export/paths';
import { issuesFor } from '@resourcepackbuilder/utils';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { getFolderPathLabel } from '@resourcepackbuilder/core/project/tree';
import { AutoGrid, DropZone, IconButton, PageHeader, PageShell, Thumb, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@resourcepackbuilder/ui/components/item';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { IssueCountBadges } from '../../components/IssueCountBadges';
import { Section } from '../../components/Section';
import { usePlan } from '../../shell/PlanProvider';
import { newItemDialog } from '../newItem/NewItemDialog';
import { useOpenProject } from '../../store/project';
import { select } from '../../store/ui';
import { MODEL_ACCEPT, MODEL_FORMATS } from '../../components/modelFiles';
import { useFolderActions } from './useFolderActions';

export function FolderView({ folderId }: { folderId: string }) {
  const t = useTranslations('layout.folderView');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const folders = useFolderActions();
  const folder = project.folders[folderId];
  if (!folder) return null;
  const items = folder.itemIds.map((id) => project.items[id]).filter((item) => item !== undefined);

  return (
    <PageShell>
      <PageHeader
        icon={<FolderOpen className="size-7" />}
        title={folder.name}
        meta={
          <>
            <Badge variant="outline">{getFolderPathLabel(project, folderId)}</Badge>
            <Tip label={t('targetHint')}>
              <Badge variant="outline" className="max-w-full font-mono">
                <span className="truncate">{nexoPluginPath(folderYamlFile(project, folderId))}</span>
              </Badge>
            </Tip>
            <Badge variant="outline">{t('itemCount', { count: items.length })}</Badge>
          </>
        }
        actions={
          <>
            <Button onClick={() => newItemDialog.openWithPayload({ folderId })}>
              <Plus /> {t('newItem')}
            </Button>
            <IconButton label={t('newSubfolder')} variant="outline" size="icon" onClick={() => void folders.create(folderId)}>
              <FolderPlus />
            </IconButton>
            <IconButton label={tCommon('rename')} variant="outline" size="icon" onClick={() => void folders.rename(folder)}>
              <Pencil />
            </IconButton>
            <IconButton label={t('delete')} variant="destructive" size="icon" onClick={() => void folders.remove(folder)}>
              <Trash2 />
            </IconButton>
          </>
        }
      />

      <DropZone
        onFiles={(files) => newItemDialog.openWithPayload({ folderId, files })}
        accept={MODEL_ACCEPT}
        title={t('dropTitle')}
        subtitle={t('dropSubtitle')}
        formats={MODEL_FORMATS}
        compact
      />

      {items.length > 0 && (
        <Section className="mt-2 gap-2" title={t('itemsHeading')}>
          <AutoGrid min="190px" className="gap-2.5">
            {items.map((item) => (
              <ItemTile key={item.id} item={item} />
            ))}
          </AutoGrid>
        </Section>
      )}
      {folder.folderIds.length > 0 && (
        <Section className="mt-2 gap-2" title={t('subfoldersHeading')}>
          <div className="flex flex-wrap gap-2">
            {folder.folderIds.map((id) => (
              <Button key={id} variant="outline" className="max-w-full" onClick={() => select({ kind: 'folder', id })}>
                <FolderOpen className="text-muted-foreground" />
                <span className="truncate">{project.folders[id]?.name}</span>
              </Button>
            ))}
          </div>
        </Section>
      )}
    </PageShell>
  );
}

function ItemTile({ item }: { item: ProjectItem }) {
  const plan = usePlan();
  const thumb = useThumbnail(item.model);
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  return (
    <Item
      variant="outline"
      className="min-w-0 cursor-pointer flex-nowrap bg-card p-3 text-left text-card-foreground hover:bg-muted"
      render={<button type="button" onClick={() => select({ kind: 'item', id: item.id })} />}
    >
      <ItemMedia>
        <Thumb size={48} src={thumb} bordered fallback={<Box className="size-5" />} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="font-semibold">{itemLabel(item)}</ItemTitle>
        <ItemDescription className="line-clamp-1 font-mono text-xs">{item.nexoId}</ItemDescription>
        {issues.some((i) => i.level !== 'info') && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <IssueCountBadges issues={issues} />
          </div>
        )}
      </ItemContent>
    </Item>
  );
}
