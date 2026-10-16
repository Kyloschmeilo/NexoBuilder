/** Identifier rules of Minecraft resource packs and Nexo. */

/** Nexo item IDs (also used as a path in the resource pack), glyph and painting IDs. */
export const ITEM_ID_PATTERN = /^[a-z0-9_]+$/;
/** Resource pack namespace; also the rule for single path segments such as armor set or sound IDs. */
export const NAMESPACE_PATTERN = /^[a-z0-9_.-]+$/;
/** Name of the external pack folder (pack/external_packs/<name>). */
export const PACK_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
/** A resource location with optional namespace, e.g. "minecraft:block/stone" or "item/ruby". */
export const RESOURCE_LOCATION_PATTERN = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

/** The namespace a resource location without one belongs to. */
export const MINECRAFT_NAMESPACE = 'minecraft';

export interface ResourceLocation {
  namespace: string;
  path: string;
}

/** Splits "ns:path" (a missing namespace means `minecraft`, as in Minecraft itself). */
export function parseResourceLocation(ref: string): ResourceLocation {
  const colon = ref.indexOf(':');
  return colon < 0 ? { namespace: MINECRAFT_NAMESPACE, path: ref } : { namespace: ref.slice(0, colon), path: ref.slice(colon + 1) };
}

/** "ns:path" */
export function formatResourceLocation(namespace: string, path: string): string {
  return `${namespace}:${path}`;
}

/** "minecraft:block/stone" → "block/stone"; other namespaces stay. */
export function stripMinecraftNamespace(ref: string): string {
  return ref.startsWith(`${MINECRAFT_NAMESPACE}:`) ? ref.slice(MINECRAFT_NAMESPACE.length + 1) : ref;
}

/** Whether the reference points into vanilla Minecraft (no or the `minecraft` namespace). */
export function isVanillaReference(ref: string): boolean {
  return parseResourceLocation(ref).namespace === MINECRAFT_NAMESPACE;
}

/** Last path segment, e.g. "minecraft:item/ruby_sword" → "ruby_sword". */
export function resourceBaseName(ref: string): string {
  const { path } = parseResourceLocation(ref);
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Characters of item, glyph and painting IDs (a regex character class body). */
export const ID_CHARS = 'a-z0-9_';
/** Characters of sound IDs and namespaces, which may contain dots and dashes (`block.ruby.place`). */
export const SOUND_ID_CHARS = 'a-z0-9_.-';

/**
 * Normalises an ID while it is typed: lower case, characters outside `allowed` become `_`. Unlike `toIdentifier` it
 * keeps leading, trailing and repeated underscores, so the text does not change under the cursor.
 */
export function normalizeTypedId(text: string, allowed: string = ID_CHARS): string {
  return text.toLowerCase().replace(new RegExp(`[^${allowed}]`, 'g'), '_');
}

export type NamespaceError = 'invalid' | 'minecraft' | 'nexo';

/** Why a namespace should not be used (`nexo` only deserves a warning), null if it is fine. */
export function namespaceError(namespace: string): NamespaceError | null {
  if (!NAMESPACE_PATTERN.test(namespace)) return 'invalid';
  if (namespace === 'minecraft') return 'minecraft';
  if (namespace === 'nexo') return 'nexo';
  return null;
}

export type ItemIdSyntaxError = 'missing' | 'invalid';

/** Syntax check of a Nexo item ID (uniqueness is checked by `validateItemId` in project/ids). */
export function itemIdSyntaxError(id: string): ItemIdSyntaxError | null {
  if (!id) return 'missing';
  return ITEM_ID_PATTERN.test(id) ? null : 'invalid';
}
