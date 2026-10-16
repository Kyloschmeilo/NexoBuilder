/**
 * Every human-readable text in core's nexo data is a message key in the `schema` namespace.
 * This test walks all that data and checks that each key exists in the English and German
 * catalogue – and that the catalogue holds no keys nobody references any more.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEXTURE_TEMPLATES } from '@resourcepackbuilder/minecraft';
import { ARMOR_LAYERS } from '../project/armor';
import { COPY_CATEGORIES, summarizeClipboard, type ItemConfigClipboard } from './copyConfig';
import { type Field, type TextField, validateTextFormat } from './form/fields';
import { keySegment } from '@resourcepackbuilder/utils';
import * as options from './form/options';
import { INGREDIENT_SOURCES, RECIPE_TYPES } from '../project/recipes/model';
import { PROPERTIES, PROPERTY_GROUPS } from './form/schema';
import { FURNITURE_MODEL_SLOTS, STACK_MODELS, stateDef, VARIANTS } from '../project/variants';

type MessageTree = { [key: string]: string | MessageTree };

function loadCatalogue(locale: 'en' | 'de'): MessageTree {
  const url = new URL(`../../../i18n/src/messages/${locale}/schema.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as MessageTree;
}

function lookup(tree: MessageTree, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as MessageTree)[part];
  }
  return node;
}

function leafKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : leafKeys(value, path);
  });
}

function optionKeys(list: options.Option[] | undefined): string[] {
  return (list ?? []).flatMap((o) => (o.label ? [o.label] : []));
}

/** All message keys a field (and its nested fields) references. */
function fieldKeys(field: Field): string[] {
  const keys = [field.label, field.help, field.placeholder].filter((k): k is string => !!k);
  if ('suggestions' in field) keys.push(...optionKeys(field.suggestions));
  switch (field.type) {
    case 'select':
    case 'multiSelect':
      keys.push(...optionKeys(field.options));
      break;
    case 'object':
      keys.push(...field.fields.flatMap(fieldKeys));
      break;
    case 'objectList':
      keys.push(field.itemLabel, ...field.fields.flatMap(fieldKeys));
      break;
    case 'map':
      keys.push(field.keyLabel, ...optionKeys(field.keyOptions), ...fieldKeys(field.value));
      if (field.keyPlaceholder) keys.push(field.keyPlaceholder);
      break;
  }
  return keys;
}

function referencedKeys(): Set<string> {
  const keys: string[] = [];
  for (const group of PROPERTY_GROUPS) keys.push(group.label, group.description);
  for (const property of PROPERTIES) {
    keys.push(property.label, property.description, ...fieldKeys(property.field));
    if (property.hint) keys.push(property.hint);
  }
  for (const value of Object.values(options)) {
    if (Array.isArray(value)) keys.push(...optionKeys(value as options.Option[]));
  }
  for (const layer of ARMOR_LAYERS) keys.push(layer.label);
  for (const def of [...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS, stateDef('on')]) {
    keys.push(def.label, def.description);
    if (def.hint) keys.push(def.hint);
  }
  for (const type of RECIPE_TYPES) keys.push(type.label, type.description);
  for (const source of INGREDIENT_SOURCES) keys.push(source.label);
  for (const category of COPY_CATEGORIES) keys.push(category.label, category.description);
  for (const template of TEXTURE_TEMPLATES) keys.push(template.label, template.description);

  const invalid: Array<[TextField['format'], string]> = [
    ['duration', 'x'],
    ['vector', 'x'],
    ['color', 'x'],
    ['color', '300, 0, 0'],
    ['range', 'x'],
    ['resource', 'X Y'],
  ];
  for (const [format, value] of invalid) keys.push(validateTextFormat(format, value)!);

  const clip: ItemConfigClipboard = {
    format: 'resourcepackbuilder-item-config',
    sourceItemId: 'i',
    sourceName: 'Item',
    sourceNexoId: 'item',
    projectId: 'p',
    config: {},
    rawYaml: 'a: 1',
    assets: {},
    recipes: [],
  };
  for (const summary of summarizeClipboard(clip)) {
    for (const entry of summary.entries) if ('key' in entry) keys.push(entry.key);
  }
  return new Set(keys);
}

