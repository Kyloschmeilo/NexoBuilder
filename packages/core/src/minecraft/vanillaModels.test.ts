import { describe, expect, it } from 'vitest';
import { TEXTURE_TEMPLATES } from '../model/textureModel';
import { followTextureRef } from '../model/textureRefs';
import { isGeneratedItemParent, vanillaParentElements, vanillaParentTextureKeys } from './vanillaModels';

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
});
