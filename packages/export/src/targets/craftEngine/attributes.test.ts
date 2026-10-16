import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  type CraftEngineAttributeData,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { craftEngineUsesAttributes } from '@resourcepackbuilder/core/craftEngine';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const ITEMS = 'resources/kampf/configuration/items/waffen/waffen.yml';
const ATTRIBUTES = 'resources/kampf/configuration/attributes.yml';

/** A CraftEngine project with the attribute data and one item per edit, in the folder "Waffen". */
function attributeProject(attributes: CraftEngineAttributeData | undefined, ...edits: Array<[string, (item: Item) => void]>): Project {
  const project = createProject('Kampf', 'kampf', '26.3', 'craftengine');
  if (attributes) project.craftEngine = { attributes };
  const folder = createFolder('Waffen', null);
  insertFolder(project, folder);
  for (const [itemId, edit] of edits) {
    const item = createItem({
      displayName: itemId,
      itemId,
      folderId: folder.id,
      material: 'DIAMOND_SWORD',
      model: createTextureModel('generated', { layer0: 'blade.png' }, [{ name: 'blade.png', dataUrl: PNG16 }]),
    });
    edit(item);
    insertItem(project, item);
  }
  return project;
}

const parsed = (project: Project, file: string) => parse(pluginText(planExport(project), file)) as Record<string, Record<string, unknown>>;
const issues = (project: Project) =>
  planExport(project)
    .issues.filter((i) => i.code !== 'plan.folderEmpty')
    .map((i) => ({ code: i.code, args: i.args, context: i.context?.map((c) => c.code) }));

const MIGHT = { type: 'kampf:might', id: 'kampf:item/blade/might', amount: 8, operation: 'minecraft:add_value', slot: 'mainhand' };

const DATA: CraftEngineAttributeData = {
  definitions: [
    { id: 'might', base: 0, constraint: { min: 0, max: 200 } },
    {
      id: 'kampf:vitality',
      base: { type: 'vanilla', attribute: 'minecraft:max_health', fallback: 20 },
      operations: ['minecraft:add_value', 'kampf:add_capped'],
    },
    {
      id: 'power',
      derived: 'kampf:might * 2',
      entities: ['minecraft:player'],
      sync: [{ target: 'minecraft:max_health', operation: 'add_value', value: { type: 'delta' } }],
    },
  ],
  operations: [{ id: 'add_capped', expression: 'MIN(current + amount, base * 2)' }],
  equipmentSets: [
    {
      id: 'guardian',
      pieces: {
        2: { attribute: [{ type: 'kampf:might', id: 'kampf:set/guardian', amount: 5, operation: 'minecraft:add_value' }] },
        4: {
          potion_effects: [{ type: 'minecraft:night_vision', show_icon: false }],
          events: { activate: [{ type: 'message', message: 'Set!' }] },
        },
      },
    },
  ],
  damageRules: [
    { damage_type: 'minecraft:player_attack', target: 'minecraft:zombie', formula: 'damage * 1.25' },
    {
      damage_type: 'minecraft:player_attack',
      formula: 'damage + <attacker_attr:kampf:might>',
      effects: [{ type: 'life_steal', ratio: 0.1 }],
    },
    { damage_type: 'minecraft:arrow', formula: { type: 'composition', parts: { physical: 'damage' } } },
  ],
};

