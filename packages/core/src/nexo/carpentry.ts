/**
 * The Carpentry addon (docs: addons/carpentry): extra custom block types for Nexo. A project says it has the addon
 * (`settings.carpentryAddon`); only then does the custom block editor offer these types (see ./suggestions.ts). Each
 * type has four variations at most; chains, lanterns and bars have none and need a 1.21.10 server.
 */

/** The custom block types the addon adds (`Mechanics.custom_block.type`). */
export const CARPENTRY_BLOCK_TYPES = ['STAIR', 'SLAB', 'DOOR', 'TRAPDOOR', 'GRATE', 'CHAIN', 'LANTERN', 'BARS'] as const;

/** The highest `custom_variation` of the Carpentry types that have variations. */
export const CARPENTRY_VARIATION_LIMIT = 4;

/** The Carpentry types without variations, which need a newer server. */
export const CARPENTRY_LATE_TYPES: readonly string[] = ['CHAIN', 'LANTERN', 'BARS'];

/** The Minecraft version the late Carpentry types need (the version list's 1.21.9 entry covers 1.21.10). */
export const CARPENTRY_LATE_VERSION = '1.21.10';

/** The version list entry from which on the late types are fine. */
export const CARPENTRY_LATE_MIN_LISTED_VERSION = '1.21.9';

/** Whether `type` is one of the addon's block types. */
export function isCarpentryBlockType(type: string): boolean {
  return (CARPENTRY_BLOCK_TYPES as readonly string[]).includes(type);
}
