/**
 * What an item model definition can hold (minecraft.wiki "Items model definition", checked against the CraftEngine
 * wiki and source): the keys of each node type, the properties `condition`, `select` and `range_dispatch` read with
 * their own keys, the special models, the tint sources and the transformation. The editor builds its fields from it,
 * the validation checks a tree against it, and every text is a message key in the `schema` namespace (`itemModel.*`).
 */
import { keySegment } from '@resourcepackbuilder/utils';
import type { ConfigValue } from '../types';
import { ITEM_MODEL_ROOT_KEYS, ITEM_MODEL_TYPES, type ItemModelType } from './types';

/** How the editor shows a key and how the validation checks it. */
export type ItemModelParamKind = 'text' | 'resource' | 'integer' | 'number' | 'boolean' | 'enum' | 'color' | 'json';

/** A key of a node, a property, a special model or a tint source. */
export interface ItemModelParam {
  key: string;
  kind: ItemModelParamKind;
  /** The values an `enum` key takes */
  options?: readonly string[];
  /** Minecraft needs the key (the validation reports a node without it) */
  required?: boolean;
  /** The value the editor fills in when the node (or property) is picked */
  initial?: ConfigValue;
  /** First Minecraft version that reads the key */
  minVersion?: string;
}

/** A property of `condition`, `select` or `range_dispatch`, a special model or a tint source: its id and keys. */
export interface ItemModelVariantDef {
  /** e.g. `minecraft:local_time` */
  id: string;
  params: ItemModelParam[];
  /** First Minecraft version that knows it */
  minVersion?: string;
  /** First Minecraft version that no longer knows it */
  removedIn?: string;
  /** `select`: the values its cases usually match (suggestions; others are allowed) */
  values?: readonly string[];
}

/** The node types that read a property. */
export type ItemModelPropertyKind = 'condition' | 'select' | 'range_dispatch';

/** A node type: its own keys, whether it takes a transformation, and its children. */
export interface ItemModelTypeDef {
  type: ItemModelType;
  params: ItemModelParam[];
  /** Reads a property (`property` plus that property's keys) */
  property?: ItemModelPropertyKind;
  /** Takes `transformation` (26.1+) */
  transformation: boolean;
  /** Takes `tints` */
  tints?: boolean;
  /** Takes a special model under `model` */
  special?: boolean;
}

/** First Minecraft version with `transformation` on a node. */
export const ITEM_MODEL_TRANSFORMATION_VERSION = '26.1';

/** The versions that introduced keys at the root of the definition. */
export const ITEM_MODEL_ROOT_VERSIONS: Partial<Record<(typeof ITEM_MODEL_ROOT_KEYS)[number], string>> = {
  oversized_in_gui: '1.21.6',
  swap_animation_scale: '1.21.11',
};

/** The keys a node of each type has (besides `type`, its children, `tints` and `transformation`). */
export const ITEM_MODEL_TYPE_DEFS: Record<ItemModelType, ItemModelTypeDef> = {
  'minecraft:model': {
    type: 'minecraft:model',
    params: [{ key: 'model', kind: 'resource', required: true }],
    transformation: true,
    tints: true,
  },
  'minecraft:composite': { type: 'minecraft:composite', params: [], transformation: true },
  'minecraft:condition': { type: 'minecraft:condition', params: [], property: 'condition', transformation: true },
  'minecraft:select': { type: 'minecraft:select', params: [], property: 'select', transformation: true },
  'minecraft:range_dispatch': {
    type: 'minecraft:range_dispatch',
    params: [{ key: 'scale', kind: 'number' }],
    property: 'range_dispatch',
    transformation: true,
  },
  'minecraft:special': {
    type: 'minecraft:special',
    params: [{ key: 'base', kind: 'resource', required: true }],
    transformation: true,
    special: true,
  },
  'minecraft:empty': { type: 'minecraft:empty', params: [], transformation: false },
  'minecraft:bundle/selected_item': { type: 'minecraft:bundle/selected_item', params: [], transformation: false },
};

const prop = (id: string, params: ItemModelParam[] = [], extra: Partial<ItemModelVariantDef> = {}): ItemModelVariantDef => ({
  id: `minecraft:${id}`,
  params,
  ...extra,
});

const INDEX: ItemModelParam = { key: 'index', kind: 'integer', initial: 0 };

