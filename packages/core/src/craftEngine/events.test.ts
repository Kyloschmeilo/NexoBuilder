import { describe, expect, it } from 'vitest';
import { CRAFT_ENGINE_FORM } from './form/schema';
import { CE_EVENT_PROPERTIES } from './form/schema/events';
import { definitionEvents, eventList, eventPropertyIds, withEventList } from './events';
import { newCraftEngineBlock } from './block';
import { newCraftEngineFurniture } from './furniture';
import { resolveTrigger, triggersFor } from './logic';
import type { SelectField, ObjectListField } from '../form/fields';

describe('eventList', () => {
  it('reads the map form as one event per trigger, a single function as a list of one', () => {
    expect(
      eventList({
        right_click: [{ type: 'command', command: 'say 1' }, { type: 'swing_hand' }],
        break: { type: 'command', command: 'say 2' },
      }),
    ).toEqual([
      { on: 'right_click', functions: [{ type: 'command', command: 'say 1' }, { type: 'swing_hand' }] },
      { on: 'break', functions: [{ type: 'command', command: 'say 2' }] },
    ]);
  });

  it('keeps the list form, ordering the keys of each event', () => {
    const list = [{ functions: [{ type: 'swing_hand' }], on: ['attack', 'left_click'], conditions: [] }, { template: 'a:b' }];
    const read = eventList(list) as Array<Record<string, unknown>>;
    expect(read).toEqual(list);
    expect(Object.keys(read[0])).toEqual(['on', 'conditions', 'functions']);
  });

  it('leaves other values as they are', () => {
    expect(eventList('right_click')).toBe('right_click');
  });
});

describe('withEventList and definitionEvents', () => {
  it('turns `event` and `events` into the list form in place', () => {
    const definition = { settings: {}, event: { step: [{ type: 'swing_hand' }] }, loot: {} };
    const result = withEventList(definition);
    expect(Object.keys(result)).toEqual(['settings', 'event', 'loot']);
    expect(result.event).toEqual([{ on: 'step', functions: [{ type: 'swing_hand' }] }]);
    expect(definition.event).toEqual({ step: [{ type: 'swing_hand' }] });
  });

  it('reads `event` before `events`, as CraftEngine does', () => {
    expect(definitionEvents({ event: [1], events: [2] })).toEqual([1]);
    expect(definitionEvents({ events: [2] })).toEqual([2]);
    expect(definitionEvents({})).toBeUndefined();
  });
});

describe('resolveTrigger', () => {
  it('resolves ids, aliases, the namespace and any case', () => {
    expect(resolveTrigger('right_click', 'item')?.type).toBe('right_click');
    expect(resolveTrigger('USE', 'item')?.type).toBe('right_click');
    expect(resolveTrigger('craftengine:step', 'block')?.type).toBe('step');
    expect(resolveTrigger('dig', 'block')?.type).toBe('block_break');
    expect(resolveTrigger('jump', 'item')).toBeUndefined();
  });

  it('reads `break` as the break trigger of the object kind', () => {
    expect(resolveTrigger('break', 'item')?.type).toBe('item_break');
    expect(resolveTrigger('break', 'block')?.type).toBe('block_break');
    expect(resolveTrigger('break', 'furniture')?.type).toBe('furniture_break');
  });
});

describe('event properties', () => {
  it('offer the triggers each object kind fires', () => {
    const options = (id: string) => {
      const field = CE_EVENT_PROPERTIES.find((p) => p.id === id)!.field as ObjectListField;
      return (field.fields.find((f) => f.key === 'on') as SelectField).options.map((o) => o.value);
    };
    expect(options('events')).toEqual(triggersFor('item').map((t) => t.type));
    expect(options('block.events')).toEqual(['right_click', 'left_click', 'block_break', 'place', 'step']);
    expect(options('furniture.events')).toEqual(['right_click', 'left_click', 'place', 'furniture_break']);
  });

  it('show the block or furniture events only while the item places one', () => {
    expect(eventPropertyIds({})).toEqual(['events']);
    expect(eventPropertyIds({ block: newCraftEngineBlock() })).toEqual(['events', 'block.events']);
    expect(eventPropertyIds({ furniture: newCraftEngineFurniture() })).toEqual(['events', 'furniture.events']);
    const tab = CRAFT_ENGINE_FORM.tabs.find((t) => t.id === 'events');
    expect(tab?.group).toBe('events');
    expect(tab?.only).toBe(eventPropertyIds);
  });
});
