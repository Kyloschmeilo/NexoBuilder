/**
 * Models for furniture features (connecting, placement, light, states) and stack stages of blocks.
 * Each slot holds one model; on export ResourcepackBuilder writes the matching ItemModels and values.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { getPath } from '@resourcepackbuilder/core/nexo/configPath';
import {
  CONNECT_SLOTS,
  FURNITURE_MODEL_SLOTS,
  PLACEMENT_SLOTS,
  STACK_MODELS,
  stateDef,
  type VariantDef,
  type VariantSlot,
} from '@resourcepackbuilder/core/nexo/variants';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { DropZone, pickFiles, Thumb, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { updateItem } from '../../commands/items';
import { prompt } from '../../store/dialogs';
import { SectionTitle } from './SectionTitle';
import { MODEL_ACCEPT, useModelImport } from './useModelImport';
import { VariantCard } from './VariantsSection';

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
  const tCommon = useTranslations('common');
  const tSchema = useTranslations('schema');
  const { importModels } = useModelImport();
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
          {label ?? tSchema(def.label as never)}
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
            <Tip label={tCommon('remove')}>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive"
                aria-label={tCommon('remove')}
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
          <Thumb size={48} src={thumb} fallback={<Box size={18} className="opacity-60" />} />
          <span className="truncate text-xs text-muted-foreground">{model.fileName}</span>
        </div>
      ) : (
        <DropZone
          onFiles={(files) => void load(files)}
          accept={MODEL_ACCEPT}
          title={t('slots.model')}
          subtitle={description ?? tSchema(def.description as never)}
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
  const tCommon = useTranslations('common');
  const furniture = getPath(item.config, ['Mechanics', 'furniture']);
  if (!isPlainObject(furniture)) return null;
  const states = isPlainObject(furniture.states) ? Object.keys(furniture.states).filter((k) => !STATE_RESERVED.has(k)) : [];

  const addState = async () => {
    const name = await prompt({
      title: t('slots.newState'),
      label: t('slots.stateName'),
      initial: '',
      confirmLabel: tCommon('create'),
      validate: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return t('slots.nameRequired');
        if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return t('slots.nameInvalid');
        if (STATE_RESERVED.has(trimmed) || states.includes(trimmed)) return t('slots.nameTaken');
        return null;
      },
    });
    if (name === null) return;
    updateItem(item.id, (d) => {
      const mechanics = (d.config.Mechanics ??= {}) as Record<string, unknown>;
      const f = (mechanics.furniture ??= {}) as Record<string, unknown>;
      const s = (isPlainObject(f.states) ? f.states : (f.states = {})) as Record<string, unknown>;
      s[name] = {};
    });
  };

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
              onClick={() => void addState()}
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
