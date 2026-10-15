import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, ChevronRight, ImageUp, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import type { ImportedModel, ModelTexture } from '@resourcepackbuilder/core/model/types';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { createTexture, getAnimation, getFrameSize } from '@resourcepackbuilder/core/model/textures';
import { parseTexturePlaceholder, texturePlaceholder } from '@resourcepackbuilder/core/model/common';
import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/binary/png';
import { compareVersions, getMcVersion } from '@resourcepackbuilder/core/minecraft/versions';
import { issuesFor } from '@resourcepackbuilder/core/issues';
import { DropZone, pickFiles, readPngFile, Thumb, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@resourcepackbuilder/ui/components/collapsible';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { Label } from '@resourcepackbuilder/ui/components/label';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { ModelPreview } from '@resourcepackbuilder/preview';
import { updateItem } from '../../commands/items';
import { NumberInput } from '../../components/editor';
import { IssueList } from '../../components/IssueList';
import { confirm } from '../../store/dialogs';
import { toast } from '../../store/notifications';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { BlockModelsSection, FurnitureModelsSection } from './ModelSlots';
import { EditorCard } from './EditorCard';
import { EditorHint } from './EditorHint';
import { SectionTitle } from './SectionTitle';
import { PropertiesPanel } from './PropertiesPanel';
import { useModelImport } from './useModelImport';
import { VariantsSection } from './VariantsSection';

const ITEM_PARENTS = [
  { value: 'minecraft:item/generated', label: 'generated' },
  { value: 'minecraft:item/handheld', label: 'handheld' },
  { value: 'minecraft:item/handheld_rod', label: 'handheldRod' },
] as const;

function AppearancePanel({ item }: { item: Item }) {
  const t = useTranslations('item');
  return (
    <PropertiesPanel
      item={item}
      groups={['appearance']}
      title={t('properties.titles.appearance')}
      emptyText={t('properties.empty.appearance')}
    />
  );
}

export function ModelTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const plan = usePlan();
  const { importModel: importModelFiles } = useModelImport();
  const model = item.model;
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  const parentSelectId = useId();

  const setModel = (next: ImportedModel | null) => updateItem(item.id, (d) => (d.model = next));

  if (!model) {
    return (
      <div>
        <EditorCard
          icon={<Box size={18} />}
          title={t('model.noneTitle')}
          description={t('model.noneDescription', { material: String(item.config.material ?? 'PAPER') })}
        >
          <DropZone
            onFiles={async (files) => {
              const m = await importModelFiles(files);
              if (m) setModel(m);
            }}
            accept=".bbmodel,.json,.png,.mcmeta"
            title={t('model.dropTitle')}
            subtitle={t('model.dropSubtitle')}
            formats={['.bbmodel', '.json + .png', '.png']}
          />
        </EditorCard>
        <AppearancePanel item={item} />
      </div>
    );
  }

  const elementCount = model.json.elements?.length ?? 0;
  const requiresTooHigh = model.requiresVersion && compareVersions(model.requiresVersion, project.settings.minecraftVersion) > 0;
  const placeholderIds = new Set(
    Object.values(model.json.textures ?? {})
      .map(parseTexturePlaceholder)
      .filter(Boolean),
  );
  const otherRefs = Object.entries(model.json.textures ?? {}).filter(
    ([, v]) => typeof v === 'string' && !v.startsWith('#') && !parseTexturePlaceholder(v),
  );
  const parent = typeof model.json.parent === 'string' ? model.json.parent : '';
  const canSwitchParent = !model.json.elements && ITEM_PARENTS.some((p) => p.value === parent || p.value === `minecraft:${parent}`);
  const summary = [
    t(`model.source.${model.source}`),
    elementCount > 0 ? t('model.cubes', { count: elementCount }) : null,
    t('model.textureCount', { count: model.textures.length }),
    parent ? t('model.parent', { parent }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const updateModel = (recipe: (m: ImportedModel) => void) =>
    updateItem(item.id, (d) => {
      if (d.model) recipe(d.model);
    });

  return (
    <div>
      <EditorCard
        icon={<Box size={18} />}
        title={model.fileName}
        description={summary}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const files = await pickFiles('.bbmodel,.json,.png,.mcmeta');
                if (!files.length) return;
                const m = await importModelFiles(files);
                if (m) setModel(m);
              }}
            >
              <RefreshCw /> {t('model.replace')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const confirmed = await confirm({
                  title: t('model.removeTitle'),
                  message: t('model.removeMessage'),
                  confirmLabel: tCommon('remove'),
                  destructive: true,
                });
                if (confirmed) setModel(null);
              }}
            >
              <Trash2 /> {tCommon('remove')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-4">
          <ModelPreview model={model} height={360} />
          <div className="flex flex-col gap-2.5">
            {model.requiresVersion && (
              <EditorHint warning={!!requiresTooHigh}>
                {requiresTooHigh
                  ? t('model.requiresTooHigh', {
                      version: model.requiresVersion,
                      project: getMcVersion(project.settings.minecraftVersion).label,
                    })
                  : t('model.requires', { version: model.requiresVersion })}
              </EditorHint>
            )}
            {canSwitchParent && (
              <Field className="gap-1.5">
                <FieldLabel htmlFor={parentSelectId}>{t('model.display')}</FieldLabel>
                <NativeSelect
                  id={parentSelectId}
                  className="w-full"
                  value={parent.startsWith('minecraft:') ? parent : `minecraft:${parent}`}
                  onChange={(e) => updateModel((m) => (m.json.parent = e.target.value))}
                >
                  {ITEM_PARENTS.map((p) => (
                    <NativeSelectOption key={p.value} value={p.value}>
                      {t(`model.parents.${p.label}`)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <ShadingOptions model={model} onChange={updateModel} />
            <div>
              <div className="mb-1.5 text-sm font-medium">{t('model.check')}</div>
              <IssueList issues={issues.filter((i) => i.code !== 'plan.missingModel')} empty={t('model.noProblems')} hideInfo={false} />
            </div>
            {model.issues.length > 0 && (
              <Collapsible className="rounded-md border has-data-panel-open:border-input">
                <CollapsibleTrigger className="group/sub flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 font-heading text-[13px] font-semibold tracking-[0.06em] uppercase outline-none select-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                  <ChevronRight size={14} className="text-muted-foreground transition-transform group-data-panel-open/sub:rotate-90" />
                  {t('model.importNotes', { count: model.issues.length })}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pt-1 pb-3">
                  <IssueList issues={model.issues} />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </EditorCard>

      <SectionTitle>{t('model.textures')}</SectionTitle>
      <div className="mb-3.5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
        {model.textures.map((tex) => (
          <TextureCard
            key={tex.id}
            texture={tex}
            used={placeholderIds.has(tex.id)}
            onChange={(next) =>
              updateModel((m) => {
                const index = m.textures.findIndex((x) => x.id === tex.id);
                if (index >= 0) m.textures[index] = next;
              })
            }
          />
        ))}
        {otherRefs.map(([key, ref]) => (
          <VanillaRefCard
            key={key}
            textureKey={key}
            reference={ref}
            onAssign={async (file) => {
              const dataUrl = await readPngFile(file);
              if (!readPngInfoFromDataUrl(dataUrl)) {
                toast('error', t('editor.invalidPng'));
                return;
              }
              updateModel((m) => {
                const id = `t${Date.now().toString(36)}`;
                m.textures.push(createTexture(id, file.name, dataUrl));
                for (const [k, v] of Object.entries(m.json.textures ?? {})) {
                  if (v === ref) m.json.textures![k] = texturePlaceholder(id);
                }
              });
            }}
          />
        ))}
      </div>

      <VariantsSection item={item} />
      <FurnitureModelsSection item={item} />
      <BlockModelsSection item={item} />

      <AppearancePanel item={item} />
    </div>
  );
}

/** ambientocclusion (whole model) and shade (per cube) – like in Blockbench */
function ShadingOptions({ model, onChange }: { model: ImportedModel; onChange: (recipe: (m: ImportedModel) => void) => void }) {
  const t = useTranslations('item');
  const aoId = useId();
  const shadeId = useId();
  const elements = model.json.elements ?? [];
  const unshaded = elements.filter((el) => el.shade === false).length;
  const shadeState = unshaded === 0 ? 'all' : unshaded === elements.length ? 'none' : 'some';
  const usesOverride = elements.some((el) => el.shade_direction_override !== undefined);
  return (
    <div className="flex flex-col gap-3 py-1">
      <Field orientation="horizontal" className="gap-2.5">
        <Checkbox
          id={aoId}
          checked={model.json.ambientocclusion !== false}
          onCheckedChange={(checked) =>
            onChange((m) => {
              if (checked) delete m.json.ambientocclusion;
              else m.json.ambientocclusion = false;
            })
          }
        />
        <FieldContent>
          <FieldLabel htmlFor={aoId}>{t('model.ambientOcclusion')}</FieldLabel>
          <FieldDescription className="text-xs">{t('model.ambientOcclusionHelp')}</FieldDescription>
        </FieldContent>
      </Field>
      {elements.length > 0 && (
        <Field orientation="horizontal" className="gap-2.5" data-disabled={usesOverride || undefined}>
          <Checkbox
            id={shadeId}
            checked={shadeState === 'all'}
            indeterminate={shadeState === 'some'}
            disabled={usesOverride}
            onCheckedChange={() =>
              onChange((m) => {
                const on = shadeState !== 'all';
                for (const el of m.json.elements ?? []) {
                  if (on) delete el.shade;
                  else el.shade = false;
                }
              })
            }
          />
          <FieldContent>
            <FieldLabel htmlFor={shadeId}>{t('model.shade')}</FieldLabel>
            <FieldDescription className="text-xs">
              {usesOverride
                ? t('model.shadeOverride')
                : shadeState === 'some'
                  ? t('model.shadeSome', { off: unshaded, total: elements.length })
                  : t('model.shadeHelp')}
            </FieldDescription>
          </FieldContent>
        </Field>
      )}
    </div>
  );
}

function TextureCard({ texture, used, onChange }: { texture: ModelTexture; used: boolean; onChange: (t: ModelTexture) => void }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const animatedId = useId();
  const smoothId = useId();
  const [editingName, setEditingName] = useState(false);
  const animation = getAnimation(texture);
  const frame = getFrameSize(texture);
  const replace = async () => {
    const [file] = await pickFiles('.png,image/png', false);
    if (!file) return;
    const dataUrl = await readPngFile(file);
    const info = readPngInfoFromDataUrl(dataUrl);
    if (!info) {
      toast('error', t('editor.invalidPng'));
      return;
    }
    onChange({ ...texture, dataUrl, width: info.width, height: info.height });
  };
  return (
    <div className={cn('flex gap-3 rounded-md border bg-muted/50 p-3', !texture.dataUrl && 'border-destructive')}>
      <Thumb src={texture.dataUrl} alt={texture.name} fallback={<ImageUp size={22} className="opacity-60" />} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
        {editingName ? (
          <Input
            className="h-7"
            autoFocus
            defaultValue={texture.name}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name) onChange({ ...texture, name });
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <div className="flex items-center gap-1">
            <strong className="truncate text-foreground">{texture.name}.png</strong>
            <Tip label={tCommon('rename')}>
              <Button variant="ghost" size="icon-xs" aria-label={tCommon('rename')} onClick={() => setEditingName(true)}>
                <Pencil />
              </Button>
            </Tip>
          </div>
        )}
        <span>
          {texture.dataUrl ? t('model.texture.size', { width: texture.width, height: texture.height }) : t('model.texture.missing')}
          {animation && ` · ${t('model.texture.frames', { count: frame.count })}`}
          {!used && ` · ${t('model.texture.particleOnly')}`}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => void replace()}>
            <ImageUp /> {texture.dataUrl ? t('model.replace') : t('model.texture.assignPng')}
          </Button>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={animatedId}
              checked={!!animation}
              onCheckedChange={(checked) =>
                onChange({
                  ...texture,
                  mcmeta: checked ? { ...(texture.mcmeta ?? {}), animation: { frametime: 2 } } : null,
                })
              }
            />
            <Label htmlFor={animatedId} className="cursor-pointer text-xs font-normal text-foreground">
              {t('model.texture.animated')}
            </Label>
          </div>
        </div>
        {animation && (
          <div className="flex items-center gap-1.5">
            <span>{t('model.texture.ticksPerFrame')}</span>
            <div className="w-[70px]">
              <NumberInput
                value={animation.frametime}
                integer
                min={1}
                onChange={(v) =>
                  onChange({
                    ...texture,
                    mcmeta: { ...(texture.mcmeta ?? {}), animation: { ...(texture.mcmeta?.animation as object), frametime: v ?? 1 } },
                  })
                }
              />
            </div>
            <Checkbox
              id={smoothId}
              checked={!!animation.interpolate}
              onCheckedChange={(checked) => {
                const anim = { ...(texture.mcmeta?.animation as Record<string, unknown>) };
                if (checked) anim.interpolate = true;
                else delete anim.interpolate;
                onChange({ ...texture, mcmeta: { ...(texture.mcmeta ?? {}), animation: anim } });
              }}
            />
            <Label htmlFor={smoothId} className="cursor-pointer text-xs font-normal text-foreground">
              {t('model.texture.interpolate')}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}

function VanillaRefCard({ textureKey, reference, onAssign }: { textureKey: string; reference: string; onAssign: (file: File) => void }) {
  const t = useTranslations('item');
  const vanilla = !reference.includes(':') || reference.startsWith('minecraft:');
  return (
    <div className={cn('flex gap-3 rounded-md border bg-muted/50 p-3', !vanilla && 'border-destructive')}>
      <Thumb fallback={<ImageUp size={22} className="opacity-60" />} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
        <strong className="font-mono text-foreground">#{textureKey}</strong>
        <span className="break-all">
          {reference} {vanilla ? t('model.texture.minecraftTexture') : t('model.texture.notInPack')}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={async () => {
            const [file] = await pickFiles('.png,image/png', false);
            if (file) onAssign(file);
          }}
        >
          <ImageUp /> {t('model.texture.assignOwnPng')}
        </Button>
      </div>
    </div>
  );
}
