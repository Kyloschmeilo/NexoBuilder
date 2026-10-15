/**
 * Models for furniture features (connecting, placement, light, states) and stack stages of blocks.
 * Each slot holds one model; on export ResourcepackBuilder writes the matching ItemModels and values.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import type { ImportedModel, Item } from '@resourcepackbuilder/core/types';
import { getPath } from '@resourcepackbuilder/core/nexo/configPath';
import { CONNECT_SLOTS, FURNITURE_MODEL_SLOTS, PLACEMENT_SLOTS, STACK_MODELS, stateDef, type VariantDef, type VariantSlot } from '@resourcepackbuilder/core/nexo/variants';
import { isPlainObject } from '@resourcepackbuilder/core/util';
import { updateItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '@resourcepackbuilder/ui';
import { pickFiles } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { importModels, MODEL_ACCEPT, VariantCard } from './VariantsSection';
import { SectionTitle, TextureThumb, Tip } from './parts';

const STATE_RESERVED = new Set(['next_after', 'reset_after', 'condition']);

function setSlot(item: Item, slot: VariantSlot, models: ImportedModel[] | undefined) {
  updateItem(item.id, (d) => {
    const next = { ...(d.variants ?? {}) };
    if (models && models.length > 0) next[slot] = models;
    else delete next[slot];
    d.variants = next;
  });
}

/**
 * A slot for exactly one model. Labels of core slot definitions are `schema` message keys;
 * `label`/`description` override them with ready text (used for user-named states).
 */
function ModelSlot({ item, def, label, description }: { item: Item; def: VariantDef; label?: string; description?: string }) {
  const t = useTranslations('item');
  const tc = useTranslations('common');
  const ts = useTranslations('schema');
  const model = item.variants?.[def.slot]?.[0] ?? null;
  const thumb = useThumbnail(model);
  const load = async (files: File[]) => {
    const [imported] = await importModels(files);
    if (imported) setSlot(item, def.slot, [imported]);
  };
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 rounded-md border p-2', model && 'border-primary bg-primary/10')}>
      <div className="flex min-h-7 items-center gap-0.5">
        <span className="min-w-0 flex-1 truncate font-heading text-xs font-semibold tracking-[0.08em] uppercase">
          {label ?? ts(def.label as never)}
        </span>
        {model && (
          <>
            <Tip label={t('model.replace')}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('model.replace')}
                onClick={async () => {
                  const files = await pickFiles(MODEL_ACCEPT);
                  if (files.length) void load(files);
                }}
              >
                <RefreshCw />
              </Button>
            </Tip>
            <Tip label={tc('remove')}>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive"
                aria-label={tc('remove')}
                onClick={() => setSlot(item, def.slot, undefined)}
              >
                <Trash2 />
              </Button>
            </Tip>
          </>
        )}
      </div>
      {model ? (
        <div className="flex min-w-0 items-center gap-2" title={model.fileName}>
          <TextureThumb size={48}>{thumb ? <img src={thumb} alt="" /> : <Box size={18} className="opacity-60" />}</TextureThumb>
          <span className="truncate text-xs text-muted-foreground">{model.fileName}</span>
        </div>
      ) : (
        <DropZone
          onFiles={(files) => void load(files)}
          accept={MODEL_ACCEPT}
          title={t('slots.model')}
          subtitle={description ?? ts(def.description as never)}
          multiple={false}
          compact
        />
      )}
    </div>
  );
}

function SlotGroup({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-heading text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{title}</div>
      <div className="mb-2 text-xs text-muted-foreground">{desc}</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">{children}</div>
    </div>
  );
}

const byslot = (slot: VariantSlot) => FURNITURE_MODEL_SLOTS.find((d) => d.slot === slot)!;

/** Furniture models – only visible when the furniture mechanic is active */
export function FurnitureModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tc = useTranslations('common');
  const furniture = getPath(item.config, ['Mechanics', 'furniture']);
  if (!isPlainObject(furniture)) return null;
  const states = isPlainObject(furniture.states) ? Object.keys(furniture.states).filter((k) => !STATE_RESERVED.has(k)) : [];

  const addState = () =>
    useStore.getState().openDialog({
      type: 'prompt',
      title: t('slots.newState'),
      label: t('slots.stateName'),
      initial: '',
      confirmLabel: tc('create'),
      validate: (value) => {
        const name = value.trim();
        if (!name) return t('slots.nameRequired');
        if (!/^[A-Za-z0-9_-]+$/.test(name)) return t('slots.nameInvalid');
        if (STATE_RESERVED.has(name) || states.includes(name)) return t('slots.nameTaken');
        return null;
      },
      onSubmit: (value) =>
        updateItem(item.id, (d) => {
          const mechanics = (d.config.Mechanics ??= {}) as Record<string, unknown>;
          const f = (mechanics.furniture ??= {}) as Record<string, unknown>;
          const s = (isPlainObject(f.states) ? f.states : (f.states = {})) as Record<string, unknown>;
          s[value.trim()] = {};
        }),
    });

  return (
    <div>
      <SectionTitle>{t('slots.furnitureTitle')}</SectionTitle>
      <Card className="mb-4 rounded-lg py-0">
        <CardContent className="flex flex-col gap-5 py-5">
          <SlotGroup title={t('slots.connectable')} desc={t('slots.connectableHelp')}>
            {CONNECT_SLOTS.map((c) => (
              <ModelSlot key={c.slot} item={item} def={byslot(c.slot)} />
            ))}
          </SlotGroup>
          <SlotGroup title={t('slots.placements')} desc={t('slots.placementsHelp')}>
            {PLACEMENT_SLOTS.map((p) => (
              <ModelSlot key={p.slot} item={item} def={byslot(p.slot)} />
            ))}
          </SlotGroup>
          <SlotGroup title={t('slots.lights')} desc={t('slots.lightsHelp')}>
            <ModelSlot item={item} def={byslot('light_on')} />
          </SlotGroup>
          <SlotGroup title={t('slots.states')} desc={t('slots.statesHelp')}>
            {states.map((name) => (
              <ModelSlot key={name} item={item} def={stateDef(name)} label={name} description={t('slots.stateDescription', { name })} />
            ))}
            <button
              type="button"
              className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input p-2 font-heading text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={addState}
            >
              <Plus size={18} />
              <span>{t('slots.addState')}</span>
            </button>
          </SlotGroup>
        </CardContent>
      </Card>
    </div>
  );
}

/** Stack stages – only with the custom block mechanic (StringBlock) */
export function BlockModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const block = getPath(item.config, ['Mechanics', 'custom_block']);
  if (!isPlainObject(block) || block.type !== 'STRINGBLOCK') return null;
  return (
    <div>
      <SectionTitle>{t('slots.blockTitle')}</SectionTitle>
      <VariantCard item={item} def={STACK_MODELS} removable={false} />
    </div>
  );
}
