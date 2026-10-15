import { useTranslations } from 'next-intl';
import { Box, ClipboardCopy, ClipboardPaste, Copy, FolderInput, Gift, Trash2 } from 'lucide-react';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { issuesForItem } from '@resourcepackbuilder/core/export/plan';
import { getFolderPathLabel } from '@resourcepackbuilder/core/project/tree';
import { ASSET_TOKEN_PREFIX } from '@resourcepackbuilder/core/nexo/schema';
import { createTexture } from '@resourcepackbuilder/core/model/textures';
import { readPngInfoFromDataUrl, uid } from '@resourcepackbuilder/core/util';
import { duplicateItem, updateItem } from '../../state/actions';
import { useStore, type EditorTab } from '../../state/store';
import { MiniMessageBox, MiniMessageLine } from '@resourcepackbuilder/ui';
import { FieldContext, type FieldContextValue } from '@resourcepackbuilder/ui';
import { readAsDataUrl } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { confirmDeleteItem } from '../layout/Sidebar';
import { errorMessage } from '../../i18n/errors';
import { GeneralTab } from './GeneralTab';
import { ModelTab } from './ModelTab';
import { countActiveProperties, PropertiesPanel } from './PropertiesPanel';
import { YamlTab } from './YamlTab';
import { RecipesTab } from './RecipesTab';
import { Tip } from './parts';
import { giveInTestServer, useTestServerStore } from '../../state/testserver';
import { clipboardLabel, copyItemProperties, openPasteDialog, useItemClipboard } from '../../state/clipboard';

/** "Give in test server" – only visible while the local test server is running */
function GiveButton({ nexoId }: { nexoId: string }) {
  const t = useTranslations('item');
  const running = useTestServerStore((s) => s.state?.status === 'running');
  if (!running) return null;
  return (
    <Tip label={t('editor.giveTooltip')}>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          void giveInTestServer(nexoId)
            .then((player) => useStore.getState().toast('success', t('editor.giveSuccess', { id: nexoId, player })))
            .catch((err: unknown) => useStore.getState().toast('error', errorMessage(err)))
        }
      >
        <Gift /> {t('editor.give')}
      </Button>
    </Tip>
  );
}

const TABS: EditorTab[] = ['general', 'model', 'attributes', 'components', 'mechanics', 'recipes', 'yaml'];

