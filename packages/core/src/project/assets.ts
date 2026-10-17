/** Extra textures of an item (`item.assets`), referenced as "@asset:<id>" from config and armor. */
import type { ModelTexture } from '@resourcepackbuilder/minecraft';
import { assetToken, forEachLeaf, parseAssetToken } from '@resourcepackbuilder/utils';
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

/**
 * Whether the item uses the asset: referenced in its configuration or armor settings, or named in its additional
 * YAML. `referenced` is the item's {@link referencedAssetIds}, passed in when several assets are checked.
 */
export function isAssetUsed(item: Item, assetId: string, referenced: Set<string> = referencedAssetIds(item)): boolean {
  return referenced.has(assetId) || item.rawYaml.includes(assetToken(assetId));
}

/** Removes assets the item no longer uses (mutates the item – for Immer drafts). */
export function pruneUnusedAssets(item: Item): void {
  const referenced = referencedAssetIds(item);
  for (const assetId of Object.keys(item.assets)) {
    if (!isAssetUsed(item, assetId, referenced)) delete item.assets[assetId];
  }
}
