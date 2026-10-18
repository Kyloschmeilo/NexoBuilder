/**
 * CraftEngine's attribute system (experimental): custom attributes with a base value, modifiers from items and
 * equipment sets, and damage rules that read them. The plugin only runs it with `attribute.enable: true` in its
 * config.yml, which it reads on startup (AbstractAttributeManager; the test server sets it for projects that use it).
 *
 * CraftEngine reads the top-level sections `attribute(s)`, `attribute_operation(s)` and `equipment_set(s)` (each entry
 * under its id) and `damage_rule(s)` (damage type → list of rules; each parse replaces all rules, so the export writes
 * one section). Items join in with `settings.attribute_modifiers` and `settings.equipment_set_part`. The project keeps
 * its part as lists (`attributes` of `Project.craftEngine`): definitions, operations and equipment sets carry their
 * `id`, a damage rule its `damage_type`. The export writes them to configuration/attributes.yml.
 */
import { formatResourceLocation, POTION_EFFECT_NAMES } from '@resourcepackbuilder/minecraft';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, type FieldSpecs, resolveFields } from '../form/build';
import type { ObjectListField } from '../form/fields';
import { type Option, plainOptions } from '../form/options';
import { pruneValue } from '../form/prune';
import type { ConfigObject, ConfigValue, CraftEngineAttributeData, Project } from '../project/types';
import { CE_ATTRIBUTES, CE_ATTRIBUTE_OPERATIONS, CE_ATTRIBUTE_SLOTS } from './form/options';
import { CE_ATTRIBUTE_BASES, CE_ATTRIBUTE_SYNC_VALUES, CE_DAMAGE_EFFECTS, CE_DAMAGE_FORMULAS } from './logic';
import { functionList, gate, numberProvider } from './logic/shared';

/** The operations CraftEngine has built in; an attribute without `operations` runs them in this order */
export const CE_BUILTIN_ATTRIBUTE_OPERATIONS = ['minecraft:add_value', 'minecraft:add_multiplied_base', 'minecraft:add_multiplied_total'];

/** The physical slots an item counts in for an equipment set (`settings.equipment_set_part`; no slot groups) */
export const CE_EQUIPMENT_SET_SLOTS = ['mainhand', 'offhand', 'head', 'chest', 'legs', 'feet', 'body', 'saddle'];

/** Vanilla damage types, the keys of `damage_rules` */
export const CE_DAMAGE_TYPES = [
  'arrow',
  'bad_respawn_point',
  'cactus',
  'campfire',
  'cramming',
  'dragon_breath',
  'drown',
  'dry_out',
  'ender_pearl',
  'explosion',
  'fall',
  'falling_anvil',
  'falling_block',
  'falling_stalactite',
  'fireball',
  'fireworks',
  'fly_into_wall',
  'freeze',
  'generic',
  'generic_kill',
  'hot_floor',
  'in_fire',
  'in_wall',
  'indirect_magic',
  'lava',
  'lightning_bolt',
  'mace_smash',
  'magic',
  'mob_attack',
  'mob_attack_no_aggro',
  'mob_projectile',
  'on_fire',
  'out_of_world',
  'outside_border',
  'player_attack',
  'player_explosion',
  'sonic_boom',
  'spear',
  'spit',
  'stalagmite',
  'starve',
  'sting',
  'sweet_berry_bush',
  'thorns',
  'thrown',
  'trident',
  'unattributed_fireball',
  'wind_charge',
  'wither',
  'wither_skull',
].map((type) => `minecraft:${type}`);

/** The parts of the attribute system, by their key in `Project.craftEngine.attributes` */
export type AttributePart = keyof CraftEngineAttributeData;

/** The project's part of the attribute system ({} for a project without any). */
export const projectAttributeData = (project: Project): CraftEngineAttributeData => project.craftEngine?.attributes ?? {};

/** The entries of one part (an empty list when there are none). */
export const projectAttributeEntries = (project: Project, part: AttributePart): ConfigObject[] => projectAttributeData(project)[part] ?? [];