describe('CraftEngine attributes', () => {
  it('writes the attributes, operations, equipment sets and damage rules to attributes.yml', () => {
    const project = attributeProject(DATA);
    expect(parsed(project, ATTRIBUTES)).toEqual({
      attribute_operations: { 'kampf:add_capped': { expression: 'MIN(current + amount, base * 2)' } },
      attributes: {
        'kampf:might': { base: 0, constraint: { min: 0, max: 200 } },
        'kampf:vitality': {
          base: { type: 'vanilla', attribute: 'minecraft:max_health', fallback: 20 },
          operations: ['minecraft:add_value', 'kampf:add_capped'],
        },
        'kampf:power': {
          derived: 'kampf:might * 2',
          entities: ['minecraft:player'],
          sync: [{ target: 'minecraft:max_health', operation: 'add_value', value: { type: 'delta' } }],
        },
      },
      equipment_sets: {
        'kampf:guardian': {
          pieces: {
            2: { attribute: [{ type: 'kampf:might', id: 'kampf:set/guardian', amount: 5, operation: 'minecraft:add_value' }] },
            4: {
              potion_effects: [{ type: 'minecraft:night_vision', show_icon: false }],
              events: { activate: [{ type: 'message', message: 'Set!' }] },
            },
          },
        },
      },
      // One section, the rules of a damage type in the project's order
      damage_rules: {
        'minecraft:player_attack': [
          { target: 'minecraft:zombie', formula: 'damage * 1.25' },
          { formula: 'damage + <attacker_attr:kampf:might>', effects: [{ type: 'life_steal', ratio: 0.1 }] },
        ],
        'minecraft:arrow': [{ formula: { type: 'composition', parts: { physical: 'damage' } } }],
      },
    });
    expect(issues(project)).toEqual([]);
    expect(craftEngineUsesAttributes(project)).toBe(true);
  });

  it('writes no attributes.yml without attribute data', () => {
    const project = attributeProject(undefined, ['blade', () => undefined]);
    expect([...planExport(project).pluginFiles.keys()].filter((path) => path.endsWith('attributes.yml'))).toEqual([]);
    expect(craftEngineUsesAttributes(project)).toBe(false);
  });

  it("writes the items' modifiers and set pieces into their settings", () => {
    const project = attributeProject(DATA, [
      'blade',
      (item) => {
        item.config.settings = {
          attribute_modifiers: [{ ...MIGHT, scope: 'weapon', conditions: [{ type: 'expression', expression: '1 > 0' }] }],
          equipment_set_part: [{ slots: ['head'], sets: ['kampf:guardian'] }],
        };
      },
    ]);
    const items = parsed(project, ITEMS).items as Record<string, Record<string, unknown>>;
    expect(items['kampf:blade'].settings).toEqual({
      attribute_modifiers: [{ ...MIGHT, scope: 'weapon', conditions: [{ type: 'expression', expression: '1 > 0' }] }],
      equipment_set_part: [{ slots: ['head'], sets: ['kampf:guardian'] }],
    });
    expect(issues(project)).toEqual([]);
  });

  it('counts an item with modifiers as using the attribute system', () => {
    const project = attributeProject(undefined, ['blade', (item) => (item.config.settings = { attribute_modifiers: [MIGHT] })]);
    expect(craftEngineUsesAttributes(project)).toBe(true);
    expect(craftEngineUsesAttributes({ ...project, target: 'nexo' })).toBe(false);
  });

  it('reports unknown attributes, operations and equipment sets, and incomplete modifiers', () => {
    const project = attributeProject(
      {
        ...DATA,
        definitions: [...DATA.definitions!, { id: 'broken', base: 1, operations: ['nope'] }],
        equipmentSets: [
          { id: 'rogue', pieces: { 2: { attribute: [{ type: 'speed', id: 'kampf:x', amount: 1, operation: 'minecraft:add_value' }] } } },
        ],
      },
      [
        'blade',
        (item) => {
          item.config.settings = {
            attribute_modifiers: [
              { ...MIGHT, type: 'might' },
              { ...MIGHT, operation: 'kampf:missing', id: '' },
            ],
            equipment_set_part: [{ slots: ['head'], sets: ['kampf:guardian'] }],
          };
        },
      ],
    );
    expect(issues(project)).toEqual([
      // The items' issues come before the project's
      // A reference without a namespace is minecraft's, as CraftEngine reads it
      {
        code: 'ce.attributeUnknown',
        args: { attribute: 'minecraft:might' },
        context: ['context.item', 'context.property', 'context.listEntry'],
      },
      {
        code: 'ce.attributeModifierFieldMissing',
        args: { field: 'id' },
        context: ['context.item', 'context.property', 'context.listEntry'],
      },
      {
        code: 'ce.attributeOperationUnknown',
        args: { operation: 'kampf:missing' },
        context: ['context.item', 'context.property', 'context.listEntry'],
      },
      { code: 'ce.equipmentSetUnknown', args: { set: 'kampf:guardian' }, context: ['context.item', 'context.property'] },
      { code: 'ce.attributeOperationUnknown', args: { operation: 'minecraft:nope' }, context: ['context.attribute'] },
      {
        code: 'ce.attributeUnknown',
        args: { attribute: 'minecraft:speed' },
        context: ['context.equipmentSet', 'context.mapKey', 'context.listEntry'],
      },
    ]);
  });

  it('reports entries without or with a taken id, bad sets and rules, and one-sided constraints', () => {
    const project = attributeProject({
      definitions: [{ base: 1 }, { id: 'might', base: 1 }, { id: 'kampf:might', base: 2, constraint: { max: 10 } }],
      operations: [{ id: 'op' }],
      equipmentSets: [{ id: 'empty' }, { id: 'odd', pieces: { two: {} } }],
      damageRules: [{ formula: 'damage' }, { damage_type: 'minecraft:fall' }],
    });
    expect(issues(project)).toEqual([
      { code: 'ce.attributeEntryIdMissing', args: undefined, context: ['context.attribute'] },
      { code: 'ce.attributeEntryIdDuplicate', args: { id: 'kampf:might' }, context: ['context.attribute'] },
      { code: 'ce.attributeConstraintOneSided', args: undefined, context: ['context.attribute'] },
      { code: 'ce.attributeOperationExpressionMissing', args: undefined, context: ['context.attributeOperation'] },
      { code: 'ce.equipmentSetPiecesMissing', args: undefined, context: ['context.equipmentSet'] },
      { code: 'ce.equipmentSetTierInvalid', args: { tier: 'two' }, context: ['context.equipmentSet'] },
      { code: 'ce.damageRuleTypeMissing', args: undefined, context: ['context.damageRule'] },
      { code: 'ce.damageRuleEmpty', args: undefined, context: ['context.damageRule'] },
    ]);
  });

  it('has the attribute messages in English and German', () => {
    for (const locale of ['en', 'de']) {
      const url = new URL(`../../../../i18n/src/messages/${locale}/issues.json`, import.meta.url);
      const messages = JSON.parse(readFileSync(url, 'utf8')) as { ce: Record<string, string>; context: Record<string, string> };
      expect(messages.ce.attributeUnknown).toContain('{attribute}');
      expect(messages.ce.attributeOperationUnknown).toContain('{operation}');
      expect(messages.ce.equipmentSetUnknown).toContain('{set}');
      for (const frame of ['attribute', 'attributeOperation', 'equipmentSet', 'damageRule'])
        expect(messages.context[frame]).toContain('{id}');
    }
  });
});
