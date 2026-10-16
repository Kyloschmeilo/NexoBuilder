import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { newCraftEngineBlock, newCraftEngineFurniture } from '@resourcepackbuilder/core/craftEngine';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const FILE = 'resources/events/configuration/items/dinge/dinge.yml';

/** A CraftEngine project with one item per edit, in the folder "Dinge". */
function eventProject(...edits: Array<[string, (item: Item) => void]>): Project {
  const project = createProject('Events', 'events', '26.3', 'craftengine');
  const folder = createFolder('Dinge', null);
  insertFolder(project, folder);
  for (const [itemId, edit] of edits) {
    const item = createItem({
      displayName: itemId,
      itemId,
      folderId: folder.id,
      material: 'PAPER',
      model: createTextureModel('generated', { layer0: 'thing.png' }, [{ name: 'thing.png', dataUrl: PNG16 }]),
    });
    edit(item);
    insertItem(project, item);
  }
  return project;
}

type Section = Record<string, Record<string, Record<string, unknown>>>;
const fileOf = (project: Project) => parse(pluginText(planExport(project), FILE)) as Section;
const issues = (project: Project) =>
  planExport(project).issues.map((i) => ({ code: i.code, args: i.args, context: i.context?.map((c) => c.code) }));

const SAY = { type: 'command', command: 'say hi' };
const SNEAKING = { type: 'expression', expression: '<arg:player.is_sneaking>' };

describe('CraftEngine events', () => {
  it('writes the item events at the root of the item', () => {
    const project = eventProject([
      'wand',
      (item) => {
        // The keys of an event and of its functions as the editor may store them
        item.config.events = [
          { functions: [{ command: 'say hi', type: 'command' }], conditions: [SNEAKING], on: 'right_click' },
          { on: 'consume' },
        ];
      },
    ]);
    const item = fileOf(project).items['events:wand'];
    expect(item.events).toEqual([{ on: 'right_click', conditions: [SNEAKING], functions: [SAY] }, { on: 'consume' }]);
    const [first] = item.events as Array<Record<string, Array<Record<string, unknown>>>>;
    expect(Object.keys(first)).toEqual(['on', 'conditions', 'functions']);
    expect(Object.keys(first.functions[0])).toEqual(['type', 'command']);
    expect(issues(project)).toEqual([
      { code: 'ce.eventNoFunctions', args: undefined, context: ['context.item', 'context.property', 'context.listEntry'] },
    ]);
  });

  it('writes the block events in the block under blocks:', () => {
    const project = eventProject([
      'lamp',
      (item) => {
        item.config.block = { ...newCraftEngineBlock(), events: [{ on: 'step', functions: [SAY] }] };
        item.config.events = [{ on: 'right_click', functions: [SAY] }];
      },
    ]);
    const file = fileOf(project);
    expect(file.blocks['events:lamp'].events).toEqual([{ on: 'step', functions: [SAY] }]);
    expect(file.items['events:lamp'].events).toEqual([{ on: 'right_click', functions: [SAY] }]);
    expect(Object.keys(file.blocks['events:lamp']).slice(-1)).toEqual(['events']);
    expect(issues(project)).toEqual([]);
  });

  it('writes the furniture events in the furniture under furniture:', () => {
    const project = eventProject([
      'chair',
      (item) => {
        item.config.furniture = { ...newCraftEngineFurniture(), events: [{ on: 'furniture_break', functions: [SAY] }] };
      },
    ]);
    const furniture = fileOf(project).furniture['events:chair'];
    expect(furniture.events).toEqual([{ on: 'furniture_break', functions: [SAY] }]);
    expect(issues(project)).toEqual([]);
  });

  it('writes events of the map form (config or additional YAML) in the list form', () => {
    const project = eventProject([
      'chair',
      (item) => {
        item.config.events = { left_click: [SAY] } as never;
        item.config.furniture = newCraftEngineFurniture();
        item.rawYaml =
          'furniture:\n  events:\n    right_click:\n      - type: command\n        command: say hi\n    break:\n      type: swing_hand\n';
      },
    ]);
    const file = fileOf(project);
    expect(file.items['events:chair'].events).toEqual([{ on: 'left_click', functions: [SAY] }]);
    expect(file.furniture['events:chair'].events).toEqual([
      { on: 'right_click', functions: [SAY] },
      { on: 'break', functions: [{ type: 'swing_hand' }] },
    ]);
    expect(issues(project)).toEqual([]);
  });

  it('reports a trigger the object never fires, and one CraftEngine does not know', () => {
    const project = eventProject(
      ['wand', (item) => (item.config.events = [{ on: ['step', 'use'], functions: [SAY] }])],
      ['lamp', (item) => (item.config.block = { ...newCraftEngineBlock(), events: [{ on: 'consume', functions: [SAY] }] })],
      ['chair', (item) => (item.config.furniture = { ...newCraftEngineFurniture(), events: [{ on: 'jump', functions: [SAY] }] })],
    );
    expect(issues(project).map(({ code, args }) => [code, args])).toEqual([
      [
        'ce.eventTriggerNotForItem',
        { trigger: 'step', triggers: 'right_click, left_click, attack, consume, pick_up, shoot, item_break, block_break' },
      ],
      ['ce.eventTriggerNotForBlock', { trigger: 'consume', triggers: 'right_click, left_click, block_break, place, step' }],
      ['ce.eventTriggerUnknown', { trigger: 'jump' }],
    ]);
  });

  it('has the trigger messages in English and German', () => {
    for (const locale of ['en', 'de']) {
      const url = new URL(`../../../../i18n/src/messages/${locale}/issues.json`, import.meta.url);
      const ce = (JSON.parse(readFileSync(url, 'utf8')) as { ce: Record<string, string> }).ce;
      for (const code of ['eventTriggerNotForItem', 'eventTriggerNotForBlock', 'eventTriggerNotForFurniture', 'eventTriggerUnknown']) {
        expect(ce[code]).toContain('{trigger}');
      }
    }
  });

  it('checks the functions and conditions through the logic catalog', () => {
    const project = eventProject([
      'wand',
      (item) => {
        item.config.events = [
          {
            on: 'right_click',
            conditions: [{ type: 'equipment_set', count: -1 }, { type: 'moon_phase' }],
            functions: [{ type: 'transfer', host: 'lobby', port: 70000 }, { type: 'explode_everything' }],
          },
        ];
      },
    ]);
    expect(issues(project)).toEqual([
      {
        code: 'ce.eventFunctionUnknown',
        args: { type: 'explode_everything' },
        context: ['context.item', 'context.property', 'context.listEntry'],
      },
      {
        code: 'ce.eventConditionUnknown',
        args: { type: 'moon_phase' },
        context: ['context.item', 'context.property', 'context.listEntry'],
      },
      {
        code: 'plan.fieldTooSmall',
        args: { value: -1, min: 0 },
        context: ['context.item', 'context.property', 'context.listEntry', 'context.field', 'context.listEntry', 'context.field'],
      },
      {
        code: 'plan.fieldTooLarge',
        args: { value: 70000, max: 65535 },
        context: ['context.item', 'context.property', 'context.listEntry', 'context.field', 'context.listEntry', 'context.field'],
      },
    ]);
  });

  it('leaves events from templates unchecked', () => {
    const project = eventProject([
      'chair',
      (item) => (item.config.furniture = { ...newCraftEngineFurniture(), events: [{ template: 'default:rotatable_furniture_4' }] }),
    ]);
    expect(issues(project)).toEqual([]);
  });
});
