/**
 * The item data and the item updater of a CraftEngine item as the export writes them: the advanced lore entries,
 * the structured client-bound data and the updater's versions, each cleaned by its field.
 */
import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem, type Item } from '@resourcepackbuilder/core/project';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

/** The YAML of the item "sword" in the folder "Teile" after `edit` set its config */
function exportedItem(edit: (item: Item) => void): string {
  const project = createProject('Daten', 'demo', '1.21.11', 'craftengine');
  const folder = createFolder('Teile', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Sword', itemId: 'sword', folderId: folder.id, material: 'IRON_SWORD', model: null });
  edit(item);
  insertItem(project, item);
  return pluginText(planExport(project), 'resources/daten/configuration/items/teile/teile.yml');
}

describe('CraftEngine item data', () => {
  it('writes advanced lore entries with their numbers and flags as numbers and booleans', () => {
    const yaml = exportedItem((item) => {
      item.config = {
        data: {
          lore: [
            { content: 'First', priority: '2', operation: 'PREPEND', split_lines: 'true', conditions: [] },
            { content: ['A', 'B'], priority: '' },
          ],
        },
      };
    });
    expect(yaml).toContain(
      [
        '      lore:',
        '        - content: First',
        '          priority: 2',
        '          operation: PREPEND',
        '          split_lines: true',
        '        - content:',
        '            - A',
        '            - B',
      ].join('\n'),
    );
  });

  it('writes the fallback of insert_lore and the merge form of enchantment', () => {
    const yaml = exportedItem((item) => {
      item.config = {
        data: {
          insert_lore: { position: 'AFTER', pattern: 'Match', lore: ['Inserted'], fallback: { position: 'TAIL', pattern: '', lore: [''] } },
          enchantment: { merge: 'true', enchantments: { 'minecraft:sharpness': '3' } },
        },
      };
    });
    expect(yaml).toContain(
      [
        '      insert_lore:',
        '        position: AFTER',
        '        pattern: Match',
        '        lore:',
        '          - Inserted',
        '        fallback:',
        '          position: TAIL',
        '      enchantment:',
        '        merge: true',
        '        enchantments:',
        '          minecraft:sharpness: 3',
      ].join('\n'),
    );
  });

  it('writes the conditional and overwritable keys of the client-bound data', () => {
    const yaml = exportedItem((item) => {
      item.config = {
        client_bound_data: {
          overwritable_custom_model_data: '10001',
          'conditional#unlocked': { conditions: [{ type: 'permission', permission: 'item.unlock' }], data: { item_name: 'Mythic' } },
        },
      };
    });
    expect(yaml).toContain(
      [
        '    client_bound_data:',
        '      overwritable_custom_model_data: 10001',
        '      conditional#unlocked:',
        '        conditions:',
        '          - type: permission',
        '            permission: item.unlock',
        '        data:',
        '          item_name: Mythic',
      ].join('\n'),
    );
  });
});

describe('CraftEngine item updater', () => {
  it('writes each version with its updaters and drops what an updater leaves empty', () => {
    const yaml = exportedItem((item) => {
      item.config = {
        updater: {
          '1': [{ type: 'apply_data', data: { item_name: 'Stone Sword' } }],
          '2': [
            { type: 'transmute', material: 'minecraft:stone_sword' },
            { type: 'reset', keep_components: ['minecraft:enchantments', ''], keep_tags: [''] },
          ],
        },
      };
    });
    expect(yaml).toContain(
      [
        '    updater:',
        '      "1":',
        '        - type: apply_data',
        '          data:',
        '            item_name: Stone Sword',
        '      "2":',
        '        - type: transmute',
        '          material: minecraft:stone_sword',
        '        - type: reset',
        '          keep_components:',
        '            - minecraft:enchantments',
      ].join('\n'),
    );
    expect(yaml).not.toContain('keep_tags');
  });
});
