import { describe, expect, it } from 'vitest';
import { getPropertyValue, setPropertyValue } from '../form/properties';
import {
  appearanceStateSource,
  CE_APPEARANCE_MODEL_FIELD,
  CE_APPEARANCE_MODELS_FIELD,
  propertyNameHint,
  variantSettingsProperties,
  withAutoStateId,
  withExactState,
  withFixedId,
} from './blockVariants';
import { CE_BLOCK_SETTINGS_PROPERTIES } from './form/schema/blockSettings';

describe('variant settings', () => {
  it('offers the block settings at the variant, without the templates', () => {
    const defs = variantSettingsProperties('facing=north,open=true');
    const hardness = defs.find((def) => def.id.endsWith('.hardness'));
    expect(hardness?.storage === 'config' && hardness.path).toEqual([
      'block',
      'states',
      'variants',
      'facing=north,open=true',
      'settings',
      'hardness',
    ]);
    expect(defs.map((def) => def.id.split('.settings.')[1])).not.toContain('template');
    expect(defs.map((def) => def.id.split('.settings.')[1])).not.toContain('arguments');
    expect(defs).toHaveLength(CE_BLOCK_SETTINGS_PROPERTIES.length - 2);
    // The texts and docs stay those of the block's setting
    const original = CE_BLOCK_SETTINGS_PROPERTIES.find((def) => def.id === 'block.settings.hardness');
    expect(hardness?.label).toBe(original?.label);
    expect(hardness?.docs).toBe(original?.docs);
    expect(new Set(defs.map((def) => def.id)).size).toBe(defs.length);
  });

  it('reads and writes the settings of the variant', () => {
    const owner = { config: { block: { states: { variants: { 'waterlogged=true': { appearance: 'wet' } } } } } };
    const fluid = variantSettingsProperties('waterlogged=true').find((def) => def.id.endsWith('.fluid_state'))!;
    setPropertyValue(owner, fluid, 'water');
    expect(owner.config.block.states.variants['waterlogged=true']).toEqual({ appearance: 'wet', settings: { fluid_state: 'water' } });
    expect(getPropertyValue(owner, fluid)).toBe('water');
  });
});

describe('appearance state', () => {
  it('tells an auto_state group, a shared one and an exact vanilla state apart', () => {
    expect(appearanceStateSource({ auto_state: 'solid' })).toEqual({ kind: 'auto', group: 'solid', id: null });
    expect(appearanceStateSource({ auto_state: { type: 'sugar_cane', id: 'transparent' } })).toEqual({
      kind: 'auto',
      group: 'sugar_cane',
      id: 'transparent',
    });
    expect(appearanceStateSource({ state: 'minecraft:note_block[note=0]' })).toEqual({
      kind: 'state',
      state: 'minecraft:note_block[note=0]',
    });
    expect(appearanceStateSource({})).toEqual({ kind: 'auto', group: '', id: null });
  });

  it('shares a group by id and goes back to the simple form without one', () => {
    expect(withAutoStateId({ auto_state: 'solid', model: { y: 90 } }, 'shared')).toEqual({
      auto_state: { type: 'solid', id: 'shared' },
      model: { y: 90 },
    });
    expect(withAutoStateId({ auto_state: { type: 'solid', id: 'x' } }, '')).toEqual({ auto_state: 'solid' });
  });

  it('switches between an exact vanilla state and an auto_state group', () => {
    expect(withExactState({ auto_state: 'solid', model: { path: 'a:b' } }, 'minecraft:stone')).toEqual({
      state: 'minecraft:stone',
      model: { path: 'a:b' },
    });
    expect(withExactState({ state: 'minecraft:stone' }, null)).toEqual({ auto_state: 'solid' });
  });

  it('sets and removes the fixed internal id', () => {
    expect(withFixedId({ auto_state: 'solid' }, 100)).toEqual({ id: 100, auto_state: 'solid' });
    expect(withFixedId({ id: 3, auto_state: 'solid' }, undefined)).toEqual({ auto_state: 'solid' });
  });
});

describe('appearance model fields', () => {
  it('edits textures, z and uvlock of a model, and a weighted list of models', () => {
    expect(CE_APPEARANCE_MODEL_FIELD.fields.map((f) => f.key)).toEqual(['textures', 'z', 'uvlock']);
    expect(CE_APPEARANCE_MODEL_FIELD.fields.find((f) => f.key === 'z')?.minVersion).toBe('1.21.11');
    expect(CE_APPEARANCE_MODELS_FIELD.fields.map((f) => f.key)).toEqual(['path', 'weight', 'x', 'y', 'z', 'uvlock']);
  });
});

describe('property name hints', () => {
  it('knows the names CraftEngine fills in on placement and the type each needs', () => {
    expect(propertyNameHint('facing_clockwise', 'horizontal_direction')).toEqual({ name: 'facing_clockwise', fits: true });
    expect(propertyNameHint('rotation', 'boolean')).toEqual({ name: 'rotation', fits: false });
    expect(propertyNameHint('facing', 'direction')?.fits).toBe(true);
    expect(propertyNameHint('facing', 'horizontal_direction')?.fits).toBe(true);
    expect(propertyNameHint('lit', 'boolean')).toBeNull();
  });
});
