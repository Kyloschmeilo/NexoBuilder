import { describe, expect, it } from 'vitest';
import { CE_LOGIC, newCraftEngineBlock } from '@resourcepackbuilder/core/craftEngine';
import type { CatalogText } from '../../../components/catalog';
import { BLOCK_BEHAVIOR_CATEGORY_ORDER, blockBehaviorCatalog, blockBehaviorPreview, COMMON_BLOCK_BEHAVIORS } from './behaviorCatalog';

// Without messages, labels fall back to the readable type id
const text: CatalogText = { schema: () => '', hasSchema: () => false, conflict: (name) => name, other: 'Other' };
const NAMES: Record<string, string> = { crop_block: 'Crop', slab_block: 'Slab' };
const options = (block: Record<string, unknown>) => ({
  text,
  block,
  itemKey: 'ruby:ruby_crop',
  presetName: (type: string) => NAMES[type],
  presetNote: 'sets up states',
});

describe('the block behavior catalog', () => {
  it('lists every behavior, by category in a fixed order', () => {
    const { items, categories } = blockBehaviorCatalog(options(newCraftEngineBlock()), []);
    expect(items).toHaveLength(CE_LOGIC.blockBehaviors.length);
    expect(categories.map((category) => category.id)).toEqual(BLOCK_BEHAVIOR_CATEGORY_ORDER);
  });

  it('uses the editor names of presets, keeps the readable id searchable and marks the common ones', () => {
    const { items } = blockBehaviorCatalog(options(newCraftEngineBlock()), ['slab_block']);
    const crop = items.find((item) => item.id === 'crop_block');
    expect(crop).toMatchObject({ label: 'Crop', common: true, note: 'sets up states' });
    expect(crop?.aliases).toContain('Crop block');
    expect(items.find((item) => item.id === 'slab_block')?.added).toBe(true);
    expect(
      items
        .filter((item) => item.common)
        .map((item) => item.id)
        .sort(),
    ).toEqual([...COMMON_BLOCK_BEHAVIORS].sort());
    // A behavior without a preset keeps its readable id as the name and gets no preset note
    expect(items.find((item) => item.id === 'bouncing_block')).toMatchObject({ label: 'Bouncing block' });
    expect(items.find((item) => item.id === 'bouncing_block')?.note).toBeUndefined();
  });

  it('previews what adding writes: the preset while the block has no main behavior, else one further behavior', () => {
    const plain = newCraftEngineBlock();
    const preset = blockBehaviorPreview(plain, 'crop_block', 'ruby:ruby_crop');
    expect(preset).toContain('behavior:\n  type: crop_block');
    expect(preset).toContain('states:');
    expect(preset).toContain('liquid_flowable_block');
    const withMain = { ...plain, behavior: { type: 'lamp_block' } };
    expect(blockBehaviorPreview(withMain, 'crop_block', 'ruby:ruby_crop')).toBe('behaviors:\n  - type: crop_block\n');
    expect(blockBehaviorCatalog(options(withMain), []).items.find((item) => item.id === 'crop_block')?.note).toBeUndefined();
  });
});
