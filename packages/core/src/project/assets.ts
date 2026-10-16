/** Extra textures of an item (`item.assets`), referenced as "@asset:<id>" from config and armor. */
import type { ModelTexture } from '../model/types';
import { forEachLeaf } from '../object';
import { parseAssetToken } from '../tokens';
import type { Item } from './types';

/** The asset a value refers to, if it is an asset token. */
export function resolveAsset(item: Item, value: unknown): ModelTexture | undefined {
  const id = parseAssetToken(value);
  return id === null ? undefined : item.assets[id];
}

/** IDs of all assets referenced anywhere in the item's configuration or armor settings. */
export function referencedAssetIds(item: Item): Set<string> {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    const id = parseAssetToken(value);
    if (id !== null) ids.add(id);
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
