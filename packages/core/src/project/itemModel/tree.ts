/**
 * Building and changing an item model tree without mutating it: new nodes of each type, switching a node's property,
 * special model or tint source (keeping only the keys that still apply), reading and replacing the node at a path,
 * walking the children, resolving the `@model` token, and reading a stored tree leniently.
 */
import { isPlainObject, MODEL_TOKEN } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue } from '../types';
import {
  fullId,
  ITEM_MODEL_PROPERTIES,
  ITEM_MODEL_SPECIAL_TYPES,
  ITEM_MODEL_TINT_TYPES,
  itemModelProperty,
  itemModelSpecialType,
  itemModelTintType,
  itemModelTypeDef,
  type ItemModelParam,
  type ItemModelPropertyKind,
  type ItemModelVariantDef,
} from './catalog';
import { ITEM_MODEL_ROOT_KEYS, type ItemModelDefinition, type ItemModelNode, type ItemModelPath, type ItemModelType } from './types';

/** The keys of a node that hold its child nodes (the rest are its own keys). */
const CHILD_KEYS = ['models', 'on_true', 'on_false', 'cases', 'entries', 'fallback'];

/** The required keys of `params` with their initial values. */
function initialParams(params: ItemModelParam[]): ConfigObject {
  return Object.fromEntries(params.flatMap((p) => (p.required && p.initial !== undefined ? [[p.key, p.initial]] : [])));
}

/** A node showing a model; the item's own model (`@model`) by default. */
export function modelNode(model: string = MODEL_TOKEN): ItemModelNode {
  return { type: 'minecraft:model', model };
}

/** The first property of a kind, as a new node picks it. */
const FIRST_PROPERTY: Record<ItemModelPropertyKind, string> = {
  condition: 'minecraft:using_item',
  select: 'minecraft:display_context',
  range_dispatch: 'minecraft:count',
};

/** A new node of the type with what Minecraft needs filled in (children show the item's own model). */
export function newItemModelNode(type: ItemModelType): ItemModelNode {
  switch (type) {
    case 'minecraft:model':
      return modelNode();
    case 'minecraft:composite':
      return { type, models: [modelNode()] };
    case 'minecraft:condition':
      return { type, property: FIRST_PROPERTY.condition, on_true: modelNode(), on_false: modelNode() };
    case 'minecraft:select':
      return { type, property: FIRST_PROPERTY.select, cases: [{ when: 'gui', model: modelNode() }], fallback: modelNode() };
    case 'minecraft:range_dispatch':
      return { type, property: FIRST_PROPERTY.range_dispatch, entries: [{ threshold: 1, model: modelNode() }], fallback: modelNode() };
    case 'minecraft:special':
      return { type, base: MODEL_TOKEN, model: newSpecialModel('minecraft:head') };
    default:
      return { type };
  }
}

/** A new definition: the item's own model. */
export function newItemModelDefinition(): ItemModelDefinition {
  return { model: modelNode() };
}

/**
 * The node turned into another type: children it can keep move over (the first child becomes the new type's first
 * child), everything else starts as a new node of that type.
 */
export function withNodeType(node: ItemModelNode, type: ItemModelType): ItemModelNode {
  if (fullId(node.type) === type) return node;
  const next = newItemModelNode(type);
  const first = itemModelChildren(node)[0]?.node;
  if (!first) return next;
  if (type === 'minecraft:composite') return { ...next, models: [first] };
  if (type === 'minecraft:condition') return { ...next, on_false: first };
  if (type === 'minecraft:select' || type === 'minecraft:range_dispatch') return { ...next, fallback: first };
  return next;
}

/** The keys of every variant in a list (to drop the ones of the variant that is replaced). */
const variantKeys = (defs: ItemModelVariantDef[]) => new Set(defs.flatMap((def) => def.params.map((p) => p.key)));

/** The object without the keys of the variants that are not `def`, with the initial values of `def`'s required keys. */
function withVariant(value: ConfigObject, all: ItemModelVariantDef[], def: ItemModelVariantDef | undefined): ConfigObject {
  const own = new Set(def?.params.map((p) => p.key));
  const drop = variantKeys(all);
  const kept = Object.fromEntries(Object.entries(value).filter(([key]) => own.has(key) || !drop.has(key)));
  return { ...initialParams(def?.params ?? []), ...kept };
}