describe('schema message keys', () => {
  const keys = referencedKeys();

  it('references only keys that are well-formed', () => {
    const malformed = [...keys].filter((k) => !/^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/.test(k));
    expect(malformed).toEqual([]);
  });

  for (const locale of ['en', 'de'] as const) {
    it(`finds every referenced key in the ${locale} catalogue`, () => {
      const catalogue = loadCatalogue(locale);
      const missing = [...keys].filter((k) => typeof lookup(catalogue, k) !== 'string');
      expect(missing).toEqual([]);
    });
  }

  it('has no unreferenced keys in the catalogue', () => {
    const unused = leafKeys(loadCatalogue('en')).filter((k) => !keys.has(k));
    expect(unused).toEqual([]);
  });
});

describe('message key derivation', () => {
  it('turns ids into key segments', () => {
    expect(keySegment('Components.max_stack_size')).toBe('componentsMaxStackSize');
    expect(keySegment('ItemFlags')).toBe('itemFlags');
    expect(keySegment('CLICK:right:all')).toBe('clickRightAll');
    expect(keySegment('MULTIPLY_SCALAR_1')).toBe('multiplyScalar1');
    expect(keySegment('layer1')).toBe('layer1');
  });

  it('derives path, field key and property messages from the property id', () => {
    for (const property of PROPERTIES) {
      const scope = `properties.${keySegment(property.id)}`;
      expect(property.label).toBe(`${scope}.label`);
      expect(property.description).toBe(`${scope}.description`);
      if (property.hint) expect(property.hint).toBe(`${scope}.hint`);
      expect(property.field.label).toBe(`${scope}.field.label`);
      const path = property.storage === 'config' ? property.path : [property.id];
      if (property.storage === 'config') expect(path).toEqual(property.id.split('.'));
      expect(property.field.key).toBe(path[path.length - 1]);
    }
  });

  /** Fields below a property: keys at their position, or in a shared scope (`shared.*`). */
  it('derives the messages of nested fields from their position', () => {
    const misplaced: string[] = [];
    const check = (field: Field, scope: string) => {
      const own = field.label.startsWith('shared.') ? field.label.replace(/\.label$/, '') : scope;
      const expectAt = (key: string | undefined, suffix: string) => {
        if (key && key !== `${own}.${suffix}` && !key.startsWith('shared.')) misplaced.push(key);
      };
      expectAt(field.help, 'help');
      expectAt(field.placeholder, 'placeholder');
      if (field.type === 'objectList') expectAt(field.itemLabel, 'itemLabel');
      if (field.type === 'map') {
        expectAt(field.keyLabel, 'keyLabel');
        expectAt(field.keyPlaceholder, 'keyPlaceholder');
        if (field.value.label) expectAt(field.value.label, 'value.label');
      }
      if (field.type === 'object' || field.type === 'objectList') {
        for (const child of field.fields) {
          const childScope = `${own}.fields.${child.key === '*' ? 'entries' : keySegment(child.key)}`;
          if (!child.label.startsWith('shared.') && child.label !== `${childScope}.label`) misplaced.push(child.label);
          check(child, childScope);
        }
      }
    };
    for (const property of PROPERTIES) check(property.field, `properties.${keySegment(property.id)}.field`);
    expect(misplaced).toEqual([]);
  });

  it('derives option, variant and armor layer labels from their values', () => {
    for (const option of options.ATTRIBUTE_SLOTS) expect(option.label).toBe(`options.attributeSlots.${keySegment(option.value)}.label`);
    for (const def of [...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS])
      expect(def.label).toBe(`variants.${keySegment(def.slot)}.label`);
    for (const layer of ARMOR_LAYERS) expect(layer.label).toBe(`armor.layers.${keySegment(layer.key)}`);
  });
});
