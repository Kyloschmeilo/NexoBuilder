/**
 * Getragene Texturen (Equipment-Modelle): Spieler-Rüstung, Elytra-Flügel, Tier-Rüstungen,
 * Geschirr und Sättel. Alle Items mit derselben Set-ID teilen sich ein Equipment-Modell
 * (assets/<ns>/equipment/<set>.json), die Texturen liegen unter textures/entity/equipment/<layer>/.
 */
export type ArmorGroup = 'player' | 'elytra' | 'mob' | 'saddle';

export interface ArmorLayerDef {
  /** Pfad innerhalb von $armor */
  path: string[];
  /** Layer-Typ im Equipment-Modell von Minecraft */
  equipment: string;
  label: string;
  group: ArmorGroup;
  /** Slot, den das Item mit diesem Layer bekommt (wenn das Material keinen festlegt) */
  slot: 'HEAD' | 'CHEST' | 'BODY' | 'SADDLE';
  /** Für Tier-Rüstungen und Sättel: welche Tiere das Item tragen dürfen */
  entities?: string[];
  minVersion?: string;
  sizeHint?: string;
}

const saddle = (key: string, label: string, entities: string[], minVersion = '1.21.5'): ArmorLayerDef => ({
  path: ['saddles', key],
  equipment: key,
  label,
  group: 'saddle',
  slot: 'SADDLE',
  entities,
  minVersion,
});

export const ARMOR_LAYERS: ArmorLayerDef[] = [
  { path: ['layer1'], equipment: 'humanoid', label: 'Layer 1', group: 'player', slot: 'HEAD', sizeHint: '64×32' },
  { path: ['layer2'], equipment: 'humanoid_leggings', label: 'Layer 2', group: 'player', slot: 'HEAD', sizeHint: '64×32' },
  { path: ['elytra'], equipment: 'wings', label: 'Elytra', group: 'elytra', slot: 'CHEST', minVersion: '1.21.2', sizeHint: '64×32' },
  { path: ['mob', 'wolf_armor'], equipment: 'wolf_body', label: 'Wolf Armor', group: 'mob', slot: 'BODY', entities: ['WOLF'], minVersion: '1.21.2' },
  { path: ['mob', 'horse_armor'], equipment: 'horse_body', label: 'Horse Armor', group: 'mob', slot: 'BODY', entities: ['HORSE'], minVersion: '1.21.2' },
  {
    path: ['mob', 'llama_armor'],
    equipment: 'llama_body',
    label: 'Llama Armor',
    group: 'mob',
    slot: 'BODY',
    entities: ['LLAMA', 'TRADER_LLAMA'],
    minVersion: '1.21.2',
  },
  {
    path: ['mob', 'nautilus_armor'],
    equipment: 'nautilus_body',
    label: 'Nautilus Armor',
    group: 'mob',
    slot: 'BODY',
    entities: ['NAUTILUS', 'ZOMBIE_NAUTILUS'],
    minVersion: '1.21.11',
  },
  {
    path: ['mob', 'harness'],
    equipment: 'happy_ghast_body',
    label: 'Harness',
    group: 'mob',
    slot: 'BODY',
    entities: ['HAPPY_GHAST'],
    minVersion: '1.21.6',
  },
  saddle('pig_saddle', 'Pig Saddle', ['PIG']),
  saddle('strider_saddle', 'Strider Saddle', ['STRIDER']),
  saddle('horse_saddle', 'Horse Saddle', ['HORSE']),
  saddle('donkey_saddle', 'Donkey Saddle', ['DONKEY']),
  saddle('mule_saddle', 'Mule Saddle', ['MULE']),
  saddle('camel_saddle', 'Camel Saddle', ['CAMEL']),
  saddle('skeleton_horse_saddle', 'Skeleton Horse Saddle', ['SKELETON_HORSE']),
  saddle('zombie_horse_saddle', 'Zombie Horse Saddle', ['ZOMBIE_HORSE']),
  saddle('nautilus_saddle', 'Nautilus Saddle', ['NAUTILUS', 'ZOMBIE_NAUTILUS'], '1.21.11'),
  saddle('camel_husk_saddle', 'Camel Husk Saddle', ['CAMEL_HUSK'], '1.21.11'),
];
