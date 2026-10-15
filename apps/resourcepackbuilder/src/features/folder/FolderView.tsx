import { Box, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import type { ExportPlan } from '@resourcepackbuilder/core/export/types';
import { folderYamlFile } from '@resourcepackbuilder/core/export/paths';
import { issuesFor } from '@resourcepackbuilder/core/issues';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { getFolderPathLabel } from '@resourcepackbuilder/core/project/tree';
import { DropZone, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { deleteFolder } from '../../commands/folders';
import { confirm, openDialog } from '../../store/dialogs';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { select } from '../../store/ui';
import { useFolderActions } from './useFolderActions';

const sectionTitle = 'mt-6 mb-3 font-heading text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase';

export function FolderView({ folderId }: { folderId: string }) {
  const t = useTranslations('layout.folderView');
  const tFolder = useTranslations('layout.folder');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const plan = usePlan();
  const folders = useFolderActions();
  const folder = project.folders[folderId];
  if (!folder) return null;
  const items = folder.itemIds.map((id) => project.items[id]).filter((item) => item !== undefined);
  const yamlPath = folderYamlFile(project, folderId);

  const confirmDelete = async () => {
    const confirmed = await confirm({
      title: tFolder('deleteTitle'),
      message: `${tFolder('deleteAll', { name: folder.name })}\n\n${tFolder('undoHint')}`,
      confirmLabel: tCommon('delete'),
      destructive: true,
    });
    if (confirmed) deleteFolder(folderId);
  };

  return (
    <div className="mx-auto max-w-[1120px] px-8 pt-6 pb-16">
      <div className="mb-5 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-sm border border-border bg-muted text-muted-foreground">
          <FolderOpen className="size-7.5" />
        </div>
        <div className="min-w-[200px] flex-1">
          <h1 className="m-0 truncate font-heading text-[28px] leading-8 font-semibold">{folder.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{getFolderPathLabel(project, folderId)}</Badge>
            <Badge variant="outline" className="font-mono" title={t('targetHint')}>
              plugins/Nexo/{yamlPath}
            </Badge>
            <Badge variant="outline">{t('itemCount', { count: items.length })}</Badge>
          </div>
        </div>
        <Button onClick={() => openDialog({ id: 'newItem', props: { folderId } })}>
          <Plus /> {t('newItem')}
        </Button>
        <Tip label={t('newSubfolder')}>
          <Button variant="outline" size="icon" aria-label={t('newSubfolder')} onClick={() => void folders.create(folderId)}>
            <FolderPlus />
          </Button>
        </Tip>
        <Tip label={tCommon('rename')}>
          <Button variant="outline" size="icon" aria-label={tCommon('rename')} onClick={() => void folders.rename(folder)}>
            <Pencil />
          </Button>
        </Tip>
        <Tip label={t('delete')}>
          <Button variant="destructive" size="icon" aria-label={t('delete')} onClick={() => void confirmDelete()}>
            <Trash2 />
          </Button>
        </Tip>
      </div>

      <DropZone
        onFiles={(files) => openDialog({ id: 'newItem', props: { folderId, files } })}
        accept=".bbmodel,.json,.png,.mcmeta"
        title={t('dropTitle')}
        subtitle={t('dropSubtitle')}
        formats={['.bbmodel', '.json + .png', '.png']}
        compact
      />

      {items.length > 0 && (
        <>
          <div className={sectionTitle}>{t('itemsHeading')}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
            {items.map((item) => (
              <ItemTile key={item.id} item={item} plan={plan} />
            ))}
          </div>
        </>
      )}
      {folder.folderIds.length > 0 && (
        <>
          <div className={sectionTitle}>{t('subfoldersHeading')}</div>
          <div className="flex flex-wrap gap-2">
            {folder.folderIds.map((id) => (
              <Button key={id} variant="outline" onClick={() => select({ kind: 'folder', id })}>
                <FolderOpen className="text-muted-foreground" /> {project.folders[id]?.name}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ItemTile({ item, plan }: { item: Item; plan: ExportPlan | null }) {
  const t = useTranslations('layout.folderView');
  const thumb = useThumbnail(item.model);
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  return (
    <button
      type="button"
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card p-3 text-left text-card-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
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
        {(errors > 0 || warnings > 0) && (
          <div className="mt-1 flex items-center gap-1">
            {errors > 0 && <Badge variant="destructive">{t('errors', { count: errors })}</Badge>}
            {warnings > 0 && <Badge className="bg-warning/15 text-warning">{warnings}</Badge>}
          </div>
        )}
      </div>
    </button>
  );
}