/** The id of an entry ('' without one). */
export const attributeEntryId = (entry: ConfigObject): string => (typeof entry.id === 'string' ? entry.id.trim() : '');

/** The key a definition, operation or equipment set is written under: as written, in the project's namespace when it names none. */
export function attributeEntryKey(project: Pick<Project, 'namespace'>, id: string): string {
  const trimmed = id.trim();
  return trimmed.includes(':') ? trimmed : formatResourceLocation(project.namespace, trimmed);
}

/** An id as CraftEngine reads a reference to an attribute, operation or set: without a namespace it is `minecraft`'s. */
export function attributeReference(id: string): string {
  const trimmed = id.trim();
  return trimmed.includes(':') ? trimmed : `minecraft:${trimmed}`;
}

/* ====================================================================== Editor */

/** The fields of a modifier: on an item (`withSlot`) or in an equipment set tier, which has no slot */
function modifierSpecs(withSlot: boolean): FieldSpecs {
  const scope = (key: string) => `attributes.modifier.${key}`;
  return {
    type: field.select([], { allowCustom: true, dynamicSuggestions: 'attributes', placeholder: true, help: true, scope: scope('type') }),
    id: field.text({ format: 'resource', placeholder: true, help: true, scope: scope('id') }),
    amount: { ...numberProvider(), help: true, scope: scope('amount') },
    operation: field.select(plainOptions(CE_BUILTIN_ATTRIBUTE_OPERATIONS), {
      allowCustom: true,
      dynamicSuggestions: 'attributeOperations',
      help: true,
      scope: scope('operation'),
    }),
    scope: field.select(plainOptions(['entity', 'weapon']), { help: true, scope: scope('scope') }),
    ...(withSlot && { slot: field.select(CE_ATTRIBUTE_SLOTS, { allowCustom: true, help: true, scope: scope('slot') }) }),
    conditions: { ...gate(), help: true, scope: scope('conditions') },
    update_interval: field.number({ integer: true, min: 1, help: true, scope: scope('updateInterval') }),
  };
}

/** A new modifier: adds 1 while held in the main hand (equipment set modifiers have no slot) */
export const newAttributeModifier = (withSlot = true): ConfigObject => ({
  type: '',
  id: '',
  amount: 1,
  operation: 'minecraft:add_value',
  ...(withSlot && { slot: 'mainhand' }),
});

/** An item's custom attribute modifiers (`settings.attribute_modifiers`) */
export const attributeModifierList = () =>
  field.objectList(modifierSpecs(true), { titleKey: 'type', newItem: () => newAttributeModifier() });

/** The equipment sets an item is a piece of, and in which slots (`settings.equipment_set_part`) */
export const equipmentSetPartList = () =>
  field.objectList(
    {
      slots: field.multiSelect(plainOptions(CE_EQUIPMENT_SET_SLOTS), { help: true }),
      sets: field.stringList({ format: 'resource', dynamicSuggestions: 'equipmentSets', placeholder: true, help: true }),
    },
    { newItem: () => ({ slots: ['head'], sets: [''] }) },
  );

/**
 * The keys of a potion effect that lasts while equipment is worn (SetPotionEffect): an equipment set tier's
 * `potion_effects` and, with a `slot`, an item's `settings.equipment_potion_effects`. `update_interval` (default 20
 * ticks) is how often the conditions are checked; without conditions the effect simply lasts.
 */
export function potionEffectSpecs(): FieldSpecs {
  return {
    type: field.select(plainOptions(POTION_EFFECT_NAMES.map((name) => `minecraft:${name}`)), { allowCustom: true }),
    amplifier: field.number({ integer: true, min: 0 }),
    ambient: field.boolean({ defaultHint: false }),
    particles: field.boolean({ defaultHint: true }),
    show_icon: field.boolean({ defaultHint: true }),
    conditions: gate(),
    update_interval: field.number({ integer: true, min: 1 }),
  };
}

/** A new potion effect: night vision */
const newPotionEffect = (): ConfigObject => ({ type: 'minecraft:night_vision' });

