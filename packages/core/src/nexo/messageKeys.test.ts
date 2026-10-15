/**
 * Every human-readable text in core's nexo data is a message key in the `schema` namespace.
 * This test walks all that data and checks that each key exists in the English and German
 * catalogue – and that the catalogue holds no keys nobody references any more.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARMOR_LAYERS } from './armor';
import { COPY_CATEGORIES, summarizeClipboard, type ItemConfigClipboard } from './copyConfig';
import { validateTextFormat, type Field, type TextField } from './fields';
import * as options from './options';
import { INGREDIENT_SOURCES, RECIPE_TYPES } from './recipes';
import { PROPERTIES, PROPERTY_GROUPS } from './schema';
import { TEXTURE_TEMPLATES } from '../model/textureModel';
import { FURNITURE_MODEL_SLOTS, STACK_MODELS, stateDef, VARIANTS } from './variants';

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
  const keys = [field.label, field.help].filter((k): k is string => !!k);
  if ('placeholder' in field && field.placeholder) keys.push(field.placeholder);
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

  const clip = { config: {}, rawYaml: 'a: 1', recipes: [] } as unknown as ItemConfigClipboard;
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
