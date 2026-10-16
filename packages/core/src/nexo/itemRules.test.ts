import { describe, expect, it } from 'vitest';
import { holdStyleParent } from '../minecraft/vanillaModels';
import type { ConfigObject } from '../project/types';
import { activeProperties, availableProperties, emptyPropertyValue, propertyConflict, propertyYamlPath } from './properties';
import { PROPERTY_BY_ID } from './schema';
import { furnitureConfig, furnitureStateNames, isStringBlock, STACK_MODELS, stateNameError, variantConfigPath, VARIANTS } from './variants';

const owner = (config: ConfigObject) => ({ config });

describe('item properties', () => {
  it('splits a group into active and available properties', () => {
    const item = owner({ material: 'PAPER', Mechanics: { furniture: {} } });
    const furniture = PROPERTY_BY_ID.get('Mechanics.furniture')!;
    expect(activeProperties(item, 'mechanics')).toContain(furniture);
    expect(availableProperties(item, 'mechanics')).not.toContain(furniture);
    expect(activeProperties(item, 'mechanics').length + availableProperties(item, 'mechanics').length).toBe(
      [...PROPERTY_BY_ID.values()].filter((def) => def.group === 'mechanics').length,
    );
  });

  it('names the active property a new one conflicts with', () => {
    const item = owner({ Mechanics: { furniture: {} } });
    expect(propertyConflict(item, PROPERTY_BY_ID.get('Mechanics.custom_block')!)?.id).toBe('Mechanics.furniture');
    expect(propertyConflict(owner({}), PROPERTY_BY_ID.get('Mechanics.custom_block')!)).toBeUndefined();
  });

  it('knows the YAML path and the cleared value of a property', () => {
    const furniture = PROPERTY_BY_ID.get('Mechanics.furniture')!;
    expect(propertyYamlPath(furniture)).toBe('Mechanics.furniture');
    expect(emptyPropertyValue(furniture)).toEqual({});
  });
});

describe('variant rules', () => {
  it('reads furniture states and checks new state names', () => {
    const config: ConfigObject = { Mechanics: { furniture: { states: { open: {}, next_after: 2 } } } };
    expect(furnitureConfig(config)).not.toBeNull();
    expect(furnitureConfig({})).toBeNull();
    expect(furnitureStateNames(config)).toEqual(['open']);
    expect(stateNameError(config, ' ')).toBe('required');
    expect(stateNameError(config, 'a b')).toBe('invalid');
    expect(stateNameError(config, 'open')).toBe('taken');
    expect(stateNameError(config, 'reset_after')).toBe('taken');
    expect(stateNameError(config, ' closed ')).toBeNull();
  });

  it('only gives StringBlocks stack stages', () => {
    expect(isStringBlock({ Mechanics: { custom_block: { type: 'STRINGBLOCK' } } })).toBe(true);
    expect(isStringBlock({ Mechanics: { custom_block: { type: 'NOTEBLOCK' } } })).toBe(false);
    expect(isStringBlock({})).toBe(false);
  });

  it('knows where a variant is written', () => {
    expect(variantConfigPath(VARIANTS[0])).toEqual(['Pack', 'pulling_models']);
    expect(variantConfigPath(STACK_MODELS)).toEqual(['Mechanics', 'custom_block', 'stackable']);
    expect(variantConfigPath(VARIANTS.find((def) => def.kind === 'definition')!)).toBeNull();
  });

  it('offers hold styles only for flat item models', () => {
    expect(holdStyleParent({ parent: 'minecraft:item/handheld' })).toBe('item/handheld');
    expect(holdStyleParent({ parent: 'item/generated' })).toBe('item/generated');
    expect(holdStyleParent({ parent: 'item/generated', elements: [] })).toBeNull();
    expect(holdStyleParent({ parent: 'block/cube_all' })).toBeNull();
  });
});