/**
 * The potion effects an item gives while it is in a slot or slot group (`settings.equipment_potion_effects`); custom
 * slots registered through CraftEngine's API can be typed in.
 */
export const equipmentPotionEffectList = () =>
  field.objectList(
    { slot: field.select(CE_ATTRIBUTE_SLOTS, { allowCustom: true, help: true }), ...potionEffectSpecs() },
    { titleKey: 'type', newItem: () => ({ slot: 'head', ...newPotionEffect() }) },
  );

const [definitionList, operationList, equipmentSetList, damageRuleList] = resolveFields(
  {
    attributes: field.objectList(
      {
        id: field.text({ format: 'resource', placeholder: true, help: true }),
        base: field.numberProvider('attributeBases', () => CE_ATTRIBUTE_BASES, { help: true }),
        derived: field.text({ placeholder: true, help: true }),
        operations: field.stringList({
          suggestions: plainOptions(CE_BUILTIN_ATTRIBUTE_OPERATIONS),
          dynamicSuggestions: 'attributeOperations',
          help: true,
        }),
        constraint: field.object({ min: field.number(), max: field.number() }, { help: true }),
        entities: field.stringList({ placeholder: true, help: true }),
        sync: field.objectList(
          {
            target: field.select(
              CE_ATTRIBUTES.map(({ value }) => ({ value: `minecraft:${value}` })),
              { allowCustom: true },
            ),
            operation: field.select(CE_ATTRIBUTE_OPERATIONS),
            value: field.numberProvider('attributeSyncValues', () => CE_ATTRIBUTE_SYNC_VALUES, { help: true }),
          },
          { titleKey: 'target', newItem: () => ({ target: 'minecraft:max_health', operation: 'add_value' }), help: true },
        ),
      },
      { titleKey: 'id', newItem: () => ({ id: '', base: 0 }) },
    ),
    attribute_operations: field.objectList(
      { id: field.text({ format: 'resource', placeholder: true }), expression: field.text({ placeholder: true, help: true }) },
      { titleKey: 'id', newItem: () => ({ id: '', expression: 'current + amount' }) },
    ),
    equipment_sets: field.objectList(
      {
        id: field.text({ format: 'resource', placeholder: true }),
        pieces: field.map(
          field.object({
            attribute: field.objectList(modifierSpecs(false), { titleKey: 'type', newItem: () => newAttributeModifier(false) }),
            potion_effects: field.objectList(potionEffectSpecs(), { titleKey: 'type', newItem: () => newPotionEffect() }),
            events: field.object({ activate: functionList(), deactivate: functionList() }, { help: true }),
          }),
          { keyPlaceholder: true, help: true, newValue: () => ({ attribute: [newAttributeModifier(false)] }) },
        ),
      },
      { titleKey: 'id', newItem: () => ({ id: '', pieces: { 2: { attribute: [newAttributeModifier(false)] } } }) },
    ),
    damage_rules: field.objectList(
      {
        damage_type: field.select(plainOptions(CE_DAMAGE_TYPES), { allowCustom: true, help: true }),
        target: field.stringList({ singleAsString: true, placeholder: true, help: true }),
        formula: field.numberProvider('damageFormulas', () => CE_DAMAGE_FORMULAS, { help: true }),
        effects: field.typedList('damageEffects', () => CE_DAMAGE_EFFECTS, { help: true }),
      },
      { titleKey: 'damage_type', newItem: () => ({ damage_type: 'minecraft:player_attack', formula: 'damage' }) },
    ),
  },
  'craftEngine',
) as ObjectListField[];

/** The project's attribute lists as the editor edits them (messages at `craftEngine.fields.<section>` of ceSchema) */
export const CE_ATTRIBUTE_LISTS: Record<AttributePart, ObjectListField> = {
  definitions: definitionList,
  operations: operationList,
  equipmentSets: equipmentSetList,
  damageRules: damageRuleList,
};

