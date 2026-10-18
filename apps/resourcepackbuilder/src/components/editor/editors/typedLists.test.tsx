// @vitest-environment jsdom
/**
 * The typed lists: cards with one expanded at a time, adding through the catalog with categories, changing an entry's
 * type, events as cards of their trigger, entries nested deeper than two typed entries opening in a dialog with a
 * breadcrumb, and the number provider switching between a plain value and a number type.
 */
import { act, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CE_CONDITIONS,
  CE_EVENT_PROPERTIES,
  CE_EVENT_PROPERTY_IDS,
  CE_FUNCTIONS,
  CE_ITEM_BEHAVIORS,
  CE_NUMBERS,
  CE_TRIGGERS,
} from '@resourcepackbuilder/core/craftEngine';
import type { Field, NumberProviderField, TypedListField } from '@resourcepackbuilder/core/form';
import { cleanup, click, press, render, type } from '../../catalog/testRender';
import { FieldRenderer } from '../FieldRenderer';
import { toPlainNumber, toTypedNumber } from './NumberProviderEditor';
import { fromCardEntry, toCardEntry, typedByTypes } from './TypedListEditor';

const FUNCTIONS: TypedListField = { type: 'typedList', key: 'functions', label: '', catalog: 'functions', types: () => CE_FUNCTIONS };
const CONDITIONS: TypedListField = {
  type: 'typedList',
  key: 'conditions',
  label: '',
  catalog: 'conditions',
  types: () => CE_CONDITIONS,
  invertible: true,
};
const ITEM_BEHAVIORS: TypedListField = {
  type: 'typedList',
  key: 'behaviors',
  label: '',
  catalog: 'itemBehaviors',
  types: () => CE_ITEM_BEHAVIORS,
};
const NUMBER: NumberProviderField = { type: 'numberProvider', key: 'amount', label: '', catalog: 'numbers', types: () => CE_NUMBERS };
const EVENTS = CE_EVENT_PROPERTIES.find((def) => def.id === CE_EVENT_PROPERTY_IDS.item)!.field;

/** A field editor holding its value in state; `latest.value` is the last value it wrote. */
function editor(field: Field, initial: unknown) {
  const latest: { value: unknown } = { value: initial };
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <FieldRenderer
        field={field}
        value={value}
        hideLabel
        onChange={(next) => {
          latest.value = next;
          setValue(next);
        }}
      />
    );
  }
  const host = render(<Harness />);
  return { host, latest };
}

const cards = (root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>('[data-slot=typed-entry-card]')];
const toggle = (card: HTMLElement) => card.querySelector<HTMLElement>(':scope > div > [data-slot=entry-toggle]');
const searchBox = () => document.querySelector<HTMLInputElement>('input[role=combobox]') as HTMLInputElement;
const menuItems = () => [...document.querySelectorAll('[role=menuitem]')].map((item) => item.textContent);
const openMenu = async (card: HTMLElement) => {
  click(card.querySelector('[aria-label^="Actions for"]'));
  await settle();
};
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 50)));

afterEach(cleanup);

describe('typed entry helpers', () => {
  it('moves the type key of an event to `type` for the cards and back, first', () => {
    const event = { functions: [], on: 'right_click' };
    expect(toCardEntry(event, 'on')).toEqual({ type: 'right_click', functions: [] });
    expect(Object.keys(fromCardEntry({ functions: [], type: 'attack' }, 'on') as object)).toEqual(['on', 'functions']);
    expect(toCardEntry(event, 'type')).toBe(event);
  });

  it('gives every trigger, alias and unknown name the fields of an event', () => {
    const fields = EVENTS.type === 'objectList' ? EVENTS.fields.filter((f) => f.key !== 'on') : [];
    const types = typedByTypes(CE_TRIGGERS, fields, ['right_click', 'use', 'my_trigger', '']);
    expect(types.find((t) => t.type === 'use')?.fields).toBe(fields);
    expect(types.find((t) => t.type === 'my_trigger')?.label).toBe('my_trigger');
    expect(types.filter((t) => t.type === '')).toEqual([]);
    expect(types.find((t) => t.type === 'attack')?.fields.map((f) => f.key)).toEqual(['conditions', 'functions']);
  });

  it('carries a plain number value over to a number type and back', () => {
    expect(toTypedNumber('1~3', 'uniform')).toEqual({ type: 'uniform', min: 1, max: 3 });
    expect(toTypedNumber(2, 'constant')).toEqual({ type: 'constant', value: '2' });
    expect(toTypedNumber('rand(1)', 'expression')).toEqual({ type: 'expression', expression: 'rand(1)' });
    expect(toTypedNumber('5', 'normal')).toEqual({ type: 'normal' });
    expect(
      toTypedNumber(
        { type: 'uniform', min: 1, max: 2 },
        'triangle',
        CE_NUMBERS.find((t) => t.type === 'triangle'),
      ),
    ).toEqual({
      type: 'triangle',
      min: 1,
      max: 2,
    });
    expect(toPlainNumber({ type: 'uniform', min: 1, max: '3' })).toBe('1~3');
    expect(toPlainNumber({ type: 'constant', value: '4' })).toBe(4);
    expect(toPlainNumber({ type: 'expression', expression: 'x*2' })).toBe('x*2');
    expect(toPlainNumber({ type: 'normal', mean: 1 })).toBeUndefined();
  });
});

