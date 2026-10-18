// @vitest-environment jsdom
/**
 * The field editors in the DOM: the boolean switch with its "not set" state, the select control chosen by the number of
 * options, the x/y/z vector inputs, labels bound to their controls, and lists and maps on the ui `ListEditor` and
 * `MapEditor`.
 */
import { act, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import type { Field } from '@resourcepackbuilder/core/form';
import { createProject } from '@resourcepackbuilder/core/project';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { TooltipProvider } from '@resourcepackbuilder/ui/components/tooltip';
import { setProject } from '../../store/project';
import { FieldContext, type FieldContextValue } from './fieldContext';
import { FieldRenderer } from './FieldRenderer';

const CONTEXT: FieldContextValue = { minecraftVersion: '1.21.4', uploadAsset: async () => null, getAsset: () => undefined };

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const roots: Root[] = [];

/** Holds the value of one field in state, like the item store does, and reports every change. */
function Harness({ field, initial, root, changes }: { field: Field; initial?: unknown; root?: boolean; changes: unknown[] }) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <FieldRenderer
      field={field}
      value={value}
      root={root}
      onChange={(next) => {
        changes.push(next);
        setValue(next);
      }}
    />
  );
}

/** Renders `element` with the app's providers in a Nexo project; the host is attached so focus works. */
function render(element: ReactElement): HTMLElement {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  setProject(createProject('Test', undefined, undefined, 'nexo'));
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() =>
    root.render(
      <NextIntlClientProvider locale="en" messages={MESSAGES_BY_LOCALE.en} timeZone="UTC">
        <TooltipProvider>
          <FieldContext.Provider value={CONTEXT}>{element}</FieldContext.Provider>
        </TooltipProvider>
      </NextIntlClientProvider>,
    ),
  );
  return host;
}

/** Renders one field with its value in state; returns the host and the list of reported values. */
function renderField(field: Field, initial?: unknown, root?: boolean) {
  const changes: unknown[] = [];
  const host = render(<Harness field={field} initial={initial} root={root} changes={changes} />);
  return { host, changes };
}

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  setProject(null);
});