/** The node reading another property: the old property's keys go, the new one's required keys get their initial value. */
export function withProperty(node: ItemModelNode, kind: ItemModelPropertyKind, property: string): ItemModelNode {
  const { type, property: _old, ...rest } = node;
  return { type, property: fullId(property), ...withVariant(rest, ITEM_MODEL_PROPERTIES[kind], itemModelProperty(kind, property)) };
}

/** A new special model of the id with its required keys. */
export function newSpecialModel(id: string): ConfigObject {
  const def = itemModelSpecialType(id);
  return { type: fullId(id), ...initialParams(def?.params ?? []) };
}

/** The special model switched to another id (keys the new one does not read are dropped). */
export function withSpecialType(special: ConfigObject, id: string): ConfigObject {
  const { type: _old, ...rest } = special;
  return { type: fullId(id), ...withVariant(rest, ITEM_MODEL_SPECIAL_TYPES, itemModelSpecialType(id)) };
}

/** A new tint source of the id with its required keys. */
export function newTint(id: string): ConfigObject {
  const def = itemModelTintType(id);
  return { type: fullId(id), ...initialParams(def?.params ?? []) };
}

/** The tint switched to another source (keys the new one does not read are dropped). */
export function withTintType(tint: ConfigObject, id: string): ConfigObject {
  const { type: _old, ...rest } = tint;
  return { type: fullId(id), ...withVariant(rest, ITEM_MODEL_TINT_TYPES, itemModelTintType(id)) };
}

const asNode = (value: unknown): ItemModelNode | null =>
  isPlainObject(value) && typeof value.type === 'string' ? (value as ItemModelNode) : null;

/** The child nodes of a node with their paths relative to it (`['cases', 0, 'model']` …), in the order they show. */
export function itemModelChildren(node: ItemModelNode): Array<{ path: ItemModelPath; node: ItemModelNode }> {
  const result: Array<{ path: ItemModelPath; node: ItemModelNode }> = [];
  const add = (path: ItemModelPath, value: unknown) => {
    const child = asNode(value);
    if (child) result.push({ path, node: child });
  };
  const list = (key: string, nested?: string) => {
    const value = node[key];
    if (!Array.isArray(value)) return;
    value.forEach((entry, i) => {
      if (!nested) add([key, i], entry);
      else if (isPlainObject(entry)) add([key, i, nested], entry[nested]);
    });
  };
  switch (fullId(node.type)) {
    case 'minecraft:composite':
      list('models');
      break;
    case 'minecraft:condition':
      add(['on_true'], node.on_true);
      add(['on_false'], node.on_false);
      break;
    case 'minecraft:select':
      list('cases', 'model');
      add(['fallback'], node.fallback);
      break;
    case 'minecraft:range_dispatch':
      list('entries', 'model');
      add(['fallback'], node.fallback);
      break;
  }
  return result;
}

/** The value at a path below a node (undefined when the path leads nowhere). */
function valueAt(root: ConfigValue, path: ItemModelPath): ConfigValue | undefined {
  let value: ConfigValue | undefined = root;
  for (const step of path) {
    if (typeof step === 'number') value = Array.isArray(value) ? value[step] : undefined;
    else value = isPlainObject(value) ? (value as ConfigObject)[step] : undefined;
    if (value === undefined) return undefined;
  }
  return value;
}

/** The node at a path below the root, or null. */
export function itemModelNodeAt(root: ItemModelNode, path: ItemModelPath): ItemModelNode | null {
  return asNode(valueAt(root, path));
}

/**
 * The tree with the value at `path` replaced by `update(old)` (the root itself for `[]`); `undefined` removes a key
 * or a list entry. Nothing on the way is mutated.
 */
