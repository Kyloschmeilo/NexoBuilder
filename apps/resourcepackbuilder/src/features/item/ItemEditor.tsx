import { useTranslations } from 'next-intl';
import { Box, ClipboardCopy, ClipboardPaste, Copy, FolderInput, Gift, Trash2 } from 'lucide-react';
import { issuesFor } from '@resourcepackbuilder/core/issues';
import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/binary/png';
import { getFolderPathLabel } from '@resourcepackbuilder/core/project/tree';
import { assetToken, resolveAsset } from '@resourcepackbuilder/core/project/assets';
import { uid } from '@resourcepackbuilder/core/project/ids';
import { createTexture } from '@resourcepackbuilder/core/model/textures';
import { readPngFile, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { updateItem } from '../../commands/items';
import { FieldContext, type FieldContextValue } from '../../components/editor';
import { MiniMessageBox, MiniMessageLine } from '../../components/MiniMessage';
import { useErrorMessage } from '../../i18n/errors';
import { useServices } from '../../services/servicesContext';
import { clipboardLabel, useClipboardStore } from '../../store/clipboard';
import { openDialog } from '../../store/dialogs';
import { toast } from '../../store/notifications';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { useTestServerStore } from '../../store/testServer';
import { setEditorTab, useUiStore, type EditorTab } from '../../store/ui';
import { GeneralTab } from './GeneralTab';
import { ModelTab } from './ModelTab';
import { countActiveProperties, PropertiesPanel } from './PropertiesPanel';
import { RecipesTab } from './RecipesTab';
import { useItemActions } from './useItemActions';
import { YamlTab } from './YamlTab';

/** "Give in test server" – only visible while the local test server is running */
function GiveButton({ nexoId }: { nexoId: string }) {
  const t = useTranslations('item');
  const errorMessage = useErrorMessage();
  const testServer = useServices().testServer;
  const running = useTestServerStore((s) => s.server?.status === 'running');
  if (!testServer || !running) return null;
  return (
    <Tip label={t('editor.giveTooltip')}>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          void testServer.give(nexoId).then(
            (player) => toast('success', t('editor.giveSuccess', { id: nexoId, player })),
            (err: unknown) => toast('error', errorMessage(err)),
          )
        }
      >
        <Gift /> {t('editor.give')}
      </Button>
    </Tip>
  );
}

const TABS: EditorTab[] = ['general', 'model', 'attributes', 'components', 'mechanics', 'recipes', 'yaml'];

export function ItemEditor({ itemId }: { itemId: string }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const plan = usePlan();
  const item = project.items[itemId];
  const activeTab = useUiStore((s) => s.editorTab);
  const thumb = useThumbnail(item?.model ?? null);
  const clip = useClipboardStore((s) => s.clip);
  const actions = useItemActions();
  if (!item) return null;

  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;

  const fieldContext: FieldContextValue = {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: (token) => resolveAsset(item, token),
    uploadAsset: async (file) => {
      const dataUrl = await readPngFile(file);
      if (!readPngInfoFromDataUrl(dataUrl)) {
        toast('error', t('editor.invalidPng'));
        return null;
      }
      const id = uid('a');
      updateItem(item.id, (d) => {
        d.assets[id] = createTexture(id, file.name, dataUrl);
      });
      return assetToken(id);
    },
  };

  const counts: Partial<Record<EditorTab, number>> = {
    attributes: countActiveProperties(item, 'attributes'),
    components: countActiveProperties(item, 'components'),
    mechanics: countActiveProperties(item, 'mechanics'),
    recipes: item.recipes.length,
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
              <Button variant="outline" size="sm" onClick={() => actions.copyProperties(item.id)}>
                <ClipboardCopy /> {tCommon('copy')}
              </Button>
            </Tip>
            <Tip label={clip ? t('editor.pasteTooltip', { name: clipboardLabel(clip) }) : t('editor.pasteDisabled')}>
              <Button variant="outline" size="sm" disabled={pasteDisabled} onClick={() => actions.pasteProperties([item.id])}>
                <ClipboardPaste /> {tCommon('paste')}
              </Button>
            </Tip>
            <Button variant="outline" size="sm" onClick={() => actions.duplicate(item)}>
              <Copy /> {tCommon('duplicate')}
            </Button>
            <Tip label={t('editor.move')}>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t('editor.move')}
                onClick={() => openDialog({ id: 'moveItem', props: { itemId: item.id } })}
              >
                <FolderInput />
              </Button>
            </Tip>
            <Tip label={tCommon('delete')}>
              <Button variant="destructive" size="icon-sm" aria-label={tCommon('delete')} onClick={() => void actions.remove(item)}>
                <Trash2 />
              </Button>
            </Tip>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tab = TABS.find((candidate) => candidate === value);
            if (tab) setEditorTab(tab);
          }}
          className="gap-5"
        >
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
            <ModelTab item={item} />
          </TabsContent>
          {(['attributes', 'components', 'mechanics'] as const).map((group) => (
            <TabsContent key={group} value={group}>
              <PropertiesPanel
                item={item}
                groups={[group]}
                title={t(`properties.titles.${group}`)}
                emptyText={t(`properties.empty.${group}`)}
              />
            </TabsContent>
          ))}
          <TabsContent value="recipes">
            <RecipesTab item={item} />
          </TabsContent>
          <TabsContent value="yaml">
            <YamlTab item={item} />
          </TabsContent>
        </Tabs>
      </div>
    </FieldContext.Provider>
  );
}