/** Suggestions from the project for the attribute fields: its attributes, operations and equipment sets, by key. */
export function projectAttributeOptions(project: Project): Record<string, Option[]> {
  const keys = (part: Exclude<AttributePart, 'damageRules'>) => plainOptions([...writtenEntries(project, part).keys()]);
  return { attributes: keys('definitions'), attributeOperations: keys('operations'), equipmentSets: keys('equipmentSets') };
}

/* ====================================================================== Export */

/** The entries of a part with an id, each under its key (a later entry with a taken key is left out). */
function writtenEntries(project: Project, part: Exclude<AttributePart, 'damageRules'>): Map<string, ConfigObject> {
  const result = new Map<string, ConfigObject>();
  for (const entry of projectAttributeEntries(project, part)) {
    const id = attributeEntryId(entry);
    if (!id) continue;
    const key = attributeEntryKey(project, id);
    if (!result.has(key)) result.set(key, entry);
  }
  return result;
}

/** An entry pruned by its list's fields, without the key the project keeps it under. */
function prunedEntry(entry: ConfigObject, part: AttributePart, drop: string): ConfigObject | null {
  const pruned = pruneValue([entry], CE_ATTRIBUTE_LISTS[part]);
  const value = Array.isArray(pruned) && isPlainObject(pruned[0]) ? { ...(pruned[0] as ConfigObject) } : null;
  if (value) delete value[drop];
  return value;
}

/** The keys of the project's attributes, operations and equipment sets */
export function projectAttributeKeys(project: Project): Record<'attributes' | 'operations' | 'equipmentSets', Set<string>> {
  return {
    attributes: new Set(writtenEntries(project, 'definitions').keys()),
    operations: new Set(writtenEntries(project, 'operations').keys()),
    equipmentSets: new Set(writtenEntries(project, 'equipmentSets').keys()),
  };
}

/** The sections of configuration/attributes.yml */
export interface CraftEngineAttributeSections {
  attributes: Record<string, ConfigObject>;
  attribute_operations: Record<string, ConfigObject>;
  equipment_sets: Record<string, ConfigObject>;
  /** Damage type → its rules, in the project's order */
  damage_rules: Record<string, ConfigValue[]>;
}

/** The attribute sections: entries with an id under their key, damage rules with a damage type under it. */
export function craftEngineAttributeSections(project: Project): CraftEngineAttributeSections {
  const section = (part: Exclude<AttributePart, 'damageRules'>) => {
    const out: Record<string, ConfigObject> = {};
    for (const [key, entry] of writtenEntries(project, part)) {
      const value = prunedEntry(entry, part, 'id');
      if (value) out[key] = value;
    }
    return out;
  };
  const damageRules: Record<string, ConfigValue[]> = {};
  for (const rule of projectAttributeEntries(project, 'damageRules')) {
    const type = typeof rule.damage_type === 'string' ? rule.damage_type.trim() : '';
    const value = type ? prunedEntry(rule, 'damageRules', 'damage_type') : null;
    if (value) (damageRules[type] ??= []).push(value);
  }
  return {
    attributes: section('definitions'),
    attribute_operations: section('operations'),
    equipment_sets: section('equipmentSets'),
    damage_rules: damageRules,
  };
}

/** Whether an item config takes part in the attribute system (custom modifiers or a piece of an equipment set). */
export function usesAttributeSettings(config: ConfigObject): boolean {
  const settings = config.settings;
  if (!isPlainObject(settings)) return false;
  return [settings.attribute_modifiers, settings.equipment_set_part].some((value) => Array.isArray(value) && value.length > 0);
}

/**
 * Whether a CraftEngine project uses the attribute system: it defines a part of it, or an item has custom modifiers or
 * is a piece of an equipment set. CraftEngine ignores all of it unless `attribute.enable` is on.
 */
export function craftEngineUsesAttributes(project: Project): boolean {
  if (project.target !== 'craftengine') return false;
  const data = projectAttributeData(project);
  if (Object.values(data).some((list) => Array.isArray(list) && list.length > 0)) return true;
  return Object.values(project.items).some((item) => usesAttributeSettings(item.config));
}
