/**
 * Worn textures (equipment models): player armor, elytra wings, animal armor,
 * harnesses and saddles. All items with the same set ID share one equipment model
 * (assets/<ns>/equipment/<set>.json); the textures live under textures/entity/equipment/<layer>/.
 */
import { isPlainObject, keySegment } from '@resourcepackbuilder/utils';

export type ArmorGroup = 'player' | 'elytra' | 'mob' | 'saddle';

/** Nested objects of the armor settings that group several layers */
export type ArmorSection = 'mob' | 'saddles';

/**
 * Armor settings of an item (`item.armor`). Texture values are asset references ("@asset:<id>").
 * A type alias (not an interface) so it stays assignable to `ConfigValue` for the generic form.
 */
export type ArmorSettings = {
  /** Set ID: all items with the same ID share one equipment model */
  set: string;
  layer1?: string;
  layer2?: string;
  elytra?: string;
  mob?: Record<string, string>;
  saddles?: Record<string, string>;
};

interface ArmorLayerBase {
  /** Layer type in the Minecraft equipment model */
  equipment: string;
  /** Message key in the `schema` namespace (`armor.layers.<camel(key)>`) */
  label: string;
  group: ArmorGroup;
  /** Slot the item with this layer gets (if the material does not define one) */
  slot: 'HEAD' | 'CHEST' | 'BODY' | 'SADDLE';
  /** For animal armor and saddles: which animals may wear the item */
  entities?: string[];
  minVersion?: string;
  sizeHint?: string;
  /** The settings field of this layer has a help text */
  help?: boolean;
}

/** What the item configuration needs to know about the item's armor set (see export/equipment). */
export interface ItemArmor {
  /** Equipment asset (namespace:set) */
  assetId: string;
  /** From the set's layers (elytra → CHEST, animal armor → BODY, saddle → SADDLE); null = from the material */
  slot: string | null;
  entities: string[];
  /** Elytra wings: the item needs the glider component */
  glider: boolean;
}

/** Where the layer's texture lives in {@link ArmorSettings}: `settings[key]` or `settings[section][key]`. */
export type ArmorLayerDef = ArmorLayerBase &
  ({ section: null; key: 'layer1' | 'layer2' | 'elytra' } | { section: ArmorSection; key: string });

type LayerOptions = Omit<ArmorLayerBase, 'label' | 'group' | 'slot' | 'equipment'>;

const player = (key: 'layer1' | 'layer2', equipment: string): ArmorLayerDef => ({
  section: null,
  key,
  equipment,
  label: `armor.layers.${keySegment(key)}`,
  group: 'player',
  slot: 'HEAD',
  sizeHint: '64×32',
  help: true,
});

const mob = (key: string, equipment: string, options: LayerOptions): ArmorLayerDef => ({
  section: 'mob',
  key,
  equipment,
  label: `armor.layers.${keySegment(key)}`,
  group: 'mob',
  slot: 'BODY',
  ...options,
});

const saddle = (key: string, entities: string[], minVersion = '1.21.5'): ArmorLayerDef => ({
  section: 'saddles',
  key,
  equipment: key,
  label: `armor.layers.${keySegment(key)}`,
  group: 'saddle',
  slot: 'SADDLE',
  entities,
  minVersion,
});

/** The order is the order of the layers in the equipment model and of the allowed entities. */
export const ARMOR_LAYERS: ArmorLayerDef[] = [
  player('layer1', 'humanoid'),
  player('layer2', 'humanoid_leggings'),
  {
    section: null,
    key: 'elytra',
    equipment: 'wings',
    label: 'armor.layers.elytra',
    group: 'elytra',
    slot: 'CHEST',
    minVersion: '1.21.2',
    sizeHint: '64×32',
    help: true,
  },
  mob('wolf_armor', 'wolf_body', { entities: ['WOLF'], minVersion: '1.21.2', help: true }),
  mob('horse_armor', 'horse_body', { entities: ['HORSE'], minVersion: '1.21.2', help: true }),
  mob('llama_armor', 'llama_body', { entities: ['LLAMA', 'TRADER_LLAMA'], minVersion: '1.21.2', help: true }),
  mob('nautilus_armor', 'nautilus_body', { entities: ['NAUTILUS', 'ZOMBIE_NAUTILUS'], minVersion: '1.21.11' }),
  mob('harness', 'happy_ghast_body', { entities: ['HAPPY_GHAST'], minVersion: '1.21.6' }),
  saddle('pig_saddle', ['PIG']),
  saddle('strider_saddle', ['STRIDER']),
  saddle('horse_saddle', ['HORSE']),
  saddle('donkey_saddle', ['DONKEY']),
  saddle('mule_saddle', ['MULE']),
  saddle('camel_saddle', ['CAMEL']),
  saddle('skeleton_horse_saddle', ['SKELETON_HORSE']),
  saddle('zombie_horse_saddle', ['ZOMBIE_HORSE']),
  saddle('nautilus_saddle', ['NAUTILUS', 'ZOMBIE_NAUTILUS'], '1.21.11'),
  saddle('camel_husk_saddle', ['CAMEL_HUSK'], '1.21.11'),
];

/** The texture reference ("@asset:<id>") of a layer, if set. */
export function armorTexture(settings: ArmorSettings, layer: ArmorLayerDef): string | undefined {
  return layer.section ? settings[layer.section]?.[layer.key] : settings[layer.key];
}

/** Reads armor settings from untyped data (form values, stored `$armor` objects); unknown keys are dropped. */
export function toArmorSettings(value: unknown): ArmorSettings {
  const source = isPlainObject(value) ? value : {};
  const settings: ArmorSettings = { set: typeof source.set === 'string' ? source.set : '' };
  for (const layer of ARMOR_LAYERS) {
    const container = layer.section ? source[layer.section] : source;
    const texture = isPlainObject(container) ? container[layer.key] : undefined;
    if (typeof texture !== 'string' || !texture) continue;
    if (layer.section) settings[layer.section] = { ...settings[layer.section], [layer.key]: texture };
    else settings[layer.key] = texture;
  }
  return settings;
}

/** Determines the equipment slot from the material. */
export function slotForMaterial(material: string): string | null {
  const m = material.toUpperCase();
  if (m.endsWith('_HELMET') || m === 'CARVED_PUMPKIN' || m.endsWith('_HEAD') || m.endsWith('_SKULL')) return 'HEAD';
  if (m.endsWith('_CHESTPLATE') || m === 'ELYTRA') return 'CHEST';
  if (m.endsWith('_LEGGINGS')) return 'LEGS';
  if (m.endsWith('_BOOTS')) return 'FEET';
  if (m.endsWith('_HORSE_ARMOR') || m === 'WOLF_ARMOR' || m.endsWith('_NAUTILUS_ARMOR') || m.endsWith('_HARNESS')) return 'BODY';
  if (m === 'SADDLE') return 'SADDLE';
  return null;
}
