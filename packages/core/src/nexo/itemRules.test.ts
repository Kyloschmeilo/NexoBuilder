import { describe, expect, it } from 'vitest';
import { holdStyleParent } from '@resourcepackbuilder/minecraft';
import type { ConfigObject } from '../project/types';
import {
  activeProperties,
  availableProperties,
  emptyPropertyValue,
  propertyById,
  propertyConflict,
  propertyYamlPath,
} from '../form/properties';
import { NEXO_FORM } from './form/schema';
import {
  DIRECTIONAL_MODEL_SLOTS,
  directionalFaces,
  furnitureConfig,
  furnitureStateNames,
  isStringBlock,
  STACK_MODELS,
  stateNameError,
  variantConfigPath,
  VARIANTS,
} from '../project/variants';

const owner = (config: ConfigObject) => ({ config });

describe('item properties', () => {
  it('splits a group into active and available properties', () => {
    const item = owner({ material: 'PAPER', Mechanics: { furniture: {} } });
    const furniture = propertyById(NEXO_FORM, 'Mechanics.furniture')!;
    expect(activeProperties(NEXO_FORM, item, 'mechanics')).toContain(furniture);
    expect(availableProperties(NEXO_FORM, item, 'mechanics')).not.toContain(furniture);
    expect(activeProperties(NEXO_FORM, item, 'mechanics').length + availableProperties(NEXO_FORM, item, 'mechanics').length).toBe(
      NEXO_FORM.properties.filter((def) => def.group === 'mechanics').length,
    );
  });

  it('names the active property a new one conflicts with', () => {
    const item = owner({ Mechanics: { furniture: {} } });
    expect(propertyConflict(NEXO_FORM, item, propertyById(NEXO_FORM, 'Mechanics.custom_block')!)?.id).toBe('Mechanics.furniture');
    expect(propertyConflict(NEXO_FORM, owner({}), propertyById(NEXO_FORM, 'Mechanics.custom_block')!)).toBeUndefined();
  });

  it('knows the YAML path and the cleared value of a property', () => {
    const furniture = propertyById(NEXO_FORM, 'Mechanics.furniture')!;
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
    const north = DIRECTIONAL_MODEL_SLOTS.find((def) => def.slot === 'dir_north')!;
    expect(variantConfigPath(north)).toEqual(['Mechanics', 'custom_block', 'directional', 'north_model']);
  });

  it('gives each directional type its faces', () => {
    const directional = (type: string): ConfigObject => ({ Mechanics: { custom_block: { type: 'NOTEBLOCK', directional: { type } } } });
    expect(directionalFaces(directional('LOG'))).toEqual(['y', 'x', 'z']);
    expect(directionalFaces(directional('furnace'))).toEqual(['north', 'south', 'east', 'west']);
    expect(directionalFaces(directional('BARREL'))).toHaveLength(6);
    expect(directionalFaces(directional('SPIRAL'))).toEqual([]);
    expect(directionalFaces({ Mechanics: { custom_block: { type: 'NOTEBLOCK' } } })).toEqual([]);
  });

  it('offers hold styles only for flat item models', () => {
    expect(holdStyleParent({ parent: 'minecraft:item/handheld' })).toBe('item/handheld');
    expect(holdStyleParent({ parent: 'item/generated' })).toBe('item/generated');
    expect(holdStyleParent({ parent: 'item/generated', elements: [] })).toBeNull();
    expect(holdStyleParent({ parent: 'block/cube_all' })).toBeNull();
  });
});
