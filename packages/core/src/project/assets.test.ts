import { describe, expect, it } from 'vitest';
import { referencedAssetIds } from './assets';
import { createItem } from './factory';

describe('item assets', () => {
  it('collects asset references from config and armor', () => {
    const item = createItem({ displayName: 'x', itemId: 'x', folderId: 'f', model: null });
    item.config.Pack = { texture: '@asset:t1' };
    item.armor = { set: 'x', layer1: '@asset:t2' };
    expect([...referencedAssetIds(item)].sort()).toEqual(['t1', 't2']);
  });
});
