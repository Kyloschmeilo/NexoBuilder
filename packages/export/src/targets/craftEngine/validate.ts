/** Checks of a CraftEngine item config (the shared property checks run over CraftEngine's form) and of its block. */
import { createIssue, isPlainObject, type Issue } from '@resourcepackbuilder/utils';
import {
  autoStateOverruns,
  autoStateGroupOf,
  blockAppearances,
  blockPropertyTypes,
  blockStates,
  CE_BLOCK_MAX_TEXTURES,
  CE_CONDITIONS,
  CE_EVENT_PROPERTIES,
  CE_EVENT_PROPERTY_IDS,
  CE_FUNCTIONS,
  CE_FURNITURE_ALIGNMENTS,
  CE_FURNITURE_ANCHORS,
  CE_FURNITURE_ELEMENT_TYPES,
  CE_FURNITURE_HITBOX_TYPES,
  CE_FURNITURE_ROTATIONS,
  CE_MODEL_KEYS,
  CE_PROPERTIES,
  type CraftEngineBlockModel,
  definitionEvents,
  furnitureElementType,
  furnitureHitboxType,
  furnitureVariants,
  isTransparentState,
  type LogicObjectKind,
  type LogicType,
  missingBehaviorProperties,
  parseCeRotation,
  parseCeVector,
  parseFurnitureSeat,
  parseVariantKey,
  propertyValues,
  rendererElements,
  requiredElementKey,
  resolveTrigger,
  sharedBaseBlocks,
  stateAutoState,
  statesMap,
  statesTemplate,
  templateArguments,
  triggersFor,
  variantList,
} from '@resourcepackbuilder/core/craftEngine';
import { checkFieldValue } from '@resourcepackbuilder/core/form';
import { listEntryFrame, propertyFrame, type Project } from '@resourcepackbuilder/core/project';
import { ITEM_ID_PATTERN } from '@resourcepackbuilder/minecraft';
import type { ItemExport } from '../../types';
import { validateProperties } from '../../validate/itemConfig';

/**
 * Item IDs of CraftEngine items. CraftEngine itself accepts `.`, `-` and `/` too, but the item ID names files and
 * folders of the export, and the editor writes only these characters, so the export accepts no more.
 */
export const CE_ITEM_ID_PATTERN = ITEM_ID_PATTERN;

/** A material as CraftEngine reads it: an item ID, optionally with a namespace ("diamond", "minecraft:diamond"). */
const CE_MATERIAL_PATTERN = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

export function validateCraftEngineItem(itemExport: ItemExport, config: Record<string, unknown>): void {
  const { report } = itemExport;
  const material = config.material;
  if (typeof material !== 'string' || !CE_MATERIAL_PATTERN.test(material)) {
    report('error', 'ce.materialInvalid', { material: String(material) });
  }
  // The events are checked as they are written (validateCraftEngineEvents), with those of the additional YAML
  validateProperties(
    itemExport,
    CE_PROPERTIES.filter((def) => !CE_EVENT_PROPERTIES.includes(def)),
  );
  if (!CE_MODEL_KEYS.some((key) => config[key] !== undefined)) report('warning', 'ce.missingModel');
  validateCraftEngineEvents(itemExport, 'item', config);
}

/** The issue CraftEngine's objects report for a trigger they never fire, by object kind. */
const WRONG_TRIGGER_CODES: Record<LogicObjectKind, string> = {
  item: 'ce.eventTriggerNotForItem',
  block: 'ce.eventTriggerNotForBlock',
  furniture: 'ce.eventTriggerNotForFurniture',
};

/** Whether a catalog knows the type of an entry (with or without the `craftengine` namespace, a "!" inverting it). */
function knownType(types: readonly LogicType[], entry: Record<string, unknown>): boolean {
  if (typeof entry.type !== 'string' || isTemplated(entry.type)) return true;
  const type = entry.type.replace(/^!/, '').replace(/^craftengine:/, '');
  return types.some((t) => t.type === type);
}

/** A value CraftEngine's templates fill in (a `${argument}`) is only known once the template is applied. */
const isTemplated = (text: string) => text.includes('${');

