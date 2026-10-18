/** Every docs link of both forms (properties, their fields and the types of their typed lists) points at its plugin's docs. */
import { describe, expect, it } from 'vitest';
import { CE_BLOCK_BEHAVIOR_FORMS } from '../craftEngine/blockBehaviors';
import { CE_WIKI_URL } from '../craftEngine/form/schema/docs';
import { CE_LOGIC } from '../craftEngine/logic';
import type { Field, TypedType } from '../form/fields';
import { NEXO_DOCS_URL, NEXO_MEDIA_DOCS, NEXO_RECIPE_DOCS, nexoArmorLayerDocs, nexoVariantDocs } from '../nexo/form/schema/docs';
import { ARMOR_LAYERS } from '../project/armor';
import { MEDIA_KIND_LIST } from '../project/media/kinds';
import { RECIPE_TYPES } from '../project/recipes/model';
import { PACK_TARGETS, type PackTargetId } from '../project/target';
import { DIRECTIONAL_MODEL_SLOTS, FURNITURE_MODEL_SLOTS, STACK_MODELS, stateDef, VARIANTS } from '../project/variants';
import { emojiDocsFor, formFor, jukeboxDocsFor, mediaDocsFor } from './index';

const DOCS_BASE: Record<PackTargetId, string> = {
  nexo: 'https://docs.nexomc.com/',
  craftengine: 'https://xiao-momi.github.io/craft-engine-wiki/',
};

/** Every field below these fields (object children, map values, choice forms) with its path */
function* walkFields(fields: readonly Field[], path: string): Generator<[string, Field]> {
  for (const f of fields) {
    const at = `${path}.${f.key || '<value>'}`;
    yield [at, f];
    if (f.type === 'object' || f.type === 'objectList') yield* walkFields(f.fields, at);
    if (f.type === 'map') yield* walkFields([f.value], at);
    if (f.type === 'choice') for (const choice of f.choices) yield* walkFields([choice.field], `${at}[${choice.id}]`);
  }
}

/** The typed-list types these fields reach, each catalog once (catalogs contain themselves) */
function typedTypes(fields: readonly Field[], seen = new Set<string>()): TypedType[] {
  return [...walkFields(fields, '')].flatMap(([, f]) => {
    if ((f.type !== 'typedList' && f.type !== 'numberProvider') || seen.has(f.catalog)) return [];
    seen.add(f.catalog);
    const types = f.types();
    return [
      ...types,
      ...typedTypes(
        types.flatMap((t) => t.fields),
        seen,
      ),
    ];
  });
}

/** Links that do not start with the base, as `where: link` (an empty list passes) */
const offBase = (base: string, links: Array<[string, string | undefined]>) =>
  links.filter(([, link]) => !link?.startsWith(base)).map(([where, link]) => `${where}: ${link}`);

describe('docs links', () => {
  it('use the published base URL of each plugin', () => {
    expect(NEXO_DOCS_URL).toBe(DOCS_BASE.nexo);
    expect(CE_WIKI_URL).toBe(DOCS_BASE.craftengine);
  });

  for (const target of PACK_TARGETS) {
    const form = formFor(target);
    const base = DOCS_BASE[target];

    it(`link every ${target} property to the ${target} docs`, () => {
      expect(
        offBase(
          base,
          form.properties.map((p) => [p.id, p.docs]),
        ),
      ).toEqual([]);
    });

    it(`link the ${target} fields that have a docs link to the ${target} docs`, () => {
      const fields = form.properties.flatMap((p) => [...walkFields([p.field], p.id)]);
      const linked = fields.filter(([, f]) => f.docs !== undefined).map(([where, f]): [string, string | undefined] => [where, f.docs]);
      expect(offBase(base, linked)).toEqual([]);
    });

    it(`link every typed-list type of the ${target} form to the ${target} docs`, () => {
      const types = typedTypes(form.properties.map((p) => p.field));
      expect(
        offBase(
          base,
          types.map((t) => [t.type, t.docs]),
        ),
      ).toEqual([]);
    });
  }

  it('link every type of every CraftEngine logic catalog to its section of the wiki', () => {
    const links = Object.entries(CE_LOGIC).flatMap(([catalog, types]) =>
      types.map((t): [string, string | undefined] => [`${catalog}.${t.type}`, t.docs]),
    );
    expect(links.length).toBeGreaterThan(150);
    expect(offBase(DOCS_BASE.craftengine, links)).toEqual([]);
    expect(CE_LOGIC.conditions.find((t) => t.type === 'worldguard:region')?.docs).toBe(
      'https://xiao-momi.github.io/craft-engine-wiki/reference/conditions#worldguardregion',
    );
    // A type without a section of its own links to its catalog's page
    expect(CE_LOGIC.triggers[0].docs).toBe('https://xiao-momi.github.io/craft-engine-wiki/reference/events');
  });

  it('link every CraftEngine block behavior form to its wiki page', () => {
    expect(
      offBase(
        DOCS_BASE.craftengine,
        CE_BLOCK_BEHAVIOR_FORMS.map((form) => [form.type, form.docs]),
      ),
    ).toEqual([]);
    expect(CE_BLOCK_BEHAVIOR_FORMS.find((form) => form.type === 'slab_block')?.docs).toBe(
      'https://xiao-momi.github.io/craft-engine-wiki/configuration/block/behaviors/slab_block',
    );
  });

  for (const target of PACK_TARGETS) {
    it(`link every ${target} media page, music discs and emoji to the ${target} docs`, () => {
      const links: Array<[string, string]> = [
        ...MEDIA_KIND_LIST.map((kind): [string, string] => [`media ${kind}`, mediaDocsFor(target, kind)]),
        ['jukebox', jukeboxDocsFor(target)],
        ['emoji', emojiDocsFor(target)],
      ];
      expect(offBase(DOCS_BASE[target], links)).toEqual([]);
    });
  }

  it('link every Nexo model variant, armor layer, media kind and recipe type to the Nexo docs', () => {
    const variants = [...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS, ...DIRECTIONAL_MODEL_SLOTS, stateDef('open')];
    const links: Array<[string, string | undefined]> = [
      ...variants.map((v): [string, string] => [`variant ${v.slot}`, nexoVariantDocs(v.slot)]),
      ...ARMOR_LAYERS.map((layer): [string, string] => [`armor ${layer.key}`, nexoArmorLayerDocs(layer)]),
      ...MEDIA_KIND_LIST.map((kind): [string, string] => [`media ${kind}`, NEXO_MEDIA_DOCS[kind]]),
      ...RECIPE_TYPES.map(({ type }): [string, string] => [`recipe ${type}`, NEXO_RECIPE_DOCS[type]]),
    ];
    expect(offBase(DOCS_BASE.nexo, links)).toEqual([]);
    expect(nexoVariantDocs('state:open')).toBe('https://docs.nexomc.com/mechanics/furniture-mechanic/furniture-states');
    expect(nexoVariantDocs('connect_left')).toBe('https://docs.nexomc.com/mechanics/furniture-mechanic/connectable-furniture');
  });
});