describe('TypedListEditor', () => {
  it('shows the entries collapsed with their summary and expands one at a time', () => {
    editor(FUNCTIONS, [
      { type: 'message', message: 'Hi' },
      { type: 'heal', amount: 2 },
    ]);
    const [message, heal] = cards();
    expect(message.textContent).toContain('Message');
    expect(toggle(message)?.getAttribute('aria-expanded')).toBe('false');
    click(toggle(message));
    expect(toggle(cards()[0])?.getAttribute('aria-expanded')).toBe('true');
    click(toggle(heal));
    expect(toggle(cards()[0])?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle(cards()[1])?.getAttribute('aria-expanded')).toBe('true');
  });

  it('adds a function from the catalog, grouped by category, and opens it', async () => {
    const { latest } = editor(FUNCTIONS, undefined);
    click(document.querySelector('[data-slot=typed-list-add]'));
    await settle();
    expect(document.querySelector('[data-slot=catalog-dialog]')?.textContent).toContain('Add a function');
    const facets = [...document.querySelectorAll('[data-facet]')].map((f) => f.getAttribute('data-facet'));
    expect(facets).toEqual(expect.arrayContaining(['messages', 'player', 'flow', 'plugins']));
    type(searchBox(), 'potion effect');
    press(searchBox(), 'Enter');
    await settle();
    expect(latest.value).toEqual([{ type: 'potion_effect' }]);
    expect(toggle(cards()[0])?.getAttribute('aria-expanded')).toBe('true');
  });

  it('changes the type of an entry and keeps the keys both types have', async () => {
    const { latest } = editor(FUNCTIONS, [{ type: 'heal', amount: 2, target: 'self' }]);
    click(cards()[0].querySelector('[aria-label^="Actions for"]'));
    await settle();
    click([...document.querySelectorAll('[role=menuitem]')].find((item) => item.textContent === 'Change type'));
    await settle();
    type(searchBox(), 'damage');
    press(searchBox(), 'Enter');
    await settle();
    expect(latest.value).toEqual([{ type: 'damage', amount: 2, target: 'self' }]);
  });
});

describe('TypedListEditor entries', () => {
  it('offers Duplicate in lists that may repeat a type, and not in lists that hold a type once', async () => {
    const { latest } = editor(FUNCTIONS, [{ type: 'heal', amount: 2 }]);
    await openMenu(cards()[0]);
    expect(menuItems()).toContain('Duplicate');
    click([...document.querySelectorAll('[role=menuitem]')].find((item) => item.textContent === 'Duplicate'));
    await settle();
    expect(latest.value).toEqual([
      { type: 'heal', amount: 2 },
      { type: 'heal', amount: 2 },
    ]);
    cleanup();
    editor(ITEM_BEHAVIORS, [{ type: 'compostable_item', chance: 0.5 }]);
    await openMenu(cards()[0]);
    expect(menuItems()).toContain('Change type');
    expect(menuItems()).not.toContain('Duplicate');
  });

  it('negates a condition with a leading ! and back', () => {
    const { latest } = editor(CONDITIONS, [{ type: '!has_player' }, { type: 'permission', permission: 'a.b' }]);
    const negate = () => cards()[0].querySelector<HTMLElement>('[role=switch]') as HTMLElement;
    expect(negate().getAttribute('aria-checked')).toBe('true');
    expect(cards()[0].getAttribute('data-type')).toBe('has_player');
    click(negate());
    expect(latest.value).toEqual([{ type: 'has_player' }, { type: 'permission', permission: 'a.b' }]);
    click(negate());
    expect(latest.value).toEqual([{ type: '!has_player' }, { type: 'permission', permission: 'a.b' }]);
  });

  it('edits an entry of an unknown type as YAML and keeps it in the list', () => {
    const { latest } = editor(FUNCTIONS, [{ type: 'future_fn', speed: 3 }, { type: 'heal' }]);
    const unknown = cards()[0];
    expect(unknown.hasAttribute('data-known')).toBe(false);
    click(toggle(unknown));
    const yaml = cards()[0].querySelector('textarea') as HTMLTextAreaElement;
    expect(yaml.value).toContain('speed: 3');
    type(yaml, 'type: future_fn\nspeed: 5\n');
    expect(latest.value).toEqual([{ type: 'future_fn', speed: 5 }, { type: 'heal' }]);
  });
});

