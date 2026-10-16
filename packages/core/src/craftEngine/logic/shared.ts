/**
 * Field specs the logic catalogs share. Function declarations (hoisted), and the catalogs are read lazily, as the
 * catalogs refer to each other (functions hold conditions, conditions hold number providers).
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, type FieldSpecs } from '../../form/build';
import { plainOptions } from '../../form/options';
import { CE_CONDITIONS } from './conditions';
import { CE_FUNCTIONS } from './functions';
import { CE_LOOT_ENTRIES, CE_LOOT_FUNCTIONS } from './loot';
import { CE_NUMBERS } from './numbers';

/** A list of conditions (a leading "!" on `type` inverts one); `scope` shares the messages of a common key */
export function conditionList(scope?: string) {
  return field.typedList('conditions', () => CE_CONDITIONS, { invertible: true, ...(scope && { scope }) });
}

/** The `conditions` every function (and loot source) can have: all must hold */
export function gate() {
  return conditionList('logic.shared.conditions');
}

/** A list of functions */
export function functionList() {
  return field.typedList('functions', () => CE_FUNCTIONS);
}

/** The entries of a loot pool (an `alternatives` entry holds entries too) */
export function lootEntryList() {
  return field.typedList('lootEntries', () => CE_LOOT_ENTRIES, { scope: 'logic.shared.lootEntries' });
}

/** The loot functions of a loot table, a pool or an entry */
export function lootFunctionList() {
  return field.typedList('lootFunctions', () => CE_LOOT_FUNCTIONS, { scope: 'logic.shared.lootFunctions', help: true });
}

/** A new pool: one roll of one item entry */
function newPool() {
  return { rolls: 1, entries: [{ type: 'item' }] };
}

/** The templates of CraftEngine's default pack that build a loot table (default_templates/…/loot_tables.yml) */
export function lootTemplates(): string[] {
  return [
    'default:loot_table/self',
    'default:loot_table/furniture',
    'default:loot_table/basic',
    'default:loot_table/door',
    'default:loot_table/silk_touch',
    'default:loot_table/slab',
    'default:loot_table/seed_crop',
    'default:loot_table/crop',
    'default:loot_table/ore',
    'default:loot_table/leaves',
  ];
}

/**
 * A loot table as CraftEngine reads it (ConfigValue.getAsLoot): a template of the default pack with its arguments, a
 * table of pools, or the id of another loot table (a datapack table when CraftEngine has none of that id).
 */
export function lootTable() {
  return field.choice(
    {
      template: {
        field: field.object({
          template: field.select(plainOptions(lootTemplates()), { allowCustom: true, help: true }),
          arguments: field.map(field.text(), { keyPlaceholder: true, help: true }),
        }),
        matches: (value) => isPlainObject(value) && value.template !== undefined,
        newValue: () => ({ template: 'default:loot_table/self' }),
      },
      table: {
        field: field.object({
          pools: field.objectList(
            {
              rolls: numberProvider(),
              bonus_rolls: { ...numberProvider(), help: true },
              conditions: conditionList('logic.shared.conditions'),
              entries: lootEntryList(),
              functions: lootFunctionList(),
            },
            { newItem: newPool },
          ),
          functions: lootFunctionList(),
        }),
        // An empty object has no form yet (the editor keeps the one shown)
        matches: (value) => isPlainObject(value) && value.template === undefined && Object.keys(value).length > 0,
        newValue: () => ({ pools: [newPool()] }),
      },
      reference: {
        field: field.text({ format: 'resource', placeholder: true }),
        matches: (value) => typeof value === 'string',
        newValue: () => '',
      },
    },
    { scope: 'logic.shared.lootTable', help: true },
  );
}

/** A number provider: a number, a range text like `1~3`, an expression or a typed object */
export function numberProvider() {
  return field.numberProvider('numbers', () => CE_NUMBERS);
}

/** `x`, `y` and `z` as number providers (unset: the position of the context) */
export function position(): FieldSpecs {
  return { x: numberProvider(), y: numberProvider(), z: numberProvider() };
}

/** `x`, `y`, `z`, `pitch` and `yaw` as number providers */
export function placement(): FieldSpecs {
  return { ...position(), pitch: numberProvider(), yaw: numberProvider() };
}

/** The players a function acts on: `self`, `all` or a selector object */
export function playerTarget() {
  return field.select(plainOptions(['self', 'all']), { allowCustom: true, help: true, scope: 'logic.shared.target' });
}

/** A resource id such as `minecraft:stone` */
export function resource() {
  return field.text({ format: 'resource' });
}

/** The interaction hand: `main_hand` or `off_hand` */
export function hand() {
  return field.select(plainOptions(['main_hand', 'off_hand']));
}

/** An equipment slot (EquipmentSlot) */
export function equipmentSlot() {
  return field.select(plainOptions(['mainhand', 'offhand', 'head', 'chest', 'legs', 'feet', 'body', 'saddle']));
}
