/** Placeholders that project data may contain; they are replaced on export. */

/** A token made of a fixed prefix and an ID. */
function prefixedToken(prefix: string) {
  return {
    make: (id: string) => prefix + id,
    /** The ID if `value` is such a token, otherwise null */
    parse: (value: unknown): string | null => (typeof value === 'string' && value.startsWith(prefix) ? value.slice(prefix.length) : null),
  };
}

/** "The model of this item" (item configs) – replaced by the model's resource location. */
export const MODEL_TOKEN = '@model';

/** A reference to an extra texture uploaded to the item (`item.assets`), see project/assets. */
const ASSET = prefixedToken('@asset:');
/** An imported texture in the textures of a model JSON, replaced by its path in the pack. */
const TEXTURE = prefixedToken('$tex:');

/** "@asset:<id>" */
export function assetToken(assetId: string): string {
  return ASSET.make(assetId);
}

/** The asset ID if `value` is an asset token. */
export function parseAssetToken(value: unknown): string | null {
  return ASSET.parse(value);
}

/** Placeholder for an imported texture in the model JSON. */
export function texturePlaceholder(textureId: string): string {
  return TEXTURE.make(textureId);
}

/** Returns the texture ID if `value` is a placeholder. */
export function parseTexturePlaceholder(value: unknown): string | null {
  return TEXTURE.parse(value);
}
