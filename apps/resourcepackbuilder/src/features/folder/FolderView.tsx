import type { ReactNode } from 'react';
import { Box, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { folderYamlFile } from '@resourcepackbuilder/core/export/paths';
import { countIssues, issuesFor } from '@resourcepackbuilder/core/issues';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { getFolderPathLabel } from '@resourcepackbuilder/core/project/tree';
import { DropZone, IconButton, PageHeader, PageShell, SectionLabel, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { openDialog } from '../../store/dialogs';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { select } from '../../store/ui';
import { NEW_ITEM_ACCEPT, NEW_ITEM_FORMATS } from '../newItem/accept';
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
                <span className="truncate">plugins/Nexo/{folderYamlFile(project, folderId)}</span>
              </Badge>
            </Tip>
            <Badge variant="outline">{t('itemCount', { count: items.length })}</Badge>
          </>
        }
        actions={
          <>
            <Button onClick={() => openDialog({ id: 'newItem', props: { folderId } })}>
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
        onFiles={(files) => openDialog({ id: 'newItem', props: { folderId, files } })}
        accept={NEW_ITEM_ACCEPT}
        title={t('dropTitle')}
        subtitle={t('dropSubtitle')}
        formats={NEW_ITEM_FORMATS}
        compact
      />

      {items.length > 0 && (
        <FolderSection title={t('itemsHeading')}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(190px,100%),1fr))] gap-2.5">
            {items.map((item) => (
              <ItemTile key={item.id} item={item} />
            ))}
          </div>
        </FolderSection>
      )}
      {folder.folderIds.length > 0 && (
        <FolderSection title={t('subfoldersHeading')}>
          <div className="flex flex-wrap gap-2">
            {folder.folderIds.map((id) => (
              <Button key={id} variant="outline" className="max-w-full" onClick={() => select({ kind: 'folder', id })}>
                <FolderOpen className="text-muted-foreground" />
                <span className="truncate">{project.folders[id]?.name}</span>
              </Button>
            ))}
          </div>
        </FolderSection>
      )}
    </PageShell>
  );
}

function FolderSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-2 flex flex-col gap-2">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  );
}

function ItemTile({ item }: { item: Item }) {
  const t = useTranslations('layout.folderView');
  const plan = usePlan();
  const thumb = useThumbnail(item.model);
  const counts = countIssues(plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : []);
  return (
    <button
      type="button"
      className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card p-3 text-left text-card-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={() => select({ kind: 'item', id: item.id })}
    >
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm border border-border bg-muted">
        {thumb ? (
          <img src={thumb} alt="" className="size-9 object-contain [image-rendering:pixelated]" />
        ) : (
          <Box className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{itemLabel(item)}</div>
        <div className="truncate font-mono text-xs text-muted-foreground">{item.nexoId}</div>
        {(counts.error > 0 || counts.warning > 0) && (
          <div className="mt-1 flex items-center gap-1">
            {counts.error > 0 && <Badge variant="destructive">{t('errors', { count: counts.error })}</Badge>}
            {counts.warning > 0 && <Badge variant="warning">{counts.warning}</Badge>}
          </div>
        )}
      </div>
    </button>
  );
}
