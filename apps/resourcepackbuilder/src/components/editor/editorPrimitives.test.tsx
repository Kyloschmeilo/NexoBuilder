// @vitest-environment jsdom
/**
 * Behaviour of the ui editor primitives the field editors build on: the list and map edits, `ListEditor` and
 * `MapEditor` driven through the DOM, and the markup of `FieldRow` (label, key rail, docs link, messages).
 */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FieldRow,
  insertItem,
  ListEditor,
  MapEditor,
  mapKeyProblem,
  moveItem,
  removeItem,
  removeMapKey,
  renameMapKey,
  replaceItem,
  setMapValue,
} from '@resourcepackbuilder/ui';
import { TooltipProvider } from '@resourcepackbuilder/ui/components/tooltip';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

describe('list edits', () => {
  const list = ['a', 'b', 'c'];

  it('moves an entry and clamps the target', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(list, 1, 9)).toEqual(['a', 'c', 'b']);
    expect(moveItem(list, 5, 0)).toEqual(list);
  });

  it('inserts, removes and replaces without touching the input', () => {
    expect(insertItem(list, 1, 'x')).toEqual(['a', 'x', 'b', 'c']);
    expect(insertItem(list, 9, 'x')).toEqual(['a', 'b', 'c', 'x']);
    expect(removeItem(list, 1)).toEqual(['a', 'c']);
    expect(replaceItem(list, 2, 'z')).toEqual(['a', 'b', 'z']);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

describe('map edits', () => {
  const map = { first: 1, second: 2, third: 3 };

  it('renames a key in place and refuses a taken or missing key', () => {
    expect(Object.keys(renameMapKey(map, 'second', 'middle'))).toEqual(['first', 'middle', 'third']);
    expect(renameMapKey(map, 'second', 'third')).toEqual(map);
    expect(renameMapKey(map, 'missing', 'other')).toEqual(map);
  });

  it('removes a key and appends a new one', () => {
    expect(removeMapKey(map, 'first')).toEqual({ second: 2, third: 3 });
    expect(Object.keys(setMapValue(map, 'fourth', 4))).toEqual(['first', 'second', 'third', 'fourth']);
    expect(setMapValue(map, 'first', 9).first).toBe(9);
  });

  it('reports empty and taken keys, and lets a key keep its own name', () => {
    expect(mapKeyProblem(map, '  ')).toBe('empty');
    expect(mapKeyProblem(map, 'first')).toBe('taken');
    expect(mapKeyProblem(map, ' first ')).toBe('taken');
    expect(mapKeyProblem(map, 'type', ['type'])).toBe('taken');
    expect(mapKeyProblem(map, 'first', [], 'first')).toBeNull();
    expect(mapKeyProblem(map, 'fresh')).toBeNull();
  });
});

describe('FieldRow', () => {
  const render = (element: React.ReactElement) => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(<TooltipProvider>{element}</TooltipProvider>);
    return host;
  };

  it('shows the label, the YAML key in the rail and the control', () => {
    const host = render(
      <FieldRow label="Saturation" htmlFor="sat" yamlKey="saturation">
        <input id="sat" />
      </FieldRow>,
    );
    const label = host.querySelector('label');
    expect(label?.textContent).toBe('Saturation');
    expect(label?.getAttribute('for')).toBe('sat');
    // Once in the label line (narrow rows) and once in the rail (wide rows)
    const keys = [...host.querySelectorAll('[data-slot=yaml-key]')].map((key) => key.textContent);
    expect(keys).toEqual(['saturation', 'saturation']);
    expect(host.querySelector('input#sat')).not.toBeNull();
  });

  it('links the docs with the target tint and a named tooltip', () => {
    const nexo = render(
      <FieldRow label="Food" docs={{ url: 'https://docs.nexomc.com/x', target: 'nexo' }}>
        <input />
      </FieldRow>,
    ).querySelector('a');
    expect(nexo?.getAttribute('href')).toBe('https://docs.nexomc.com/x');
    expect(nexo?.getAttribute('target')).toBe('_blank');
    expect(nexo?.getAttribute('aria-label')).toBe('Open Nexo docs: Food');
    expect(nexo?.className).toContain('text-target-nexo');

    const ce = render(
      <FieldRow
        label="Hardness"
        docs={{ url: 'https://xiao-momi.github.io/craft-engine-wiki/', target: 'craftengine', label: 'Block hardness' }}
      >
        <input />
      </FieldRow>,
    ).querySelector('a');
    expect(ce?.getAttribute('aria-label')).toBe('Open CraftEngine wiki: Block hardness');
    expect(ce?.className).toContain('text-target-ce');
  });

  it('prints the error and warning below the control and marks the row invalid', () => {
    const host = render(
      <FieldRow label="Saturation" error="Saturation must be 0 or more." warning="Unusual value.">
        <input />
      </FieldRow>,
    );
    const row = host.querySelector('[data-slot=field-row]');
    expect(row?.getAttribute('data-invalid')).toBe('true');
    expect(host.textContent).toContain('Saturation must be 0 or more.');
    expect(host.textContent).toContain('Unusual value.');
  });

  it('describes the control group with its error and warning', () => {
    const host = render(
      <FieldRow label="Saturation" error="Too small." warning="Unusual.">
        <input />
      </FieldRow>,
    );
    const group = host.querySelector('[role=group]');
    const ids = group?.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids.map((id) => host.querySelector(`[id="${id}"]`)?.textContent)).toEqual(['Too small.', 'Unusual.']);
  });

  it('keeps help in a popover unless it is inline, and drops the label column without a label', () => {
    const popover = render(
      <FieldRow label="Hardness" help="Stone is 1.5.">
        <input />
      </FieldRow>,
    );
    expect(popover.textContent).not.toContain('Stone is 1.5.');
    expect(popover.querySelector('button[aria-label="More information"]')).not.toBeNull();

    const inline = render(
      <FieldRow help="Stone is 1.5." helpInline>
        <input />
      </FieldRow>,
    );
    expect(inline.textContent).toContain('Stone is 1.5.');
    expect(inline.querySelector('label, [data-slot=yaml-key]')).toBeNull();
  });

  it('marks a set or inherited value next to the label', () => {
    expect(
      render(
        <FieldRow label="A" state="set">
          x
        </FieldRow>,
      ).querySelector('[data-state=set]'),
    ).not.toBeNull();
    expect(render(<FieldRow label="A">x</FieldRow>).querySelector('[data-state=default]')).not.toBeNull();
  });
});

