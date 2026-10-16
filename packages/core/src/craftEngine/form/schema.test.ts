/**
 * The CraftEngine form: unique property paths, no property on a managed path, valid default values, and every
 * message key in the English and German `ceSchema` catalogue (with no keys nobody references).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkFieldValue, fieldToSchema } from '../../form/fieldSchema';
import { formMessageKeys } from '../../form/messageKeys';
import { CRAFT_ENGINE_FORM } from './schema';

type MessageTree = { [key: string]: string | MessageTree };

function loadCatalogue(locale: 'en' | 'de'): MessageTree {
  const url = new URL(`../../../../i18n/src/messages/${locale}/ceSchema.json`, import.meta.url);
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

const configPaths = CRAFT_ENGINE_FORM.properties.flatMap((p) => (p.storage === 'config' ? [p.path.join('.')] : []));

describe('CraftEngine form', () => {
  it('uses the ceSchema namespace and shows data and settings as tabs', () => {
    expect(CRAFT_ENGINE_FORM.target).toBe('craftengine');
    expect(CRAFT_ENGINE_FORM.messages).toBe('ceSchema');
    expect(CRAFT_ENGINE_FORM.tabs.map((tab) => tab.id)).toEqual(['data', 'settings']);
  });

  it('stores every property in the config at its own path', () => {
    expect(configPaths).toHaveLength(CRAFT_ENGINE_FORM.properties.length);
    expect(new Set(configPaths).size).toBe(configPaths.length);
  });

  it('puts every property in a group of the form', () => {
    const groups = new Set(CRAFT_ENGINE_FORM.groups.map((group) => group.id));
    expect(CRAFT_ENGINE_FORM.properties.filter((p) => !groups.has(p.group))).toEqual([]);
  });

  it('offers no property at the material or the display name', () => {
    expect(CRAFT_ENGINE_FORM.managedPaths).toEqual(['material', 'data.item_name']);
    expect(configPaths.filter((path) => CRAFT_ENGINE_FORM.managedPaths.includes(path))).toEqual([]);
  });

  it('marks the client-bound keys as Premium only', () => {
    const premium = CRAFT_ENGINE_FORM.properties.filter((p) => p.badge === 'premium').map((p) => p.id);
    expect(premium).toEqual(['client_bound_material', 'client_bound_data']);
  });

  for (const property of CRAFT_ENGINE_FORM.properties) {
    it(`accepts the default value of ${property.id}`, () => {
      const value = property.defaultValue();
      expect(fieldToSchema(property.field).safeParse(value).success).toBe(true);
      expect(checkFieldValue(value, property.field)).toEqual([]);
    });
  }
});

describe('ceSchema message keys', () => {
  const keys = new Set(formMessageKeys(CRAFT_ENGINE_FORM));

  it('references only keys that are well-formed', () => {
    expect([...keys].filter((k) => !/^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/.test(k))).toEqual([]);
  });

  for (const locale of ['en', 'de'] as const) {
    it(`finds every referenced key in the ${locale} catalogue`, () => {
      const catalogue = loadCatalogue(locale);
      expect([...keys].filter((k) => typeof lookup(catalogue, k) !== 'string')).toEqual([]);
    });
  }

  it('has no unreferenced keys in the catalogue', () => {
    expect(leafKeys(loadCatalogue('en')).filter((k) => !keys.has(k))).toEqual([]);
  });
});
