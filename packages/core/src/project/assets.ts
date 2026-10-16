/** Extra textures of an item (`item.assets`), referenced as "@asset:<id>" from config and armor. */
import { ASSET_TOKEN_PREFIX } from '../nexo/tokens';
import type { ModelTexture } from '../model/types';
import { forEachLeaf } from '../object';
import type { Item } from './types';

export function assetToken(assetId: string): string {
  return ASSET_TOKEN_PREFIX + assetId;
}

/** The asset a value refers to, if it is an asset token. */
export function resolveAsset(item: Item, value: unknown): ModelTexture | undefined {
  if (typeof value !== 'string' || !value.startsWith(ASSET_TOKEN_PREFIX)) return undefined;
  return item.assets[value.slice(ASSET_TOKEN_PREFIX.length)];
}

/** IDs of all assets referenced anywhere in the item's configuration or armor settings. */
export function referencedAssetIds(item: Item): Set<string> {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'string' && value.startsWith(ASSET_TOKEN_PREFIX)) ids.add(value.slice(ASSET_TOKEN_PREFIX.length));
  };
  forEachLeaf(item.config, visit);
  forEachLeaf(item.armor, visit);
  return ids;
}

/** Removes assets that are no longer referenced (mutates the item – for Immer drafts). */
export function pruneUnusedAssets(item: Item): void {
  const used = referencedAssetIds(item);
  for (const assetId of Object.keys(item.assets)) {
    if (!used.has(assetId)) delete item.assets[assetId];
  }
}
