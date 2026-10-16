import { describe, expect, it } from 'vitest';
import { getTextureTemplate, TEXTURE_TEMPLATES, templateSlots } from './model/textureModel';
import { followTextureRef } from './model/textureRefs';
import { isGeneratedItemParent, MAX_ITEM_LAYERS, vanillaParentElements, vanillaParentTextureKeys } from './vanillaModels';

describe('vanilla models', () => {
  it('knows the texture keys of every texture template parent', () => {
    for (const template of TEXTURE_TEMPLATES) {
      const keys = vanillaParentTextureKeys(template.parent);
      expect(keys, template.id).not.toBeNull();
      // Every slot the template asks for is read by the parent
      for (const slot of template.slots) expect(keys, template.id).toContain(slot);
      if (!template.multiLayer) expect([...(keys ?? [])].sort(), template.id).toEqual([...template.slots].sort());
    }
  });

  it('recognises generated parents with and without namespace', () => {
    expect(isGeneratedItemParent('minecraft:item/handheld_mace')).toBe(true);
    expect(isGeneratedItemParent('builtin/entity')).toBe(false);
    expect(vanillaParentElements('minecraft:block/cross')).toHaveLength(2);
    expect(vanillaParentElements('block/stairs')).toBeNull();
  });

  it('follows texture references to their end', () => {
    expect(followTextureRef({ a: '#b', b: 'ns:item/x' }, '#a')).toBe('ns:item/x');
    expect(followTextureRef({ a: '#b', b: '#a' }, '#a')).toBeNull();
    expect(followTextureRef({}, '#a')).toBeNull();
    expect(followTextureRef(undefined, 'item/x')).toBe('item/x');
  });

  it('offers one layer per PNG for multi-layer templates, up to the limit', () => {
    const generated = getTextureTemplate('generated');
    expect(templateSlots(generated, 2)).toEqual(['layer0', 'layer1']);
    expect(templateSlots(generated, 99)).toHaveLength(MAX_ITEM_LAYERS);
    expect(templateSlots(getTextureTemplate('cube_column'), 1)).toEqual(getTextureTemplate('cube_column').slots);
  });
});
