/**
 * The item editor builds the message keys of its property tabs and group panels from each target's form at runtime,
 * so the compiler cannot check them. This test does: every tab and group of every form has its texts in every locale.
 */
import { describe, expect, it } from 'vitest';
import { PACK_TARGETS } from '@resourcepackbuilder/core/project';
import { formFor } from '@resourcepackbuilder/core/targets';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);
}

describe('item editor messages', () => {
  for (const [locale, messages] of Object.entries(MESSAGES_BY_LOCALE)) {
    for (const target of PACK_TARGETS) {
      it(`has the ${locale} tab and group texts of the ${target} form`, () => {
        const form = formFor(target);
        const keys = [
          ...form.tabs.map((tab) => `item.editor.tabs.${tab.id}`),
          ...form.groups.flatMap((group) => [`item.properties.titles.${group.id}`, `item.properties.empty.${group.id}`]),
          ...form.groups.flatMap((group) => [`${form.messages}.${group.label}`, `${form.messages}.${group.description}`]),
          `item.properties.docs.${target}`,
        ];
        expect(keys.filter((key) => typeof lookup(messages, key) !== 'string')).toEqual([]);
      });
    }
  }
});
