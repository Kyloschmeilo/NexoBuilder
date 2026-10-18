/**
 * The item editor builds the message keys of its property tabs and group panels from each target's form at runtime,
 * so the compiler cannot check them. This test does: every tab and group of every form has its texts in every locale.
 */
import { describe, expect, it } from 'vitest';
import { PACK_TARGETS } from '@resourcepackbuilder/core/project';
import {
  CE_BLOCK_BEHAVIOR_FORMS,
  CE_FURNITURE_ALIGNMENTS,
  CE_FURNITURE_ANCHORS,
  CE_FURNITURE_ELEMENT_TYPES,
  CE_FURNITURE_HITBOX_TYPES,
  CE_FURNITURE_ROTATIONS,
  CE_PLACEMENT_PROPERTY_NAMES,
} from '@resourcepackbuilder/core/craftEngine';
import { formFor } from '@resourcepackbuilder/core/targets';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { keySegment } from '@resourcepackbuilder/utils';
import { ITEM_SECTIONS } from './sections';

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);
}

describe('item editor messages', () => {
  for (const [locale, messages] of Object.entries(MESSAGES_BY_LOCALE)) {
    for (const target of PACK_TARGETS) {
      it(`has the ${locale} group texts of the ${target} form`, () => {
        const form = formFor(target);
        const keys = [
          ...form.groups.flatMap((group) => [`item.properties.titles.${group.id}`, `item.properties.empty.${group.id}`]),
          ...form.groups.flatMap((group) => [`${form.messages}.${group.label}`, `${form.messages}.${group.description}`]),
          `item.properties.docs.${target}`,
        ];
        expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
      });
    }
    it(`has the ${locale} name of every item editor section`, () => {
      const keys = ITEM_SECTIONS.map((section) => `item.sections.${section.id}`);
      expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
    });
    for (const target of PACK_TARGETS) {
      it(`has the ${locale} name of every feature category of the ${target} form`, () => {
        const form = formFor(target);
        const keys = [
          ...new Set(
            form.properties.flatMap((def) =>
              def.category ? [`${form.messages}.groups.${keySegment(def.group)}.categories.${keySegment(def.category)}`] : [],
            ),
          ),
        ];
        expect(keys.length).toBeGreaterThan(0);
        expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
      });
    }
    it(`has the ${locale} name of every CraftEngine block behavior with a form`, () => {
      const keys = CE_BLOCK_BEHAVIOR_FORMS.map((form) => `item.ceBlock.behaviors.${form.type}`);
      expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
    });
    it(`has the ${locale} names of the CraftEngine furniture options`, () => {
      const keys = [
        ...CE_FURNITURE_ANCHORS.map((anchor) => `item.ceFurniture.anchors.${anchor}`),
        ...CE_FURNITURE_ELEMENT_TYPES.map((type) => `item.ceFurniture.elementTypes.${type}`),
        ...CE_FURNITURE_HITBOX_TYPES.map((type) => `item.ceFurniture.hitboxTypes.${type}`),
        ...CE_FURNITURE_ROTATIONS.map((rule) => `item.ceFurniture.rotations.${rule}`),
        ...CE_FURNITURE_ALIGNMENTS.map((rule) => `item.ceFurniture.alignments.${rule}`),
      ];
      expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
    });
    it(`has the ${locale} hint of every block state property name CraftEngine fills in`, () => {
      const keys = CE_PLACEMENT_PROPERTY_NAMES.map((name) => `item.ceBlock.states.nameHints.${name}`);
      expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
    });
  }
});