export function updateItemModelAt(
  root: ItemModelNode,
  path: ItemModelPath,
  update: (value: ConfigValue | undefined) => ConfigValue | undefined,
): ItemModelNode {
  const go = (value: ConfigValue | undefined, depth: number): ConfigValue | undefined => {
    if (depth === path.length) return update(value);
    const step = path[depth];
    if (typeof step === 'number') {
      const list = Array.isArray(value) ? [...value] : [];
      const next = go(list[step], depth + 1);
      if (next === undefined) list.splice(step, 1);
      else list[step] = next;
      return list;
    }
    const object: ConfigObject = isPlainObject(value) ? { ...(value as ConfigObject) } : {};
    const next = go(object[step], depth + 1);
    if (next === undefined) delete object[step];
    else object[step] = next;
    return object;
  };
  const result = go(root, 0);
  return asNode(result) ?? root;
}

/** The tree with every model reference (`model` of a model node, `base` of a special node) mapped. */
export function mapItemModelRefs(node: ItemModelNode, map: (ref: string) => string): ItemModelNode {
  let result: ItemModelNode = { ...node };
  const type = fullId(node.type);
  if (type === 'minecraft:model' && typeof node.model === 'string') result.model = map(node.model);
  if (type === 'minecraft:special' && typeof node.base === 'string') result.base = map(node.base);
  for (const child of itemModelChildren(node)) {
    result = updateItemModelAt(result, child.path, () => mapItemModelRefs(child.node, map));
  }
  return result;
}

/** Whether the tree shows the item's own model somewhere (`@model`). */
export function usesMainModel(node: ItemModelNode): boolean {
  let found = false;
  mapItemModelRefs(node, (ref) => {
    if (ref === MODEL_TOKEN) found = true;
    return ref;
  });
  return found;
}

/** The tree with `@model` replaced by the item's main model key (left as is without one; the validation reports it). */
export function resolveItemModelTokens(node: ItemModelNode, mainModelKey: string | null): ItemModelNode {
  return mapItemModelRefs(node, (ref) => (ref === MODEL_TOKEN && mainModelKey ? mainModelKey : ref));
}

/** The definition's root keys that are set, in their documented order. */
export function itemModelRootValues(definition: ItemModelDefinition): ConfigObject {
  return Object.fromEntries(ITEM_MODEL_ROOT_KEYS.flatMap((key) => (definition[key] === undefined ? [] : [[key, definition[key]]])));
}

/**
 * A stored definition read leniently: a mapping whose `model` is a node (with a string `type`); root keys of the wrong
 * type are dropped. Anything else is no definition (undefined).
 */
export function parseItemModelDefinition(value: unknown): ItemModelDefinition | undefined {
  if (!isPlainObject(value)) return undefined;
  const model = asNode(value.model);
  if (!model) return undefined;
  const result: ItemModelDefinition = { model };
  if (typeof value.hand_animation_on_swap === 'boolean') result.hand_animation_on_swap = value.hand_animation_on_swap;
  if (typeof value.oversized_in_gui === 'boolean') result.oversized_in_gui = value.oversized_in_gui;
  if (typeof value.swap_animation_scale === 'number' && Number.isFinite(value.swap_animation_scale))
    result.swap_animation_scale = value.swap_animation_scale;
  return result;
}

/** Whether a key of a node holds child nodes (the editor shows those as branches, not as fields). */
export const isChildKey = (key: string): boolean => CHILD_KEYS.includes(key);

/** Whether the type is one the catalog knows. */
export const isKnownItemModelType = (type: string): boolean => itemModelTypeDef(type) !== undefined;

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** Whether a case's `when` is a value or a list of values the comma-separated text field can show. */
export function isSimpleWhen(when: ConfigValue | undefined): boolean {
  return when === undefined || isScalar(when) || (Array.isArray(when) && when.every(isScalar));
}

/** A case's `when` as comma-separated text (`left, right`). */
export function formatWhen(when: ConfigValue | undefined): string {
  if (when === undefined || when === null) return '';
  return Array.isArray(when) ? when.map(String).join(', ') : String(when);
}

/**
 * Comma-separated text back as a case's `when`: one value, or a list for several. A value written as before keeps
 * its type (a number or boolean of a component select stays one); new values are strings.
 */
export function parseWhen(text: string, previous: ConfigValue | undefined): ConfigValue {
  const before = (Array.isArray(previous) ? previous : previous === undefined ? [] : [previous]).filter(isScalar);
  const values = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => before.find((value) => String(value) === part) ?? part);
  return values.length > 1 ? values : (values[0] ?? '');
}
