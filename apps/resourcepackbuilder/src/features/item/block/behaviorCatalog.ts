/**
 * The "Add a block behavior" catalog: every behavior of CraftEngine's block behavior catalog, with the editor's own
 * name where it has a preset for the behavior, the common ones marked, the categories in a fixed order, and a preview
 * of exactly what adding it writes (a preset's behavior, support behaviors and states, or one further behavior).
 */
import { addsBlockBehaviorPreset, blockBehaviorForm, CE_BLOCK_BEHAVIORS } from '@resourcepackbuilder/core/craftEngine';
import { toYaml } from '@resourcepackbuilder/core/yaml';
import { type CatalogData, type CatalogText, catalogFromTypedSource } from '../../../components/catalog';

/** The block behavior catalog as a typed source. */
export const BLOCK_BEHAVIOR_SOURCE = { types: () => CE_BLOCK_BEHAVIORS };

/** Behaviors most blocks are made of; listed under "Common" and first in their category. */
export const COMMON_BLOCK_BEHAVIORS: readonly string[] = [
  'crop_block',
  'sapling_block',
  'leaves_block',
  'slab_block',
  'stairs_block',
  'fence_block',
  'door_block',
  'trapdoor_block',
  'lamp_block',
  'falling_block',
  'simple_storage_block',
  'seat_block',
];

/** The order of the catalog's categories (anything else follows, "Other" last). */
export const BLOCK_BEHAVIOR_CATEGORY_ORDER: readonly string[] = [
  'plants',
  'building',
  'interaction',
  'redstone',
  'light',
  'storage',
  'physics',
  'placement',
];

export interface BlockBehaviorCatalogOptions {
  text: CatalogText;
  /** The block the behaviors are added to (decides whether a preset applies) */
  block: Record<string, unknown>;
  /** The item's key, which presets use for the ids they write */
  itemKey: string;
  /** The editor's name of a behavior it has a preset for, undefined for the others */
  presetName: (type: string) => string | undefined;
  /** The note of a behavior whose preset adding it applies */
  presetNote: string;
}

const rank = (category: string) => {
  const index = BLOCK_BEHAVIOR_CATEGORY_ORDER.indexOf(category);
  return index === -1 ? BLOCK_BEHAVIOR_CATEGORY_ORDER.length : index;
};

/** The YAML adding a behavior of `type` to the block writes. */
export function blockBehaviorPreview(block: Record<string, unknown>, type: string, itemKey: string): string {
  const form = blockBehaviorForm(type);
  if (!form || !addsBlockBehaviorPreset(block, type)) return toYaml({ behaviors: [{ type }] });
  const { behavior, behaviors, states } = form.preset(itemKey);
  return toYaml({ behavior, ...(behaviors && { behaviors }), ...(states && { states }) });
}

/** The catalog of block behaviors for the block; the types it has are marked "Added". */
export function blockBehaviorCatalog(
  { text, block, itemKey, presetName, presetNote }: BlockBehaviorCatalogOptions,
  added: Iterable<string>,
): CatalogData {
  const data = catalogFromTypedSource(BLOCK_BEHAVIOR_SOURCE, { text, target: 'craftengine', added });
  const items = data.items.map((item) => {
    const name = presetName(item.id);
    const preset = addsBlockBehaviorPreset(block, item.id);
    return {
      ...item,
      // The editor's name; the type's readable id stays searchable
      ...(name && { label: name, aliases: [...(item.aliases ?? []), item.label] }),
      ...(COMMON_BLOCK_BEHAVIORS.includes(item.id) && { common: true }),
      ...(preset && { note: presetNote }),
      preview: blockBehaviorPreview(block, item.id, itemKey),
    };
  });
  const categories = [...data.categories].sort((a, b) => rank(a.id) - rank(b.id));
  return { items, categories };
}