describe('events', () => {
  it('shows each event as a card of its trigger and adds events by trigger', async () => {
    const { latest } = editor(EVENTS, [{ on: 'right_click', functions: [{ type: 'command', command: 'say hi' }] }, { on: 'use' }]);
    const [click1, alias] = cards();
    expect(click1.getAttribute('data-type')).toBe('right_click');
    expect(click1.textContent).toContain('Right click');
    expect(click1.textContent).toContain('1 function');
    // An alias keeps its card and fields
    expect(alias.getAttribute('data-known')).toBe('true');
    click(document.querySelectorAll<HTMLElement>('[data-slot=typed-list-add]')[0]);
    await settle();
    expect(document.querySelector('[data-slot=catalog-dialog]')?.textContent).toContain('Add an event');
    type(searchBox(), 'consume');
    press(searchBox(), 'Enter');
    await settle();
    expect((latest.value as unknown[])[2]).toEqual({ on: 'consume' });
  });

  it('opens a list nested in two typed entries in a dialog with a breadcrumb', async () => {
    editor(EVENTS, [
      {
        on: 'right_click',
        functions: [{ type: 'run', delay: 20, functions: [{ type: 'message', message: 'Hi', conditions: [{ type: 'permission' }] }] }],
      },
    ]);
    click(toggle(cards()[0]));
    const run = cards().find((card) => card.getAttribute('data-type') === 'run') as HTMLElement;
    click(toggle(run));
    const message = cards().find((card) => card.getAttribute('data-type') === 'message') as HTMLElement;
    // Two typed entries deep: the entry is a row that opens a dialog, not an expanding card
    expect(toggle(message)?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(toggle(message)?.hasAttribute('aria-expanded')).toBe(false);
    click(toggle(message));
    await settle();
    const dialog = document.querySelector('[role=dialog]') as HTMLElement;
    expect(dialog.querySelector('[data-slot=typed-breadcrumb]')?.textContent).toBe('Event: Right click›Function: Run›Function: Message');
    // In the dialog the entry is open, and its own lists expand in place again
    const inDialog = cards(dialog);
    expect(toggle(inDialog[0])).toBeNull();
    expect(inDialog[0].querySelector('[data-slot=field-row]')).not.toBeNull();
    const permission = inDialog.find((card) => card.getAttribute('data-type') === 'permission') as HTMLElement;
    expect(toggle(permission)?.getAttribute('aria-haspopup')).toBeNull();
  });
});

describe('deep nesting dialog', () => {
  it('writes an edit in the dialog to the nested entry, closes on Escape and gives the focus back', async () => {
    const { latest } = editor(EVENTS, [
      { on: 'right_click', conditions: [{ type: 'permission' }], functions: [{ type: 'run', functions: [{ type: 'heal' }] }] },
    ]);
    expect(cards()[0].textContent).toContain('1 condition · 1 function');
    click(toggle(cards()[0]));
    click(toggle(cards().find((card) => card.getAttribute('data-type') === 'run') as HTMLElement));
    const row = toggle(cards().find((card) => card.getAttribute('data-type') === 'heal') as HTMLElement) as HTMLElement;
    row.focus();
    click(row);
    await settle();
    const dialog = document.querySelector('[role=dialog]') as HTMLElement;
    type(dialog.querySelector('input:not([type=checkbox])') as HTMLInputElement, '4');
    expect(latest.value).toEqual([
      { on: 'right_click', conditions: [{ type: 'permission' }], functions: [{ type: 'run', functions: [{ type: 'heal', amount: '4' }] }] },
    ]);
    press(dialog, 'Escape');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    const heal = cards().find((card) => card.getAttribute('data-type') === 'heal') as HTMLElement;
    expect(document.activeElement).toBe(toggle(heal));
  });
});

describe('NumberProviderEditor', () => {
  it('keeps a number type without a plain form: its plain value button is off', () => {
    const { host } = editor(NUMBER, { type: 'normal', mean: 1 });
    const button = host.querySelector<HTMLButtonElement>('[aria-label="This type has no plain value"]');
    expect(button?.disabled).toBe(true);
  });

  it('turns a range into a uniform number type and back', async () => {
    const { host, latest } = editor(NUMBER, '1~3');
    click(host.querySelector('[aria-label="Use a number type"]'));
    await settle();
    type(searchBox(), 'uniform');
    press(searchBox(), 'Enter');
    await settle();
    expect(latest.value).toEqual({ type: 'uniform', min: 1, max: 3 });
    expect(host.querySelector('[data-slot=number-provider]')?.getAttribute('data-type')).toBe('uniform');
    click(host.querySelector('[aria-label="Use a plain value"]'));
    expect(latest.value).toBe('1~3');
  });
});