const click = (element: Element | null | undefined) => act(() => (element as HTMLElement).click());
/** Types into a React-controlled input. */
const type = (input: Element | null | undefined, value: string) =>
  act(() => {
    const target = input as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(target, value);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
const press = (target: Element | null | undefined, key: string) =>
  act(() => {
    (target as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
const options = (count: number) => Array.from({ length: count }, (_, i) => ({ value: `OPTION_${i}`, label: '' }));

describe('BooleanEditor', () => {
  const field: Field = { type: 'boolean', key: 'glint', label: '', defaultHint: false };

  it('shows the plugin default while unset and a button that clears a set value', () => {
    const { host, changes } = renderField(field);
    const toggle = host.querySelector('[role=switch]');
    expect(host.textContent).toContain('Default: off');
    expect(toggle?.getAttribute('aria-checked')).toBe('false');
    click(toggle);
    expect(changes).toEqual([true]);
    const unset = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Unset (default: off)');
    click(unset);
    expect(changes).toEqual([true, undefined]);
    expect(host.textContent).toContain('Default: off');
  });

  it('has no unset state at a property top level', () => {
    const { host } = renderField(field, true, true);
    expect(host.querySelector('[role=switch]')?.getAttribute('aria-checked')).toBe('true');
    expect(host.textContent).not.toContain('Unset');
  });
});

describe('SelectEditor', () => {
  const select = (count: number, extra: Partial<Extract<Field, { type: 'select' }>> = {}): Field => ({
    type: 'select',
    key: 'mode',
    label: '',
    options: options(count),
    ...extra,
  });

  it('shows up to four options as segments with a "Not set" segment', () => {
    const { host, changes } = renderField(select(3), 'OPTION_1');
    const segments = [...host.querySelectorAll('[data-slot=toggle-group] button')];
    expect(segments.map((s) => s.textContent)).toEqual(['Not set', 'OPTION_0', 'OPTION_1', 'OPTION_2']);
    click(segments[0]);
    expect(changes).toEqual([undefined]);
  });

  it('uses a select up to twelve options and a searchable combobox above', () => {
    expect(renderField(select(8)).host.querySelector('[data-slot=select-trigger]')).not.toBeNull();
    const many = renderField(select(40)).host;
    expect(many.querySelector('[data-slot=select-trigger]')).toBeNull();
    expect(many.querySelector('input[role=combobox]')).not.toBeNull();
  });

  it('keeps a value outside the options and shows it', () => {
    const { host } = renderField(select(3), 'CUSTOM');
    expect(host.querySelector('[data-slot=select-trigger]')?.textContent).toContain('CUSTOM');
  });

  it('binds the label to the control', () => {
    const { host } = renderField(select(8, { label: 'shared.sound.placeholder' }));
    const label = host.querySelector('[data-slot=field-row] label');
    expect(label?.getAttribute('for')).toBe(host.querySelector('[data-slot=select-trigger]')?.id);
  });
});

describe('TextEditor with a vector', () => {
  const field: Field = { type: 'text', key: 'translation', label: '', format: 'vector' };

  it('writes "x,y,z" once all three axes are numbers', () => {
    const { host, changes } = renderField(field);
    const [x, y, z] = host.querySelectorAll('[data-slot=vector3] input');
    type(x, '0');
    type(y, '0.5');
    expect(changes).toEqual([]);
    type(z, '-1');
    expect(changes).toEqual(['0,0.5,-1']);
    expect((y as HTMLInputElement).value).toBe('0.5');
  });

  it('keeps text that is no vector editable as text', () => {
    const { host } = renderField(field, '<offset>');
    expect(host.querySelector('[data-slot=vector3]')).toBeNull();
    expect(host.querySelector('input')?.value).toBe('<offset>');
  });
});

describe('ObjectListEditor', () => {
  const field: Field = {
    type: 'objectList',
    key: 'effects',
    label: '',
    itemLabel: '',
    titleKey: 'type',
    fields: [{ type: 'text', key: 'type', label: '' }],
    newItem: () => ({ type: 'speed' }),
  };

  it('summarises rows by their title and opens a new entry', () => {
    const { host, changes } = renderField(field, [{ type: 'haste' }]);
    expect(host.querySelector('[data-slot=list-row]')?.textContent).toContain('haste');
    click([...host.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith('Add')));
    expect(changes).toEqual([[{ type: 'haste' }, { type: 'speed' }]]);
    expect(host.querySelectorAll('[data-slot=list-row-editor]')).toHaveLength(1);
  });
});

describe('StringListEditor', () => {
  const field: Field = { type: 'stringList', key: 'tags', label: '' };

  it('edits rows in place, and Enter adds a row below that takes the focus', () => {
    const { host, changes } = renderField(field, ['a', 'c']);
    const inputs = () => [...host.querySelectorAll<HTMLInputElement>('[data-slot=list-row] input')];
    type(inputs()[0], 'b');
    press(inputs()[0], 'Enter');
    expect(changes).toEqual([
      ['b', 'c'],
      ['b', '', 'c'],
    ]);
    expect(document.activeElement).toBe(inputs()[1]);
  });
});

describe('MapEditor', () => {
  const field: Field = {
    type: 'map',
    key: 'effects',
    label: '',
    keyLabel: '',
    value: { type: 'number', key: '', label: '' },
    newValue: () => 1,
    reservedKeys: ['set'],
  };

  it('adds an entry and hides and refuses the reserved keys', () => {
    const { host, changes } = renderField(field, { speed: 2, set: 'x' });
    expect(host.querySelectorAll('[data-slot=map-row]')).toHaveLength(1);
    const keyInputs = host.querySelectorAll<HTMLInputElement>('[data-slot=map-editor] > div:last-of-type input');
    type(keyInputs[0], 'haste');
    press(keyInputs[0], 'Enter');
    expect(changes).toEqual([{ speed: 2, set: 'x', haste: 1 }]);
  });
});
