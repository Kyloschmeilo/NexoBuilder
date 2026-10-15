/**
 * Worn textures (equipment models): player armor, elytra wings, animal armor,
 * harnesses and saddles. All items with the same set ID share one equipment model
 * (assets/<ns>/equipment/<set>.json); the textures live under textures/entity/equipment/<layer>/.
 */
export type ArmorGroup = 'player' | 'elytra' | 'mob' | 'saddle';

export interface ArmorLayerDef {
  /** Path within $armor */
  path: string[];
  /** Layer type in the Minecraft equipment model */
  equipment: string;
  /** Message key in the `schema` namespace */
  label: string;
  group: ArmorGroup;
  /** Slot the item with this layer gets (if the material does not define one) */
  slot: 'HEAD' | 'CHEST' | 'BODY' | 'SADDLE';
  /** For animal armor and saddles: which animals may wear the item */
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
  { path: ['layer1'], equipment: 'humanoid', label: 'armor.layers.layer1', group: 'player', slot: 'HEAD', sizeHint: '64×32' },
  { path: ['layer2'], equipment: 'humanoid_leggings', label: 'armor.layers.layer2', group: 'player', slot: 'HEAD', sizeHint: '64×32' },
  { path: ['elytra'], equipment: 'wings', label: 'armor.layers.elytra', group: 'elytra', slot: 'CHEST', minVersion: '1.21.2', sizeHint: '64×32' },
  { path: ['mob', 'wolf_armor'], equipment: 'wolf_body', label: 'armor.layers.wolfArmor', group: 'mob', slot: 'BODY', entities: ['WOLF'], minVersion: '1.21.2' },
  { path: ['mob', 'horse_armor'], equipment: 'horse_body', label: 'armor.layers.horseArmor', group: 'mob', slot: 'BODY', entities: ['HORSE'], minVersion: '1.21.2' },
  {
    path: ['mob', 'llama_armor'],
    equipment: 'llama_body',
    label: 'armor.layers.llamaArmor',
    group: 'mob',
    slot: 'BODY',
    entities: ['LLAMA', 'TRADER_LLAMA'],
    minVersion: '1.21.2',
  },
  {
    path: ['mob', 'nautilus_armor'],
    equipment: 'nautilus_body',
    label: 'armor.layers.nautilusArmor',
    group: 'mob',
    slot: 'BODY',
    entities: ['NAUTILUS', 'ZOMBIE_NAUTILUS'],
    minVersion: '1.21.11',
  },
  {
    path: ['mob', 'harness'],
    equipment: 'happy_ghast_body',
    label: 'armor.layers.harness',
    group: 'mob',
    slot: 'BODY',
    entities: ['HAPPY_GHAST'],
    minVersion: '1.21.6',
  },
  saddle('pig_saddle', 'armor.layers.pigSaddle', ['PIG']),
  saddle('strider_saddle', 'armor.layers.striderSaddle', ['STRIDER']),
  saddle('horse_saddle', 'armor.layers.horseSaddle', ['HORSE']),
  saddle('donkey_saddle', 'armor.layers.donkeySaddle', ['DONKEY']),
  saddle('mule_saddle', 'armor.layers.muleSaddle', ['MULE']),
  saddle('camel_saddle', 'armor.layers.camelSaddle', ['CAMEL']),
  saddle('skeleton_horse_saddle', 'armor.layers.skeletonHorseSaddle', ['SKELETON_HORSE']),
  saddle('zombie_horse_saddle', 'armor.layers.zombieHorseSaddle', ['ZOMBIE_HORSE']),
  saddle('nautilus_saddle', 'armor.layers.nautilusSaddle', ['NAUTILUS', 'ZOMBIE_NAUTILUS'], '1.21.11'),
  saddle('camel_husk_saddle', 'armor.layers.camelHuskSaddle', ['CAMEL_HUSK'], '1.21.11'),
];
