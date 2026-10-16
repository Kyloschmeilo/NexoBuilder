/**
 * The CraftEngine form: unique property paths, no property on a managed path, valid default values, and every
 * message key in the English and German `ceSchema` catalogue (with no keys nobody references, except overrides of
 * shared `schema` keys).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkFieldValue, fieldToSchema } from '../../form/fieldSchema';
import { fieldMessageKeys, formMessageKeys } from '../../form/messageKeys';
import { CE_LOGIC, logicMessageKeys } from '../logic';
import { CE_LOOT_SOURCE_LIST } from '../loot';
import { CRAFT_ENGINE_FORM } from './schema';

type MessageTree = { [key: string]: string | MessageTree };

function loadCatalogue(locale: 'en' | 'de', namespace = 'ceSchema'): MessageTree {
  const url = new URL(`../../../../i18n/src/messages/${locale}/${namespace}.json`, import.meta.url);
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
  it('uses the ceSchema namespace and shows data, settings, events and loot as tabs', () => {
    expect(CRAFT_ENGINE_FORM.target).toBe('craftengine');
    expect(CRAFT_ENGINE_FORM.messages).toBe('ceSchema');
    expect(CRAFT_ENGINE_FORM.tabs.map((tab) => tab.id)).toEqual(['data', 'settings', 'events', 'loot']);
  });

  it('shows the loot of the block or the furniture the item places', () => {
    const loot = CRAFT_ENGINE_FORM.tabs.find((tab) => tab.id === 'loot')!;
    expect(loot.only?.({ material: 'paper' })).toEqual([]);
    expect(loot.only?.({ block: { loot: { template: 'default:loot_table/self' } } })).toEqual(['block.loot']);
    expect(loot.only?.({ furniture: {} })).toEqual(['furniture.loot']);
  });

  it('stores every property in the config at its own path, except the armor and the translations on the item', () => {
    const itemFields = CRAFT_ENGINE_FORM.properties.filter((p) => p.storage !== 'config');
    expect(itemFields.map((p) => [p.id, p.group, p.storage])).toEqual([
      ['translations', 'general', 'translations'],
      ['armor', 'settings', 'armor'],
    ]);
    expect(configPaths).toHaveLength(CRAFT_ENGINE_FORM.properties.length - itemFields.length);
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
  // The logic catalogs (conditions, functions …) and the project's loot sources keep their texts in the same catalogue
  const keys = new Set([
    ...formMessageKeys(CRAFT_ENGINE_FORM),
    ...Object.values(CE_LOGIC).flatMap((types) => logicMessageKeys(types)),
    ...fieldMessageKeys(CE_LOOT_SOURCE_LIST),
  ]);

  it('references only keys that are well-formed', () => {
    expect([...keys].filter((k) => !/^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/.test(k))).toEqual([]);
  });

  for (const locale of ['en', 'de'] as const) {
    it(`finds every referenced key in the ${locale} catalogue`, () => {
      const catalogue = loadCatalogue(locale);
      expect([...keys].filter((k) => typeof lookup(catalogue, k) !== 'string')).toEqual([]);
    });
  }

  // A key of the shared `schema` catalogue may be given a CraftEngine wording here (the app looks in ceSchema first)
  it('has no unreferenced keys in the catalogue', () => {
    const shared = loadCatalogue('en', 'schema');
    expect(leafKeys(loadCatalogue('en')).filter((k) => !keys.has(k) && typeof lookup(shared, k) !== 'string')).toEqual([]);
  });
});
