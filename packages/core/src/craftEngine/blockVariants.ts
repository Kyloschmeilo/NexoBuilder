/**
 * Editing a CraftEngine block's states beyond their properties: the settings a variant overrides, the vanilla state
 * an appearance takes (an `auto_state` group, one shared by id, or an exact vanilla state), the fixed internal id,
 * the details of an appearance's model (textures shorthand, z rotation, uvlock, a weighted list of models) and the
 * property names CraftEngine fills in on placement.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, resolveFields, type ConfigPropertyDef } from '../form/build';
import type { ObjectField, ObjectListField } from '../form/fields';
import type { ConfigObject } from '../project/types';
import { CE_DEFAULT_AUTO_STATE } from './block';
import { CE_BLOCK_SETTINGS_PROPERTIES } from './form/schema/blockSettings';

/* ====================================================================== Variant settings */

/** Settings a variant does not take: the templates belong to the block's own settings. */
const BLOCK_ONLY_SETTINGS = new Set(['block.settings.template', 'block.settings.arguments']);

/** Where a variant's settings live in the item config. */
export const variantSettingsPath = (variantKey: string): string[] => ['block', 'states', 'variants', variantKey, 'settings'];

/**
 * The block settings at a variant (`states.variants.<key>.settings`), which CraftEngine merges over the block's
 * settings for the states the variant matches. Texts and docs are those of the block's settings.
 */
export function variantSettingsProperties(variantKey: string): ConfigPropertyDef[] {
  const base = variantSettingsPath(variantKey);
  return CE_BLOCK_SETTINGS_PROPERTIES.flatMap((def) => {
    if (def.storage !== 'config' || BLOCK_ONLY_SETTINGS.has(def.id)) return [];
    const path = [...base, ...def.path.slice(2)];
    return [{ ...def, id: path.join('.'), path }];
  });
}

/* ====================================================================== Vanilla state of an appearance */

/** Where an appearance's vanilla state comes from: a group (shared by `id` when set) or an exact vanilla state. */
export type AppearanceStateSource = { kind: 'auto'; group: string; id: string | null } | { kind: 'state'; state: string };

/** The source of an appearance's vanilla state; an appearance with neither counts as a group without a name. */
export function appearanceStateSource(look: Record<string, unknown>): AppearanceStateSource {
  const auto = look.auto_state;
  if (auto === undefined && typeof look.state === 'string') return { kind: 'state', state: look.state };
  if (typeof auto === 'string') return { kind: 'auto', group: auto, id: null };
  if (isPlainObject(auto)) {
    return { kind: 'auto', group: typeof auto.type === 'string' ? auto.type : '', id: auto.id === undefined ? null : String(auto.id) };
  }
  return { kind: 'auto', group: '', id: null };
}

/**
 * The appearance sharing its group's state with the other appearances of the same id (`{ type, id }`); an empty id
 * goes back to the simple form.
 */
export function withAutoStateId(look: ConfigObject, id: string): ConfigObject {
  const source = appearanceStateSource(look);
  const group = source.kind === 'auto' && source.group ? source.group : CE_DEFAULT_AUTO_STATE;
  return { ...look, auto_state: id.trim() === '' ? group : { type: group, id } };
}

/**
 * The appearance on an exact vanilla state (`minecraft:note_block[note=0]` or a mapped `note_block:0`) instead of
 * a group; null goes back to the default group. CraftEngine reads `auto_state` first, so only one of them stays.
 */
export function withExactState(look: ConfigObject, state: string | null): ConfigObject {
  const { auto_state: _auto, state: _state, ...rest } = look;
  return state === null ? { auto_state: CE_DEFAULT_AUTO_STATE, ...rest } : { state, ...rest };
}

/**
 * A `state` or `states` with a fixed internal id (multi-state blocks take the ids from it on, one per internal
 * state); undefined removes it, so CraftEngine picks free ids.
 */
export function withFixedId(target: ConfigObject, id: number | undefined): ConfigObject {
  const { id: _id, ...rest } = target;
  return id === undefined ? rest : { id, ...rest };
}

/* ====================================================================== Model details */

const rotation = (minVersion?: string) =>
  field.number({ integer: true, min: 0, max: 270, step: 90, ...(minVersion && { minVersion, help: true }) });

const [modelField, modelsField] = resolveFields(
  {
    model: field.object({
      textures: field.stringList({ placeholder: true, help: true }),
      z: rotation('1.21.11'),
      uvlock: field.boolean({ defaultHint: false, help: true }),
    }),
    models: field.objectList(
      {
        path: field.text({ format: 'resource', placeholder: true }),
        weight: field.number({ integer: true, min: 1 }),
        x: rotation(),
        y: rotation(),
        z: rotation('1.21.11'),
        uvlock: field.boolean({ defaultHint: false }),
      },
      { titleKey: 'path', newItem: () => ({ path: '', weight: 1 }), help: true },
    ),
  },
  'blockStates',
);

/**
 * The keys of an appearance's `model` the compact row leaves out: the textures CraftEngine builds the model from
 * (1 cube_all, 2 cube_column, 3 cube_bottom_top, 4 orientable, 5 or more one per face; `^` marks the particle
 * texture), the rotation around z and uvlock. Messages at `blockStates.fields.model` of ceSchema.
 */
export const CE_APPEARANCE_MODEL_FIELD = modelField as ObjectField;

/** An appearance's `models`: several models, one picked at random by weight per placed block. */
export const CE_APPEARANCE_MODELS_FIELD = modelsField as ObjectListField;

/* ====================================================================== Property names */

/** Property names CraftEngine sets on placement (states/properties, hard-coded names), with the types they work with. */
const PROPERTY_NAME_TYPES: Record<string, string[]> = {
  axis: ['axis'],
  facing: ['direction', 'horizontal_direction'],
  facing_clockwise: ['horizontal_direction'],
  rotation: ['int'],
  waterlogged: ['boolean'],
};

/** The property names CraftEngine fills in on placement. */
export const CE_PLACEMENT_PROPERTY_NAMES = Object.keys(PROPERTY_NAME_TYPES);

/** Whether a property's name is one CraftEngine fills in, and whether its type works for it; null for other names. */
export function propertyNameHint(name: string, type: string | undefined): { name: string; fits: boolean } | null {
  const types = Object.hasOwn(PROPERTY_NAME_TYPES, name) ? PROPERTY_NAME_TYPES[name] : undefined;
  return types ? { name, fits: type !== undefined && types.includes(type) } : null;
}
