import { describe, expect, it } from 'vitest';
import type { ConfigObject } from '../project/types';
import { field, properties } from './build';
import {
  activeProperties,
  availableProperties,
  emptyPropertyValue,
  propertyById,
  propertyConflict,
  propertyYamlPath,
  setPropertyValue,
  unknownConfigPaths,
} from './properties';
import type { FormSchema } from './types';

const SCHEMA: FormSchema = {
  target: 'nexo',
  groups: [{ id: 'main', label: 'groups.main.label', description: 'groups.main.description' }],
  properties: [
    ...properties('main', {
      lore: { field: field.stringList(), defaultValue: () => [] },
      'Box.round': { field: field.boolean(), defaultValue: () => true, conflicts: ['Box.square'] },
      'Box.square': { field: field.object({ size: field.number() }), defaultValue: () => ({}), conflicts: ['Box.round'] },
      armor: { field: field.yaml(), defaultValue: () => ({}), storage: 'armor' },
    }),
    ...properties('other', { color: { field: field.text(), defaultValue: () => '' } }),
  ],
  messages: 'test',
  managedPaths: ['material'],
  tabs: [{ id: 'main', group: 'main' }],
};

const owner = (config: ConfigObject) => ({ config });

describe('form properties', () => {
  it('finds properties by id and derives paths and message keys', () => {
    const square = propertyById(SCHEMA, 'Box.square')!;
    expect(square).toMatchObject({ group: 'main', storage: 'config', path: ['Box', 'square'], label: 'properties.boxSquare.label' });
    expect(propertyById(SCHEMA, 'missing')).toBeUndefined();
    expect(propertyYamlPath(square)).toBe('Box.square');
    expect(propertyYamlPath(propertyById(SCHEMA, 'armor')!)).toBeNull();
    expect(emptyPropertyValue(square)).toEqual({});
  });

  it('splits a group into active and available properties', () => {
    const item = owner({ Box: { round: true }, color: 'red' });
    expect(activeProperties(SCHEMA, item, 'main').map((def) => def.id)).toEqual(['Box.round']);
    expect(availableProperties(SCHEMA, item, 'main').map((def) => def.id)).toEqual(['lore', 'Box.square', 'armor']);
    expect(activeProperties(SCHEMA, item, 'other').map((def) => def.id)).toEqual(['color']);
  });

  it('names the active property a new one conflicts with', () => {
    const square = propertyById(SCHEMA, 'Box.square')!;
    expect(propertyConflict(SCHEMA, owner({ Box: { round: false } }), square)?.id).toBe('Box.round');
    expect(propertyConflict(SCHEMA, owner({}), square)).toBeUndefined();
  });

  it('writes config properties at their path and removes them', () => {
    const item = owner({});
    setPropertyValue(item, propertyById(SCHEMA, 'Box.round')!, true);
    expect(item.config).toEqual({ Box: { round: true } });
    setPropertyValue(item, propertyById(SCHEMA, 'Box.round')!, undefined);
    expect(item.config).toEqual({});
  });

  it('reports config paths that belong to no property, looking into property sections', () => {
    const config = { material: 'PAPER', lore: ['a'], Box: { round: true, other: 1 }, extra: { x: 1 } };
    expect(unknownConfigPaths(SCHEMA, config)).toEqual([['material'], ['Box', 'other'], ['extra']]);
  });
});
