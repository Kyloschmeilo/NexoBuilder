import { describe, expect, it } from 'vitest';
import { createTexture } from '@resourcepackbuilder/minecraft';
import { isAssetUsed, pruneUnusedAssets, referencedAssetIds } from './assets';
import { createItem } from './factory';

describe('item assets', () => {
  it('collects asset references from config and armor', () => {
    const item = createItem({ displayName: 'x', itemId: 'x', folderId: 'f', model: null });
    item.config.Pack = { texture: '@asset:t1' };
    item.armor = { set: 'x', layer1: '@asset:t2' };
    expect([...referencedAssetIds(item)].sort()).toEqual(['t1', 't2']);
  });

  it('counts an asset named in the additional YAML as used and keeps it when pruning', () => {
    const item = createItem({ displayName: 'x', itemId: 'x', folderId: 'f', model: null });
    item.assets = { kept: createTexture('kept', 'a.png', ''), gone: createTexture('gone', 'b.png', '') };
    item.rawYaml = 'Pack:\n  texture: "@asset:kept"\n';
    expect(isAssetUsed(item, 'kept')).toBe(true);
    expect(isAssetUsed(item, 'gone')).toBe(false);
    pruneUnusedAssets(item);
    expect(Object.keys(item.assets)).toEqual(['kept']);
  });
});