describe('interactive primitives', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const mount = (element: React.ReactElement) => act(() => root.render(<TooltipProvider>{element}</TooltipProvider>));
  const button = (name: string, index = 0) => host.querySelectorAll<HTMLButtonElement>(`button[aria-label="${name}"]`)[index];
  const click = (element: Element | undefined) => act(() => (element as HTMLElement).click());
  const fire = (target: Element, event: Event) =>
    act(() => {
      target.dispatchEvent(event);
    });
  const summaries = () => [...host.querySelectorAll('[data-slot=list-row] [data-testid=summary]')].map((node) => node.textContent);
  /** Types into a React-controlled input. */
  const type = (input: HTMLInputElement, value: string) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

  /** A list of names with an inline editor, kept in local state. */
  function Names({ initial, onChange }: { initial: string[]; onChange?: (items: string[]) => void }) {
    const [items, setItems] = useState(initial);
    return (
      <ListEditor
        items={items}
        onChange={(next) => {
          setItems(next);
          onChange?.(next);
        }}
        renderSummary={(item) => <span data-testid="summary">{item}</span>}
        renderEditor={(item, change) => <input data-testid="editor" value={item} onChange={(e) => change(e.target.value)} />}
        onAdd={() => setItems((prev) => [...prev, 'new'])}
        addLabel="Add name"
        emptyText="No names yet."
      />
    );
  }

  describe('ListEditor', () => {
    it('removes, duplicates and moves rows', () => {
      const onChange = vi.fn();
      mount(<Names initial={['a', 'b', 'c']} onChange={onChange} />);
      expect(summaries()).toEqual(['a', 'b', 'c']);

      click(button('Remove', 1));
      expect(summaries()).toEqual(['a', 'c']);
      expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);

      click(button('Duplicate', 0));
      expect(summaries()).toEqual(['a', 'a', 'c']);

      click(button('Move down', 2));
      expect(summaries()).toEqual(['a', 'a', 'c']);
      expect(button('Move down', 2).disabled).toBe(true);
      click(button('Move up', 2));
      expect(summaries()).toEqual(['a', 'c', 'a']);
    });

    it('moves the focus to the next row after a remove', () => {
      mount(<Names initial={['a', 'b', 'c']} />);
      const remove = button('Remove', 1);
      act(() => remove.focus());
      click(remove);
      expect(summaries()).toEqual(['a', 'c']);
      expect(document.activeElement?.closest('[data-slot=list-row]')?.querySelector('[data-testid=summary]')?.textContent).toBe('c');
    });

    it('offers no duplicate when entries have keys of their own', () => {
      mount(<ListEditor items={[{ id: 'x' }]} onChange={() => {}} getKey={(item) => item.id} renderSummary={(item) => item.id} />);
      expect(button('Duplicate')).toBeUndefined();
      expect(button('Remove')).toBeDefined();
    });

    it('moves a row with the arrow keys on its handle and keeps the focus there', () => {
      mount(<Names initial={['a', 'b', 'c']} />);
      const handle = host.querySelectorAll<HTMLButtonElement>('[data-slot=drag-handle]')[0];
      act(() => handle.focus());
      fire(handle, new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(summaries()).toEqual(['b', 'a', 'c']);
      const focusedRow = document.activeElement?.closest('[data-slot=list-row]');
      expect(focusedRow?.querySelector('[data-testid=summary]')?.textContent).toBe('a');
    });

    it('expands a row to its editor and writes the edit back', () => {
      mount(<Names initial={['a', 'b']} />);
      expect(host.querySelector('[data-testid=editor]')).toBeNull();
      const summary = host.querySelectorAll('[data-slot=list-row] button[aria-expanded]')[1];
      click(summary);
      expect(summary.getAttribute('aria-expanded')).toBe('true');
      type(host.querySelector<HTMLInputElement>('[data-testid=editor]')!, 'bee');
      expect(summaries()).toEqual(['a', 'bee']);
    });

    it('shows the empty hint and opens the editor of an added entry', () => {
      mount(<Names initial={[]} />);
      expect(host.textContent).toContain('No names yet.');
      click([...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Add name')));
      expect(summaries()).toEqual(['new']);
      expect(host.querySelector<HTMLInputElement>('[data-testid=editor]')?.value).toBe('new');
    });
  });

  describe('MapEditor', () => {
    /** A map of strings with text inputs as values, kept in local state. */
    function Variables({ onChange }: { onChange: (entries: Record<string, string>) => void }) {
      const [entries, setEntries] = useState<Record<string, string>>({ prefix: '[Shop]', currency: 'coins' });
      return (
        <MapEditor
          entries={entries}
          onChange={(next) => {
            setEntries(next);
            onChange(next);
          }}
          newValue={() => ''}
          keyLabel="Variable"
          reservedKeys={['type']}
          renderValue={(value, change, key) => (
            <input data-testid={`value-${key}`} value={value} onChange={(e) => change(e.target.value)} />
          )}
        />
      );
    }
    const keyInputs = () => [...host.querySelectorAll<HTMLInputElement>('[data-slot=map-row] input[aria-label=Variable]')];
    const newKeyInput = () => [...host.querySelectorAll<HTMLInputElement>('input[aria-label=Variable]')].at(-1)!;
    const addButton = () => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Add entry'))!;

    it('adds an entry and refuses a taken or reserved key', () => {
      const onChange = vi.fn();
      mount(<Variables onChange={onChange} />);
      type(newKeyInput(), 'prefix');
      expect(addButton().disabled).toBe(true);
      expect(host.textContent).toContain('This key already exists.');
      type(newKeyInput(), 'type');
      expect(addButton().disabled).toBe(true);

      type(newKeyInput(), ' suffix ');
      click(addButton());
      expect(onChange).toHaveBeenLastCalledWith({ prefix: '[Shop]', currency: 'coins', suffix: '' });
      expect(newKeyInput().value).toBe('');
    });

    it('renames a key on blur in place, edits a value and removes an entry', () => {
      const onChange = vi.fn();
      mount(<Variables onChange={onChange} />);
      type(keyInputs()[0], 'tag');
      fire(keyInputs()[0], new FocusEvent('focusout', { bubbles: true }));
      expect(Object.keys(onChange.mock.lastCall![0])).toEqual(['tag', 'currency']);

      type(host.querySelector<HTMLInputElement>('[data-testid=value-currency]')!, 'gems');
      expect(onChange).toHaveBeenLastCalledWith({ tag: '[Shop]', currency: 'gems' });

      click(button('Remove', 0));
      expect(onChange).toHaveBeenLastCalledWith({ currency: 'gems' });
    });

    it('keeps the focus in the value input the user moves to right after a rename', () => {
      const onChange = vi.fn();
      mount(<Variables onChange={onChange} />);
      const key = keyInputs()[0];
      act(() => key.focus());
      type(key, 'tag');
      const value = host.querySelector<HTMLInputElement>('[data-testid=value-prefix]')!;
      // Moving the focus blurs the key input, which applies the rename; the row must not remount
      act(() => value.focus());
      expect(Object.keys(onChange.mock.lastCall![0])).toEqual(['tag', 'currency']);
      expect(value.isConnected).toBe(true);
      expect(value.dataset.testid).toBe('value-tag');
      expect(document.activeElement).toBe(value);
    });

    it('shows the old key again after a rename to a taken key', () => {
      const onChange = vi.fn();
      mount(<Variables onChange={onChange} />);
      type(keyInputs()[1], 'prefix');
      fire(keyInputs()[1], new FocusEvent('focusout', { bubbles: true }));
      expect(onChange).not.toHaveBeenCalled();
      expect(keyInputs()[1].value).toBe('currency');
    });
  });
});