/** The display contexts a `select` on `display_context` matches */
export const DISPLAY_CONTEXTS = [
  'none',
  'thirdperson_lefthand',
  'thirdperson_righthand',
  'firstperson_lefthand',
  'firstperson_righthand',
  'head',
  'gui',
  'ground',
  'fixed',
  'on_shelf',
] as const;

/** The 16 dye colors (banner) */
export const DYE_COLORS = [
  'white',
  'orange',
  'magenta',
  'light_blue',
  'yellow',
  'lime',
  'pink',
  'gray',
  'light_gray',
  'cyan',
  'purple',
  'blue',
  'brown',
  'green',
  'red',
  'black',
] as const;

/** The properties of each property-reading node type, with their own keys. */
export const ITEM_MODEL_PROPERTIES: Record<ItemModelPropertyKind, ItemModelVariantDef[]> = {
  condition: [
    prop('broken'),
    prop('bundle/has_selected_item'),
    prop('carried'),
    prop(
      'component',
      [
        { key: 'predicate', kind: 'text', required: true, initial: 'minecraft:damage' },
        { key: 'value', kind: 'json', required: true, initial: {} },
      ],
      { minVersion: '1.21.5' },
    ),
    prop('custom_model_data', [INDEX]),
    prop('damaged'),
    prop('extended_view'),
    prop('fishing_rod/cast'),
    prop('has_component', [
      { key: 'component', kind: 'text', required: true, initial: 'minecraft:enchantments' },
      { key: 'ignore_default', kind: 'boolean' },
    ]),
    prop('keybind_down', [{ key: 'keybind', kind: 'text', required: true, initial: 'key.use' }]),
    prop('selected'),
    prop('using_item'),
    prop('view_entity'),
  ],
  select: [
    prop('block_state', [{ key: 'block_state_property', kind: 'text', required: true, initial: 'facing' }]),
    prop('charge_type', [], { values: ['none', 'arrow', 'rocket'] }),
    prop('component', [{ key: 'component', kind: 'text', required: true, initial: 'minecraft:custom_name' }], {
      minVersion: '1.21.5',
    }),
    prop('context_dimension', [], { values: ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'] }),
    prop('context_entity_type'),
    prop('custom_model_data', [INDEX]),
    prop('display_context', [], { values: DISPLAY_CONTEXTS }),
    prop('local_time', [
      { key: 'pattern', kind: 'text', required: true, initial: 'MM' },
      { key: 'locale', kind: 'text' },
      { key: 'time_zone', kind: 'text' },
    ]),
    prop('main_hand', [], { values: ['left', 'right'] }),
    prop('trim_material'),
  ],
  range_dispatch: [
    prop('bundle/fullness'),
    prop('compass', [
      { key: 'target', kind: 'enum', options: ['spawn', 'lodestone', 'recovery', 'none'], required: true, initial: 'spawn' },
      { key: 'wobble', kind: 'boolean' },
    ]),
    prop('cooldown'),
    prop('count', [{ key: 'normalize', kind: 'boolean' }]),
    prop('crossbow/pull'),
    prop('custom_model_data', [INDEX]),
    prop('damage', [{ key: 'normalize', kind: 'boolean' }]),
    prop('time', [
      { key: 'source', kind: 'enum', options: ['daytime', 'moon_phase', 'random'], required: true, initial: 'daytime' },
      { key: 'wobble', kind: 'boolean' },
    ]),
    prop('use_cycle', [{ key: 'period', kind: 'number', initial: 1 }]),
    prop('use_duration', [{ key: 'remaining', kind: 'boolean' }]),
  ],
};

const OPENNESS: ItemModelParam = { key: 'openness', kind: 'number' };

/** The special models a `special` node renders (its `model`), with their keys. */
export const ITEM_MODEL_SPECIAL_TYPES: ItemModelVariantDef[] = [
  prop('banner', [
    { key: 'color', kind: 'enum', options: DYE_COLORS, required: true, initial: 'white' },
    { key: 'attachment', kind: 'enum', options: ['ground', 'wall'], minVersion: '26.1' },
  ]),
  prop('bed', [{ key: 'texture', kind: 'resource', required: true, initial: 'minecraft:red' }], { removedIn: '26.2' }),
  prop('bell', [], { minVersion: '26.1' }),
  prop(
    'book',
    [
      { key: 'open_angle', kind: 'number' },
      { key: 'page1', kind: 'number' },
      { key: 'page2', kind: 'number' },
    ],
    { minVersion: '26.1' },
  ),
  prop('chest', [
    { key: 'texture', kind: 'resource', required: true, initial: 'minecraft:normal' },
    OPENNESS,
    { key: 'chest_type', kind: 'enum', options: ['single', 'left', 'right'], minVersion: '26.1' },
  ]),
  prop('conduit'),
  prop(
    'copper_golem_statue',
    [
      { key: 'pose', kind: 'enum', options: ['standing', 'sitting', 'running', 'star'], required: true, initial: 'standing' },
      { key: 'texture', kind: 'resource', required: true, initial: 'minecraft:textures/entity/copper_golem/copper_golem.png' },
    ],
    { minVersion: '1.21.9' },
  ),
  prop('decorated_pot'),
  prop('end_cube', [{ key: 'effect', kind: 'enum', options: ['portal', 'gateway'], required: true, initial: 'portal' }], {
    minVersion: '26.1',
  }),
  prop(
    'hanging_sign',
    [
      { key: 'wood_type', kind: 'text', required: true, initial: 'oak' },
      { key: 'texture', kind: 'resource' },
    ],
    { removedIn: '26.2' },
  ),
  prop('head', [
    {
      key: 'kind',
      kind: 'enum',
      options: ['skeleton', 'wither_skeleton', 'player', 'zombie', 'creeper', 'piglin', 'dragon'],
      required: true,
      initial: 'skeleton',
    },
    { key: 'texture', kind: 'resource' },
    { key: 'animation', kind: 'number' },
  ]),
  prop('player_head', [], { minVersion: '1.21.6' }),
  prop('shield'),
  prop('shulker_box', [
    { key: 'texture', kind: 'resource', required: true, initial: 'minecraft:shulker' },
    OPENNESS,
    { key: 'orientation', kind: 'enum', options: ['down', 'up', 'north', 'south', 'west', 'east'] },
  ]),
  prop(
    'standing_sign',
    [
      { key: 'wood_type', kind: 'text', required: true, initial: 'oak' },
      { key: 'texture', kind: 'resource' },
    ],
    { removedIn: '26.2' },
  ),
  prop('trident'),
];

const DEFAULT_COLOR: ItemModelParam = { key: 'default', kind: 'color', required: true, initial: 16777215 };

/** The tint sources of a `model` node's `tints` (list index = `tintindex`). */
export const ITEM_MODEL_TINT_TYPES: ItemModelVariantDef[] = [
  prop('constant', [{ key: 'value', kind: 'color', required: true, initial: 16777215 }]),
  prop('custom_model_data', [INDEX, DEFAULT_COLOR]),
  prop('dye', [DEFAULT_COLOR]),
  prop('firework', [DEFAULT_COLOR]),
  prop('grass', [
    { key: 'temperature', kind: 'number', required: true, initial: 0.5 },
    { key: 'downfall', kind: 'number', required: true, initial: 1 },
  ]),
  prop('map_color', [DEFAULT_COLOR]),
  prop('potion', [DEFAULT_COLOR]),
  prop('team', [DEFAULT_COLOR]),
];

/** The decomposed transformation (26.1+): vectors of 3 and quaternions of 4 numbers. */
export const ITEM_MODEL_TRANSFORMATION_KEYS = [
  { key: 'translation', size: 3, identity: [0, 0, 0] },
  { key: 'left_rotation', size: 4, identity: [0, 0, 0, 1] },
  { key: 'scale', size: 3, identity: [1, 1, 1] },
  { key: 'right_rotation', size: 4, identity: [0, 0, 0, 1] },
] as const;

/** The id without the `minecraft:` namespace (`minecraft:fishing_rod/cast` → `fishing_rod/cast`). */
export const shortId = (id: string): string => id.replace(/^minecraft:/, '');

/** The full id of a node type, property, special model or tint source (`model` → `minecraft:model`). */
export const fullId = (id: string): string => (id.includes(':') ? id : `minecraft:${id}`);

/** The definition of a node type, or undefined for an unknown type. */
export function itemModelTypeDef(type: string): ItemModelTypeDef | undefined {
  return (ITEM_MODEL_TYPE_DEFS as Record<string, ItemModelTypeDef>)[fullId(type)];
}

/** The property of a property-reading node type, or undefined for an unknown one. */
export function itemModelProperty(kind: ItemModelPropertyKind, id: string): ItemModelVariantDef | undefined {
  return ITEM_MODEL_PROPERTIES[kind].find((def) => def.id === fullId(id));
}

/** A special model by id. */
export function itemModelSpecialType(id: string): ItemModelVariantDef | undefined {
  return ITEM_MODEL_SPECIAL_TYPES.find((def) => def.id === fullId(id));
}

/** A tint source by id. */
export function itemModelTintType(id: string): ItemModelVariantDef | undefined {
  return ITEM_MODEL_TINT_TYPES.find((def) => def.id === fullId(id));
}

const PROPERTY_SCOPES: Record<ItemModelPropertyKind, string> = {
  condition: 'condition',
  select: 'select',
  range_dispatch: 'rangeDispatch',
};

/** Message keys (`schema` namespace) of the tree's texts. */
export const itemModelMessages = {
  typeLabel: (type: string) => `itemModel.types.${keySegment(shortId(type))}.label`,
  typeDescription: (type: string) => `itemModel.types.${keySegment(shortId(type))}.description`,
  property: (kind: ItemModelPropertyKind, id: string) => `itemModel.properties.${PROPERTY_SCOPES[kind]}.${keySegment(shortId(id))}`,
  special: (id: string) => `itemModel.special.${keySegment(shortId(id))}`,
  tint: (id: string) => `itemModel.tints.${keySegment(shortId(id))}`,
  param: (key: string) => `itemModel.params.${keySegment(key)}`,
  transformation: (key: string) => `itemModel.transformation.${keySegment(key)}`,
};

/** The texts of the editor itself (buttons, headings, hints), in the `schema` namespace. */
export const ITEM_MODEL_UI_KEYS = [
  'title',
  'description',
  'create',
  'createHelp',
  'remove',
  'root',
  'rootHelp',
  'type',
  'property',
  'add',
  'addCase',
  'addEntry',
  'addModel',
  'addTint',
  'addWhen',
  'removeEntry',
  'moveUp',
  'moveDown',
  'when',
  'whenPlaceholder',
  'threshold',
  'cases',
  'entries',
  'models',
  'fallback',
  'noFallback',
  'addFallback',
  'onTrue',
  'onFalse',
  'tints',
  'specialModel',
  'transformation',
  'transformationHelp',
  'addTransformation',
  'useMainModel',
  'mainModelToken',
  'fromVersion',
  'removedIn',
  'docs',
  'unknownType',
  'unset',
  'valueHelp',
  'rootKeysHelp',
] as const;

/** Every message key the tree editor and its catalog use (checked against the catalogue by the tests). */
export function itemModelMessageKeys(): string[] {
  const keys = new Set<string>();
  for (const type of ITEM_MODEL_TYPES) {
    keys.add(itemModelMessages.typeLabel(type));
    keys.add(itemModelMessages.typeDescription(type));
  }
  const params: ItemModelParam[] = Object.values(ITEM_MODEL_TYPE_DEFS).flatMap((def) => def.params);
  for (const [kind, defs] of Object.entries(ITEM_MODEL_PROPERTIES) as Array<[ItemModelPropertyKind, ItemModelVariantDef[]]>) {
    for (const def of defs) {
      keys.add(itemModelMessages.property(kind, def.id));
      params.push(...def.params);
    }
  }
  for (const def of ITEM_MODEL_SPECIAL_TYPES) {
    keys.add(itemModelMessages.special(def.id));
    params.push(...def.params);
  }
  for (const def of ITEM_MODEL_TINT_TYPES) {
    keys.add(itemModelMessages.tint(def.id));
    params.push(...def.params);
  }
  for (const param of params) keys.add(itemModelMessages.param(param.key));
  for (const { key } of ITEM_MODEL_TRANSFORMATION_KEYS) keys.add(itemModelMessages.transformation(key));
  for (const key of ITEM_MODEL_ROOT_KEYS) keys.add(itemModelMessages.param(key));
  for (const key of ITEM_MODEL_UI_KEYS) keys.add(`itemModel.ui.${key}`);
  return [...keys];
}
