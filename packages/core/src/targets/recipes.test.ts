/** The recipe data of both targets: every type and key links to its plugin's docs, and option values prune cleanly. */
import { describe, expect, it } from 'vitest';
import { checkFieldValue, fieldToSchema } from '../form/fieldSchema';
import { NEXO_DISABLED_RECIPES_FIELD } from '../nexo/recipes/options';
import { recipeTypesFor } from '../project/recipes/model';
import { optionsForType } from '../project/recipes/options';
import { PACK_TARGETS, type PackTargetId } from '../project/target';
import { CE_INGREDIENT_PREDICATES, CE_RESULT_POST_PROCESSORS, CE_TRANSFORM_PROCESSORS } from '../craftEngine/recipeOptions';
import { loadCatalogue, type MessageTree } from '@resourcepackbuilder/test-utils/catalogue';
import { recipeDocsFor, recipeMessageKeys, recipeOptionsFor } from './recipes';

function lookup(tree: MessageTree, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split('.')) node = typeof node === 'object' && node !== null ? (node as MessageTree)[part] : undefined;
  return node;
}

function leafKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : leafKeys(value, path);
  });
}

const DOCS_BASE: Record<PackTargetId, string> = {
  nexo: 'https://docs.nexomc.com/',
  craftengine: 'https://xiao-momi.github.io/craft-engine-wiki/',
};

describe('recipe docs', () => {
  for (const target of PACK_TARGETS) {
    it(`links every ${target} recipe type and key to the ${target} docs`, () => {
      const links: Array<[string, string | undefined]> = [
        ...recipeTypesFor(target).map(({ type }): [string, string] => [`type ${type}`, recipeDocsFor(target, type)]),
        ...[...recipeOptionsFor(target).recipe, ...recipeOptionsFor(target).ingredient].map((option): [string, string | undefined] => [
          `key ${option.field.key}`,
          option.field.docs,
        ]),
      ];
      expect(links.filter(([, link]) => !link?.startsWith(DOCS_BASE[target]))).toEqual([]);
    });
  }

  it('links the processor and predicate types and the disabled recipes to their sections', () => {
    const types = [...CE_TRANSFORM_PROCESSORS, ...CE_RESULT_POST_PROCESSORS, ...CE_INGREDIENT_PREDICATES];
    expect(types.filter((t) => !t.docs?.startsWith(DOCS_BASE.craftengine))).toEqual([]);
    expect(recipeDocsFor('craftengine', 'shaped_transform')).toBe(
      'https://xiao-momi.github.io/craft-engine-wiki/configuration/recipe#shaped-transform-recipe',
    );
    expect(recipeDocsFor('nexo', 'smithing_trim')).toBe('https://docs.nexomc.com/general-usage/recipes#custom-trim-recipes');
    expect(NEXO_DISABLED_RECIPES_FIELD.docs).toBe('https://docs.nexomc.com/general-usage/recipes#disabling-recipes');
  });
});

describe('recipe options', () => {
  for (const target of PACK_TARGETS) {
    it(`gives each ${target} recipe type each key once`, () => {
      for (const { type } of recipeTypesFor(target)) {
        for (const list of [recipeOptionsFor(target).recipe, recipeOptionsFor(target).ingredient]) {
          const keys = optionsForType(list, type).map((option) => option.field.key);
          expect(keys, `${target} ${type}`).toEqual([...new Set(keys)]);
        }
      }
    });
  }

  it('lists only types its target reads', () => {
    for (const target of PACK_TARGETS) {
      const types = new Set(recipeTypesFor(target).map((info) => info.type));
      const options = [...recipeOptionsFor(target).recipe, ...recipeOptionsFor(target).ingredient];
      expect(options.flatMap((option) => option.types.filter((type) => !types.has(type)))).toEqual([]);
    }
  });

  it('accepts typical values of the keys', () => {
    const samples: Record<string, unknown> = {
      category: 'misc',
      transform_processors: [{ type: 'keep_components', components: ['minecraft:enchantments'] }],
      post_processors: [{ type: 'apply_data', data: { lore: ['x'] } }],
      predicate: [{ type: 'enchantment', enchantments: { 'minecraft:sharpness': 5 } }],
      preserve: ['damage'],
    };
    for (const target of PACK_TARGETS) {
      for (const option of [...recipeOptionsFor(target).recipe, ...recipeOptionsFor(target).ingredient]) {
        const value = samples[option.field.key];
        if (value === undefined) continue;
        expect(fieldToSchema(option.field).safeParse(value).success, option.field.key).toBe(true);
        expect(checkFieldValue(value, option.field), option.field.key).toEqual([]);
      }
    }
  });
});

describe('recipe message keys', () => {
  const keys = new Set(recipeMessageKeys());

  it('references only keys that are well-formed', () => {
    expect([...keys].filter((k) => !/^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/.test(k))).toEqual([]);
  });

  for (const locale of ['en', 'de'] as const) {
    it(`finds every key in the ${locale} schema catalogue`, () => {
      const catalogue = loadCatalogue(locale, 'schema');
      expect([...keys].filter((k) => typeof lookup(catalogue, k) !== 'string')).toEqual([]);
    });
  }

  it('has no unreferenced recipe keys in the schema catalogue', () => {
    const recipes = leafKeys(loadCatalogue('en', 'schema')).filter((k) => k.startsWith('recipes.'));
    expect(recipes.filter((k) => !keys.has(k))).toEqual([]);
  });
});
