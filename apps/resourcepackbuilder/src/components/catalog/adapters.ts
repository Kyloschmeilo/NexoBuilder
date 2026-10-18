/**
 * Adapters from the form schema onto catalog data: the properties of one group of a form (Nexo components, CraftEngine
 * block settings …) and the types of a typed source (CraftEngine block behaviors, conditions, functions …). They are
 * pure; the texts come in through {@link CatalogText}, so tests and the dialog share them.
 */
import {
  type FormSchema,
  isPropertyActive,
  propertyConflict,
  type PropertyDef,
  type PropertyGroup,
  type PropertyOwner,
  propertyYamlPath,
  type TypedType,
} from '@resourcepackbuilder/core/form';
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { toYaml } from '@resourcepackbuilder/core/yaml';
import { versionSupport } from '@resourcepackbuilder/minecraft';
import { keySegment } from '@resourcepackbuilder/utils';
import { CATEGORY_OTHER } from './search';
import type { CatalogBadge, CatalogCategory, CatalogData, CatalogItem } from './types';

/** How the adapters get their texts. */
export interface CatalogText {
  /** Translates a message key of the form's namespace. */
  schema: (key: string) => string;
  /** Whether the form's namespace has a message key (category names are optional). */
  hasSchema: (key: string) => boolean;
  /** The reason a property cannot be added: "Not possible together with “{name}”." */
  conflict: (name: string) => string;
  /** The name of the "Other" category. */
  other: string;
}

/** `slab_block` → "Slab block", `minecraft:food` → "Food": a readable name for an id that has no translated one. */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/^[a-z0-9_.-]+:/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
  if (!words.length) return key;
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** The version badges of an entry, flagged when the project's version is outside the range. */
export function versionBadges(range: { minVersion?: string; maxVersion?: string }, version?: string): CatalogBadge[] {
  const support = version ? versionSupport(version, range) : 'supported';
  return [
    ...(range.minVersion ? [{ kind: 'from' as const, version: range.minVersion, unsupported: support === 'tooOld' }] : []),
    ...(range.maxVersion ? [{ kind: 'until' as const, version: range.maxVersion, unsupported: support === 'removed' }] : []),
  ];
}

/** Nests a value under a YAML path: `['Components', 'food']` → `{ Components: { food: value } }`. */
function nested(path: readonly string[], value: unknown): unknown {
  return path.reduceRight<unknown>((inner, key) => ({ [key]: inner }), value);
}

/** The message key of a property category's name: `groups.<group>.categories.<camel(category)>`. */
export const propertyCategoryKey = (group: PropertyGroup, category: string): string =>
  `groups.${keySegment(group)}.categories.${keySegment(category)}`;

/** The name of a category from its message key, or a readable form of its id when the key has no text. */
function categoryName(text: CatalogText, id: string, key: string | undefined): string {
  if (id === CATEGORY_OTHER) return text.other;
  return key && text.hasSchema(key) ? text.schema(key) : humanizeKey(id);
}

/** Collects the categories of the entries in first-seen order, named through `name`. */
function collectCategories(ids: Array<string | undefined>, name: (id: string) => string): CatalogCategory[] {
  const seen = [...new Set(ids.map((id) => id ?? CATEGORY_OTHER))];
  // "Other" goes last
  const ordered = [...seen.filter((id) => id !== CATEGORY_OTHER), ...seen.filter((id) => id === CATEGORY_OTHER)];
  return ordered.map((id) => ({ id, label: name(id) }));
}

interface PropertyGroupOptions {
  text: CatalogText;
  /** The project's Minecraft version, for the version badges and ordering. */
  version?: string;
  /** Only these property ids (e.g. the ones an item's config can use). */
  only?: readonly string[];
}