export function ItemEditor({ itemId, plan }: { itemId: string; plan: ExportPlan | null }) {
  const t = useTranslations('item');
  const tc = useTranslations('common');
  const project = useStore((s) => s.project)!;
  const item = project.items[itemId];
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setActiveTab);
  const thumb = useThumbnail(item?.model ?? null);
  const clip = useItemClipboard((s) => s.clip);
  if (!item) return null;

  const issues = plan ? issuesForItem(plan.issues, item.id) : [];
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;

  const fieldContext: FieldContextValue = {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: (token) => (token.startsWith(ASSET_TOKEN_PREFIX) ? item.assets?.[token.slice(ASSET_TOKEN_PREFIX.length)] : undefined),
    uploadAsset: async (file) => {
      const dataUrl = await readAsDataUrl(file);
      if (!readPngInfoFromDataUrl(dataUrl)) {
        useStore.getState().toast('error', t('editor.invalidPng'));
        return null;
      }
      const id = uid('a');
      updateItem(item.id, (d) => {
        d.assets = d.assets ?? {};
        d.assets[id] = createTexture(id, file.name, dataUrl);
      });
      return `${ASSET_TOKEN_PREFIX}${id}`;
    },
  };

  const counts: Partial<Record<EditorTab, number>> = {
    attributes: countActiveProperties(item, 'attributes'),
    components: countActiveProperties(item, 'components'),
    mechanics: countActiveProperties(item, 'mechanics'),
    recipes: item.recipes?.length ?? 0,
  };

  const pasteDisabled = !clip || clip.sourceItemId === item.id;

  return (
    <FieldContext.Provider value={fieldContext}>
      <div className="mx-auto max-w-[1120px] px-5 pt-5 pb-12 min-[1450px]:px-8 min-[1450px]:pt-6 min-[1450px]:pb-16">
        <div className="mb-5 grid grid-cols-[64px_minmax(160px,1fr)_auto] gap-x-4 gap-y-2 [grid-template-areas:'thumb_title_actions'_'thumb_meta_meta']">
          <div className="grid size-16 place-items-center self-start overflow-hidden rounded-sm border bg-card text-muted-foreground [grid-area:thumb] [&_img]:size-12 [&_img]:object-contain [&_img]:[image-rendering:pixelated]">
            {thumb ? <img src={thumb} alt="" /> : <Box size={26} className="opacity-60" />}
          </div>
          <h1 className="m-0 min-w-0 font-heading text-2xl leading-8 font-semibold [grid-area:title]">
            {/* Minecraft colours are made for a dark background, so the name sits in a dark box in both themes */}
            <MiniMessageBox className="min-w-0 truncate px-3 py-0.5 align-top font-heading text-2xl leading-8">
              <MiniMessageLine text={item.displayName || item.nexoId} />
            </MiniMessageBox>
          </h1>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground [grid-area:meta]">
            <Tip label={t('editor.itemId')}>
              <Badge variant="outline" className="border-primary font-mono text-primary">
                {item.nexoId}
              </Badge>
            </Tip>
            <Tip label={t('editor.folder')}>
              <Badge variant="outline">{getFolderPathLabel(project, item.folderId)}</Badge>
            </Tip>
            <Badge variant="outline" className="font-mono">
              {String(item.config.material ?? 'PAPER')}
            </Badge>
            {errors > 0 && <Badge variant="destructive">{t('editor.errors', { count: errors })}</Badge>}
            {warnings > 0 && <Badge className="bg-warning/15 text-warning">{t('editor.warnings', { count: warnings })}</Badge>}
            {errors === 0 && warnings === 0 && <Badge className="bg-success/15 text-success">{t('editor.ready')}</Badge>}
          </div>
          <div className="flex flex-wrap justify-end gap-2 [grid-area:actions]">
            <GiveButton nexoId={item.nexoId} />
            <Tip label={t('editor.copyTooltip')}>
              <Button variant="outline" size="sm" onClick={() => copyItemProperties(item.id)}>
                <ClipboardCopy /> {tc('copy')}
              </Button>
            </Tip>
            <Tip label={clip ? t('editor.pasteTooltip', { name: clipboardLabel(clip) }) : t('editor.pasteDisabled')}>
              {/* wrapper keeps the tooltip working while the button is disabled */}
              <span className="inline-flex">
                <Button variant="outline" size="sm" disabled={pasteDisabled} onClick={() => openPasteDialog([item.id])}>
                  <ClipboardPaste /> {tc('paste')}
                </Button>
              </span>
            </Tip>
            <Button variant="outline" size="sm" onClick={() => duplicateItem(item.id)}>
              <Copy /> {tc('duplicate')}
            </Button>
            <Tip label={t('editor.move')}>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t('editor.move')}
                onClick={() => useStore.getState().openDialog({ type: 'moveItem', itemId: item.id })}
              >
                <FolderInput />
              </Button>
            </Tip>
            <Tip label={tc('delete')}>
              <Button variant="destructive" size="icon-sm" aria-label={tc('delete')} onClick={() => confirmDeleteItem(item)}>
                <Trash2 />
              </Button>
            </Tip>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setTab(value as EditorTab)} className="gap-5">
          <TabsList variant="line" className="h-auto! w-full flex-wrap justify-start gap-1 border-b p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="group/tab h-10 flex-none rounded-b-none px-3 after:bg-primary group-data-horizontal/tabs:after:bottom-[-1px] hover:bg-muted"
              >
                {t(`editor.tabs.${tab}`)}
                {!!counts[tab] && (
                  <span className="rounded-full border border-input px-1.5 font-mono text-[11px] leading-4 text-muted-foreground group-data-active/tab:border-primary group-data-active/tab:bg-primary/10 group-data-active/tab:text-primary">
                    {counts[tab]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general">
            <GeneralTab item={item} />
          </TabsContent>
          <TabsContent value="model">
            <ModelTab item={item} plan={plan} />
          </TabsContent>
          {(['attributes', 'components', 'mechanics'] as const).map((group) => (
            <TabsContent key={group} value={group}>
              <PropertiesPanel item={item} groups={[group]} title={t(`properties.titles.${group}`)} emptyText={t(`properties.empty.${group}`)} />
            </TabsContent>
          ))}
          <TabsContent value="recipes">
            <RecipesTab item={item} />
          </TabsContent>
          <TabsContent value="yaml">
            <YamlTab item={item} plan={plan} />
          </TabsContent>
        </Tabs>
      </div>
    </FieldContext.Provider>
  );
}