const asList = (value: unknown): unknown[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

/**
 * The events of an item, block or furniture as the export writes them (the list form): each names a trigger
 * CraftEngine knows and the object fires, and has functions; its functions and conditions are of known types, and
 * the values of their fields are checked through the logic catalog.
 */
export function validateCraftEngineEvents(itemExport: ItemExport, kind: LogicObjectKind, definition: Record<string, unknown>): void {
  const { report } = itemExport;
  const events = definitionEvents(definition);
  if (events === undefined || events === null) return;
  const def = CE_EVENT_PROPERTIES.find((p) => p.id === CE_EVENT_PROPERTY_IDS[kind]);
  if (!def) return;
  const frame = propertyFrame(def.label);
  if (!Array.isArray(events)) {
    report('error', 'ce.eventsInvalid', undefined, [frame]);
    return;
  }
  const fired = triggersFor(kind)
    .map((t) => t.type)
    .join(', ');
  events.forEach((event, i) => {
    const where = [frame, listEntryFrame(i + 1)];
    if (!isPlainObject(event)) {
      report('error', 'ce.eventInvalid', undefined, where);
      return;
    }
    // A template (like the jar's default:rotatable_furniture_4) brings its own keys
    if (event.template !== undefined) return;
    const triggers = asList(event.on);
    if (triggers.length === 0) report('error', 'ce.eventTriggerMissing', undefined, where);
    for (const trigger of triggers.map(String).filter((name) => !isTemplated(name))) {
      const known = resolveTrigger(trigger, kind);
      if (!known) report('error', 'ce.eventTriggerUnknown', { trigger }, where);
      else if (!known.objectKinds?.includes(kind)) report('warning', WRONG_TRIGGER_CODES[kind], { trigger, triggers: fired }, where);
    }
    // An event with a `type` is a single function itself
    const functions = event.type !== undefined ? [event] : asList(event.functions);
    if (functions.length === 0) report('warning', 'ce.eventNoFunctions', undefined, where);
    for (const fn of functions.filter(isPlainObject).filter((f) => f.template === undefined)) {
      if (!knownType(CE_FUNCTIONS, fn)) report('warning', 'ce.eventFunctionUnknown', { type: String(fn.type) }, where);
    }
    for (const condition of asList(event.conditions)
      .filter(isPlainObject)
      .filter((c) => c.template === undefined)) {
      if (!knownType(CE_CONDITIONS, condition)) report('warning', 'ce.eventConditionUnknown', { type: String(condition.type) }, where);
    }
  });
  for (const found of checkFieldValue(events, def.field)) report('warning', found.code, found.args, [frame, ...found.context]);
}

/**
 * A state or appearance: a known `auto_state` group or a fixed vanilla `state`, and the elements of its entity
 * renderer. A transparent one without a renderer shows nothing.
 */
function validateState(itemExport: ItemExport, state: Record<string, unknown>, appearance: string | null): void {
  const { report } = itemExport;
  const auto = stateAutoState(state);
  if (state.auto_state === undefined && state.state === undefined) {
    if (appearance === null) report('error', 'ce.blockStateMissing');
    else report('error', 'ce.blockAppearanceStateMissing', { appearance });
  } else if (state.auto_state !== undefined && !(auto && autoStateGroupOf(auto.group))) {
    report('error', 'ce.blockAutoStateInvalid', { group: auto?.group ?? String(state.auto_state) });
  }
  // The single state is named by its key in the YAML
  const where = { look: appearance ?? 'state' };
  const elements = rendererElements(state);
  for (const element of elements) validateDisplayElement(itemExport, element, RENDERER_ELEMENT_CODES, where);
  if (isTransparentState(state) && elements.length === 0) report('warning', 'ce.blockTransparentInvisible', where);
}

/**
 * Written-out states: complete properties, at least one appearance, and variants that name existing properties,
 * values and appearances.
 */
function validateStates(itemExport: ItemExport, states: Record<string, unknown>): void {
  const { report } = itemExport;
  const properties = statesMap(states, 'properties');
  const values = new Map(Object.entries(properties).map(([name, def]) => [name, propertyValues(def)]));
  for (const [property, list] of values) if (!list) report('error', 'ce.blockPropertyInvalid', { property });
  const appearances = statesMap(states, 'appearances');
  if (Object.keys(appearances).length === 0) report('error', 'ce.blockNoAppearance');
  for (const [variant, value] of Object.entries(statesMap(states, 'variants'))) {
    const pairs = parseVariantKey(variant);
    const known = pairs?.every(([name, v]) => values.get(name)?.includes(v) ?? false);
    if (!known) report('error', 'ce.blockVariantInvalid', { variant });
    const appearance = isPlainObject(value) ? value.appearance : undefined;
    if (appearance !== undefined && !Object.hasOwn(appearances, String(appearance))) {
      report('error', 'ce.blockVariantAppearanceMissing', { variant, appearance: String(appearance) });
    }
  }
}

/**
 * The block: its state (or each appearance of its states) with a known `auto_state` group and a model, the
 * properties its behaviors need, and the arguments a template cannot be filled with.
 */
export function validateCraftEngineBlock(
  itemExport: ItemExport,
  block: Record<string, unknown>,
  blockModel: CraftEngineBlockModel | null,
): void {
  const { report } = itemExport;
  const states = blockStates(block);
  const template = states && statesTemplate(states);
  if (!states) validateState(itemExport, isPlainObject(block.state) ? block.state : {}, null);
  else if (!template) {
    validateStates(itemExport, states);
    for (const [name, appearance] of blockAppearances(block)) validateState(itemExport, appearance, name);
  } else if (template === 'default:block_state/fence') {
    // The fence shows two items: both must be set, and those of this pack must exist
    const { project } = itemExport;
    const items = Object.values(project.items).map((item) => `${project.namespace}:${item.itemId}`);
    const args = templateArguments(states);
    for (const argument of ['fence_post_item', 'fence_side_item']) {
      const value = args[argument];
      if (!value) report('error', 'ce.blockTemplateArgumentMissing', { argument });
      else if (String(value).startsWith(`${project.namespace}:`) && !items.includes(String(value))) {
        report('warning', 'ce.blockFenceItemUnknown', { item: String(value) });
      }
    }
  }
  for (const { behavior, property, type } of missingBehaviorProperties(block, blockPropertyTypes(block))) {
    report('error', 'ce.blockBehaviorProperty', { behavior, property, type });
  }
  if (blockModel && !blockModel.model) report('error', 'ce.blockMissingModel');
  if (blockModel && blockModel.unusedTextures > 0) {
    report('warning', 'ce.blockExtraTextures', { max: CE_BLOCK_MAX_TEXTURES, count: blockModel.unusedTextures });
  }
}

/**
 * Project-wide block checks: one warning per `auto_state` group whose blocks need more vanilla states than the
 * group has, and per vanilla block that several blocks borrow through a template.
 */
export function blockProjectIssues(project: Project): Issue[] {
  return [
    ...autoStateOverruns(project).map(({ group, used, capacity }) =>
      createIssue('warning', 'ce.autoStateBudget', { group, used, capacity }),
    ),
    ...sharedBaseBlocks(project).map(({ block, blocks }) =>
      createIssue('warning', 'ce.blockBaseShared', { block, blocks: blocks.join(', ') }),
    ),
  ];
}

const ELEMENT_TYPES: readonly string[] = CE_FURNITURE_ELEMENT_TYPES;
const HITBOX_TYPES: readonly string[] = CE_FURNITURE_HITBOX_TYPES;
const ANCHORS: readonly string[] = CE_FURNITURE_ANCHORS;
const RULE_VALUES: Record<string, readonly string[]> = { rotation: CE_FURNITURE_ROTATIONS, alignment: CE_FURNITURE_ALIGNMENTS };
/** Keys of elements and hitboxes that hold a vector, and those that hold a rotation */
const VECTOR_KEYS = ['position', 'translation'];
const ROTATION_KEY = 'rotation';

/** Where a checked value is: the furniture's variant or the block's state or appearance. */
type Where = Record<string, string>;

/** A vector, rotation or seat CraftEngine cannot read, reported with `code`. */
function checkValue(itemExport: ItemExport, code: string, where: Where, key: string, value: unknown, valid: boolean): void {
  if (value !== undefined && !valid) {
    itemExport.report('error', code, { ...where, key, value: typeof value === 'string' ? value : JSON.stringify(value) });
  }
}

/** The issue codes of the checks of a display element. */
interface ElementCodes {
  typeInvalid: string;
  keyMissing: string;
  itemUnknown: string;
  valueInvalid: string;
}

const FURNITURE_ELEMENT_CODES: ElementCodes = {
  typeInvalid: 'ce.furnitureElementTypeInvalid',
  keyMissing: 'ce.furnitureElementKeyMissing',
  itemUnknown: 'ce.furnitureItemUnknown',
  valueInvalid: 'ce.furnitureValueInvalid',
};

const RENDERER_ELEMENT_CODES: ElementCodes = {
  typeInvalid: 'ce.blockRendererTypeInvalid',
  keyMissing: 'ce.blockRendererKeyMissing',
  itemUnknown: 'ce.blockRendererItemUnknown',
  valueInvalid: 'ce.blockRendererValueInvalid',
};

/**
 * An element of a furniture variant or of a block's entity renderer: a known type with what it shows, and readable
 * positions, scale and rotation. Items of the pack it shows must exist.
 */
function validateDisplayElement(itemExport: ItemExport, element: Record<string, unknown>, codes: ElementCodes, where: Where): void {
  const { report, project } = itemExport;
  const type = furnitureElementType(element);
  if (!type || !ELEMENT_TYPES.includes(type)) {
    report('error', codes.typeInvalid, { ...where, type: type ?? '' });
    return;
  }
  const required = requiredElementKey(type);
  if (required && element[required] === undefined) report('error', codes.keyMissing, { ...where, type, key: required });
  const item = element.item;
  if (typeof item === 'string' && item.startsWith(`${project.namespace}:`)) {
    const exists = Object.values(project.items).some((other) => `${project.namespace}:${other.itemId}` === item);
    if (!exists) report('warning', codes.itemUnknown, { ...where, item });
  }
  const check = (key: string, valid: boolean) => checkValue(itemExport, codes.valueInvalid, where, key, element[key], valid);
  for (const key of VECTOR_KEYS) check(key, parseCeVector(element[key]) !== null);
  if (type !== 'armor_stand') check('scale', parseCeVector(element.scale) !== null);
  check(ROTATION_KEY, parseCeRotation(element[ROTATION_KEY]) !== null);
}

/**
 * The furniture: at least one variant the item can place (ground, wall, ceiling), elements of known types with what
 * they show, readable positions, rotations and seats, known hitbox types, and the item's placement rules. Items of
 * the pack an element shows must exist.
 */
export function validateCraftEngineFurniture(
  itemExport: ItemExport,
  furniture: Record<string, unknown>,
  itemConfig: Record<string, unknown>,
): void {
  const { report } = itemExport;
  const variants = furnitureVariants(furniture);
  const names = Object.keys(variants);
  if (names.length === 0) report('error', 'ce.furnitureNoVariant');
  else if (!names.some((name) => ANCHORS.includes(name))) report('warning', 'ce.furnitureNoPlaceableVariant');

  for (const [name, variant] of Object.entries(variants)) {
    const elements = variantList(variant, 'elements');
    if (elements.length === 0 && variant.blueprint === undefined) report('warning', 'ce.furnitureVariantEmpty', { variant: name });
    const where = { variant: name };
    for (const element of elements) validateDisplayElement(itemExport, element, FURNITURE_ELEMENT_CODES, where);
    for (const hitbox of variantList(variant, 'hitboxes')) {
      const type = furnitureHitboxType(hitbox);
      if (!HITBOX_TYPES.includes(type)) report('error', 'ce.furnitureHitboxTypeInvalid', { variant: name, type });
      if (type === 'custom' && hitbox.entity_type === undefined) report('error', 'ce.furnitureHitboxEntityMissing', where);
      const check = (key: string, value: unknown, valid: boolean) =>
        checkValue(itemExport, 'ce.furnitureValueInvalid', where, key, value, valid);
      check('position', hitbox.position, parseCeVector(hitbox.position) !== null);
      const seats = Array.isArray(hitbox.seats) ? hitbox.seats : [];
      for (const seat of seats) check('seats', seat, parseFurnitureSeat(seat) !== null);
    }
  }

  const behavior = isPlainObject(itemConfig.behavior) ? itemConfig.behavior : {};
  const rules = isPlainObject(behavior.rules) ? behavior.rules : {};
  for (const [variant, rule] of Object.entries(rules)) {
    for (const [key, allowed] of Object.entries(RULE_VALUES)) {
      const value = isPlainObject(rule) ? rule[key] : undefined;
      if (value !== undefined && !allowed.includes(String(value).toLowerCase())) {
        report('error', 'ce.furnitureRuleInvalid', { variant, key, value: String(value) });
      }
    }
  }
}
