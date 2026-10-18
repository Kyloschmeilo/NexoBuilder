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
  humanoid_baby?: string;
  elytra?: string;
  mob?: Record<string, string>;
  saddles?: Record<string, string>;
  /** Second texture per player/elytra layer, drawn over the first and never dyed (key = layer key) */
  overlays?: Record<string, string>;
  /** The layers take the item's dye color (`dyeable`) */
  dyeable?: boolean;
  /** Color of dyeable layers while the item is not dyed, as "R, G, B" (`dyeable.color_when_undyed`) */
  color_when_undyed?: string;
  /** Elytra wings show the player's own elytra or cape texture (`use_player_texture`) */
  use_player_texture?: boolean;
  /** CraftEngine: how the equipment is made; `trim` works from 1.20 on, player armor layers only */
  type?: ArmorEquipmentType;
};

/** CraftEngine's equipment types: the equippable component (1.21.2+) or an armor trim (1.20+). */
export type ArmorEquipmentType = 'component' | 'trim';
export const ARMOR_EQUIPMENT_TYPES: ArmorEquipmentType[] = ['component', 'trim'];

/** Layer keys that can have an overlay texture (see {@link ArmorSettings.overlays}). */
export const ARMOR_OVERLAY_KEYS = ['layer1', 'layer2', 'humanoid_baby', 'elytra'] as const;

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
  ({ section: null; key: 'layer1' | 'layer2' | 'humanoid_baby' | 'elytra' } | { section: ArmorSection; key: string });

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
    key: 'humanoid_baby',
    equipment: 'humanoid_baby',
    label: 'armor.layers.humanoidBaby',
    group: 'player',
    slot: 'HEAD',
    minVersion: '26.1',
    help: true,
  },
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

/** The overlay texture reference of a player or elytra layer, if set. */
export function armorOverlayTexture(settings: ArmorSettings, layer: ArmorLayerDef): string | undefined {
  return layer.section ? undefined : settings.overlays?.[layer.key];
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
  const overlays = isPlainObject(source.overlays) ? source.overlays : {};
  for (const key of ARMOR_OVERLAY_KEYS) {
    const texture = overlays[key];
    if (typeof texture === 'string' && texture) settings.overlays = { ...settings.overlays, [key]: texture };
  }
  if (typeof source.dyeable === 'boolean') settings.dyeable = source.dyeable;
  if (typeof source.color_when_undyed === 'string' && source.color_when_undyed) settings.color_when_undyed = source.color_when_undyed;
  if (typeof source.use_player_texture === 'boolean') settings.use_player_texture = source.use_player_texture;
  if (source.type === 'component' || source.type === 'trim') settings.type = source.type;
  return settings;
}

/**
 * A color "R, G, B" as the signed ARGB integer (fully opaque) that equipment models and CraftEngine read; null when
 * the text is no such color.
 */
export function armorColorInt(text: string): number | null {
  const match = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/.exec(text);
  if (!match) return null;
  const [r, g, b] = [match[1], match[2], match[3]].map(Number);
  if (r > 255 || g > 255 || b > 255) return null;
  return 0xff000000 | (r << 16) | (g << 8) | b | 0;
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
