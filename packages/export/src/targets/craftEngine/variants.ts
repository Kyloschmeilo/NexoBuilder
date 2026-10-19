/**
 * CraftEngine's `models:` list: materials with several states (bow, crossbow, fishing rod, shield, elytra) take all
 * their models in a fixed slot order (craftengine-docs-map §2.11, checked against the plugin's
 * SimplifiedItemModelReader classes, which read the list with a fixed size). Each slot takes a model of one of the
 * app's variant slots; slot 0 is always the main model.
 */
import { craftEngineMaterial } from '@resourcepackbuilder/core/craftEngine';
import {
  DIRECTIONAL_MODEL_SLOTS,
  FURNITURE_MODEL_SLOTS,
  STACK_MODELS,
  stateDef,
  type VariantDef,
  variantFrame,
  variantPathSuffix,
  VARIANTS,
  type VariantSlot,
} from '@resourcepackbuilder/core/project';
import type { ItemExport } from '../../types';

/** A slot of the `models:` list after the main model: the model at `index` of the app's variant slot `slot`. */
interface ModelSlot {
  slot: VariantSlot;
  index: number;
}

/** The slots after the main model, per material (as CraftEngine writes it, without the minecraft: namespace). */
export const CE_MODEL_SLOTS: Record<string, ModelSlot[]> = {
  // idle, pulling 0/1/2
  bow: [0, 1, 2].map((index) => ({ slot: 'pulling_models', index })),
  // idle, pulling 0/1/2, loaded with an arrow, loaded with a firework
  crossbow: [
    ...[0, 1, 2].map((index) => ({ slot: 'pulling_models' as const, index })),
    { slot: 'charged_model', index: 0 },
    { slot: 'firework_model', index: 0 },
  ],
  // idle, cast
  fishing_rod: [{ slot: 'cast_model', index: 0 }],
  // idle, blocking
  shield: [{ slot: 'blocking_model', index: 0 }],
  // intact, broken (the first damaged model)
  elytra: [{ slot: 'damaged_models', index: 0 }],
};

const SLOT_DEFS = new Map<VariantSlot, VariantDef>(
  [...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS, ...DIRECTIONAL_MODEL_SLOTS].map((def) => [def.slot, def]),
);

function defOf(slot: VariantSlot): VariantDef {
  return SLOT_DEFS.get(slot) ?? stateDef(slot.slice('state:'.length));
}

/** The materials whose `models:` list uses the variant slot. */
function materialsFor(slot: VariantSlot): string[] {
  return Object.entries(CE_MODEL_SLOTS)
    .filter(([, slots]) => slots.some((s) => s.slot === slot))
    .map(([material]) => material);
}

/**
 * Writes the variant models CraftEngine uses for the item's material and returns the `models:` list in slot order
 * (null = the item has a single model). The material is the final one, after the raw YAML. Missing slots show the
 * main model; other variants and models beyond the slots are reported.
 */
export function writeCraftEngineVariants(itemExport: ItemExport, mainKey: string | null): string[] | null {
  const { item } = itemExport;
  const material = craftEngineMaterial(item);
  const slots = CE_MODEL_SLOTS[material.replace(/^minecraft:/, '')] ?? [];
  const written = new Map<string, string>();

  for (const [slot, models] of Object.entries(item.variants ?? {}) as Array<[VariantSlot, unknown[] | undefined]>) {
    if (models === undefined) continue;
    const def = defOf(slot);
    const frame = variantFrame(def);
    const used = slots.filter((s) => s.slot === slot);
    if (used.length === 0) {
      const materials = materialsFor(slot);
      if (materials.length > 0) {
        itemExport.report('warning', 'plan.variantWrongMaterial', { materials: materials.join(' / '), material }, [frame]);
      } else {
        itemExport.report('warning', 'ce.variantUnsupported', {}, [frame]);
      }
      continue;
    }
    if (!mainKey) {
      itemExport.report('error', 'plan.variantNeedsMainModel', {}, [frame]);
      continue;
    }
    if (models.length === 0) {
      itemExport.report('warning', 'plan.variantEmpty', {}, [frame]);
      continue;
    }
    if (models.length > used.length) {
      itemExport.report('info', 'ce.variantExtraModels', { used: used.length, count: models.length - used.length }, [frame]);
    }
    for (const { index } of used) {
      const model = item.variants?.[slot]?.[index];
      if (!model) continue;
      const suffix = variantPathSuffix(def, index);
      written.set(`${slot}:${index}`, itemExport.writeModel(model, `${itemExport.modelPath}-${suffix}`, variantFrame(def, suffix)).key);
    }
  }

  if (!mainKey || written.size === 0) return null;
  const list = [mainKey, ...slots.map((s) => written.get(`${s.slot}:${s.index}`) ?? mainKey)];
  if (written.size < slots.length) itemExport.report('info', 'ce.variantSlotsFilled', { count: list.length, material });
  return list;
}