/** One property as a catalog entry. `owner` decides the added and conflict states. */
export function catalogItemFromProperty(
  schema: FormSchema,
  owner: PropertyOwner,
  def: PropertyDef,
  { text, version }: Omit<PropertyGroupOptions, 'only'>,
): CatalogItem {
  const conflict = propertyConflict(schema, owner, def);
  const path = propertyYamlPath(def);
  const badges = [...(def.badge === 'premium' ? [{ kind: 'premium' as const }] : []), ...versionBadges(def, version)];
  return {
    id: def.id,
    label: text.schema(def.label),
    description: text.schema(def.description),
    yamlKey: path ?? def.id,
    ...(def.category && { category: def.category }),
    ...(def.common && { common: true }),
    ...(def.aliases?.length && { aliases: def.aliases }),
    ...(def.docs && { docs: { url: def.docs, target: schema.target } }),
    ...(badges.length && { badges }),
    ...(badges.some((badge) => badge.kind !== 'premium' && badge.unsupported) && { unsupported: true }),
    ...(conflict && { disabledReason: text.conflict(text.schema(conflict.label)) }),
    ...(isPropertyActive(owner, def) && { added: true }),
    ...(def.storage === 'config' && { preview: toYaml(nested(def.path, def.defaultValue())) }),
    ...(def.hint && { note: text.schema(def.hint) }),
  };
}

/**
 * The properties of one group as a catalog (`catalogFromPropertyGroup(schema, item, 'components', …)`). Properties the
 * owner uses are marked added, those that conflict with one it uses are disabled with the reason, and those outside the
 * project's version sort last. Categories come from `PropertyDef.category`, named at
 * `groups.<group>.categories.<camel(category)>` (a readable id without that message), "Other" for the rest.
 */
export function catalogFromPropertyGroup(
  schema: FormSchema,
  owner: PropertyOwner,
  group: PropertyGroup,
  { text, version, only }: PropertyGroupOptions,
): CatalogData {
  const defs = schema.properties.filter((def) => def.group === group && (!only || only.includes(def.id)));
  const items = defs.map((def) => catalogItemFromProperty(schema, owner, def, { text, version }));
  const categories = collectCategories(
    defs.map((def) => def.category),
    (id) => categoryName(text, id, propertyCategoryKey(group, id)),
  );
  return { items, categories };
}

/** What a typed catalog needs from its source: a typed list or number provider field, or a catalog of its own. */
export interface TypedCatalogSource {
  types: () => readonly TypedType[];
}

interface TypedSourceOptions {
  text: CatalogText;
  /** The plugin the types' docs belong to. */
  target: PackTargetId;
  /** Type names already in the list; their cards show "Added". */
  added?: Iterable<string>;
}

/** The label of a type: its message, or a readable form of the type name when the message is the name itself. */
export function typedTypeLabel(type: TypedType, text: Pick<CatalogText, 'schema'>): string {
  const label = text.schema(type.label);
  return !label || label === type.type ? humanizeKey(type.type) : label;
}

/** One type as a catalog entry. */
export function catalogItemFromTypedType(
  type: TypedType & { aliases?: readonly string[] },
  text: CatalogText,
  target: PackTargetId,
): CatalogItem {
  const description = type.help ? text.schema(type.help) : undefined;
  return {
    id: type.type,
    label: typedTypeLabel(type, text),
    ...(description && { description }),
    yamlKey: type.type,
    ...(type.category && { category: type.category }),
    ...(type.aliases?.length && { aliases: type.aliases }),
    ...(type.docs && { docs: { url: type.docs, target } }),
    ...(type.premium && { badges: [{ kind: 'premium' as const }] }),
    preview: toYaml({ type: type.type }),
  };
}

/**
 * The types of a typed source as a catalog (`catalogFromTypedSource(field, …)` for a typed list field). Categories
 * come from `TypedType.category`, named by `TypedType.categoryLabel` (a readable id without it), "Other" for the rest.
 */
export function catalogFromTypedSource(source: TypedCatalogSource, { text, target, added }: TypedSourceOptions): CatalogData {
  const types = source.types();
  const used = new Set(added ?? []);
  const items = types.map((type) => ({
    ...catalogItemFromTypedType(type, text, target),
    ...(used.has(type.type) && { added: true }),
  }));
  const labels = new Map(types.map((type) => [type.category, type.categoryLabel]));
  const categories = collectCategories(
    types.map((type) => type.category),
    (id) => categoryName(text, id, labels.get(id)),
  );
  return { items, categories };
}
