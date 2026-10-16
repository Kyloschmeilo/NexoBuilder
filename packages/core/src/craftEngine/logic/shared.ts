/**
 * Field specs the logic catalogs share. Function declarations (hoisted), and the catalogs are read lazily, as the
 * catalogs refer to each other (functions hold conditions, conditions hold number providers).
 */
import { field, type FieldSpecs } from '../../form/build';
import { plainOptions } from '../../form/options';
import { CE_CONDITIONS } from './conditions';
import { CE_FUNCTIONS } from './functions';
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
