// @vitest-environment jsdom
/**
 * Feature rows: the value summaries, a property edited inline in its row, an expandable property with its fields and
 * notes, the issue icon, the menu actions, and the expansion kept in the ui store.
 */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Field, PropertyDef } from '@resourcepackbuilder/core/form';
import { formFor } from '@resourcepackbuilder/core/targets';
import { useUiStore } from '../../store/ui';
import { cleanup, click, render } from '../catalog/testRender';
import { featureSummary, type SummaryText } from './featureSummary';
import { FeatureList, FeatureRow } from './FeatureRow';
import { expandFeature, featureExpansionKey, PropertyFeatureRow } from './PropertyFeatureRow';

const TEXT: SummaryText = {
  on: 'On',
  off: 'Off',
  notSet: 'Not set',
  entries: (count) => `${count} entries`,
  option: (key) => `[${key}]`,
};

const nexo = formFor('nexo');
const property = (id: string): PropertyDef => {
  const def = nexo.properties.find((p) => p.id === id);
  if (!def) throw new Error(`no property ${id}`);
  return def;
};

afterEach(() => {
  cleanup();
  useUiStore.setState({ expandedFeatures: {} });
});

describe('featureSummary', () => {
  const field = (type: Field['type'], rest: object = {}) => ({ type, key: 'k', label: 'l', ...rest }) as Field;

  it('summarises scalars, lists and empty values', () => {
    expect(featureSummary(field('boolean'), true, TEXT)).toBe('On');
    expect(featureSummary(field('boolean'), false, TEXT)).toBe('Off');
    expect(featureSummary(field('number'), 64, TEXT)).toBe('64');
    expect(featureSummary(field('number'), undefined, TEXT)).toBe('Not set');
    expect(featureSummary(field('presence'), {}, TEXT)).toBe('On');
    expect(featureSummary(field('stringList'), ['a', 'b', 'c', 'd', 'e'], TEXT)).toBe('a, b, c +2');
    expect(featureSummary(field('select', { options: [{ value: 'x', label: 'opt.x' }] }), 'x', TEXT)).toBe('[opt.x]');
    expect(featureSummary(field('typedList'), [{}, {}], TEXT)).toBe('2 entries');
    expect(featureSummary(field('map'), { a: 1 }, TEXT)).toBe('1 entries');
  });

  it('names the set keys of an object', () => {
    const food = property('Components.food').field;
    expect(featureSummary(food, { nutrition: 4, saturation: 2.4, can_always_eat: true }, TEXT)).toBe(
      'nutrition 4, saturation 2.4, can_always_eat true',
    );
    expect(featureSummary(food, { a: 1, b: 2, c: 3, d: 4 }, TEXT)).toBe('a 1, b 2, c 3 +1');
    expect(featureSummary(food, {}, TEXT)).toBe('Not set');
  });
});

describe('FeatureRow', () => {
  it('lists rows in one panel and shows label, summary, key, docs and the issue', () => {
    const host = render(
      <FeatureList>
        <FeatureRow
          label="Food"
          summary="nutrition 4"
          yamlKey="Components.food"
          docs={{ url: 'https://docs.nexomc.com/x', target: 'nexo' }}
          issue={{ tone: 'error', message: 'Saturation must be 0 or more.' }}
        >
          <p>fields</p>
        </FeatureRow>
        <FeatureRow label="Fire resistant" control={<span>switch</span>} />
      </FeatureList>,
    );
    const rows = host.querySelectorAll('[data-slot=feature-row]');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('nutrition 4');
    expect(rows[0].querySelector('[data-slot=yaml-key]')?.textContent).toBe('Components.food');
    expect(rows[0].querySelector('a')?.getAttribute('aria-label')).toBe('Open Nexo docs: Food');
    expect(rows[0].querySelector('[role=img]')?.getAttribute('aria-label')).toBe('Saturation must be 0 or more.');
    // An inline control row has no expanded state
    expect(rows[1].querySelector('[data-slot=feature-toggle]')).toBeNull();
    expect(rows[1].textContent).toContain('switch');
    // Expanding hides the summary and shows the content
    click(rows[0].querySelector('[data-slot=feature-toggle]'));
    expect(rows[0].textContent).toContain('fields');
    expect(rows[0].textContent).not.toContain('nutrition 4');
  });
});

describe('PropertyFeatureRow', () => {
  it('edits a boolean property right in its row', () => {
    const onChange = vi.fn();
    const host = render(
      <PropertyFeatureRow def={property('Components.fire_resistant')} value={true} onChange={onChange} onRemove={() => {}} />,
      'nexo',
    );
    const row = host.querySelector('[data-slot=feature-row]') as HTMLElement;
    expect(row.querySelector('[data-slot=feature-toggle]')).toBeNull();
    const toggle = row.querySelector('[role=switch]');
    expect(toggle?.getAttribute('aria-checked')).toBe('true');
    click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('expands an object property to its fields and keeps the expansion in the store', () => {
    const key = featureExpansionKey('item1', 'Components.food');
    const host = render(
      <PropertyFeatureRow
        def={property('Components.food')}
        value={{ nutrition: 4, saturation: 2.4 }}
        onChange={() => {}}
        onRemove={() => {}}
        expansionKey={key}
        version="1.21.4"
      />,
      'nexo',
    );
    const row = host.querySelector('[data-slot=feature-row]') as HTMLElement;
    expect(row.textContent).toContain('nutrition 4, saturation 2.4');
    expect(row.querySelector('[data-slot=yaml-key]')?.textContent).toBe('Components.food');
    expect(row.querySelector('a[data-target=nexo]')).not.toBeNull();
    click(row.querySelector('[data-slot=feature-toggle]'));
    expect(useUiStore.getState().expandedFeatures[key]).toBe(true);
    expect(row.querySelectorAll('[data-slot=field-row]').length).toBeGreaterThan(1);
  });

  it('opens a feature that was just added', () => {
    act(() => expandFeature('item2', 'Components.food'));
    const host = render(
      <PropertyFeatureRow
        def={property('Components.food')}
        value={{}}
        onChange={() => {}}
        onRemove={() => {}}
        expansionKey={featureExpansionKey('item2', 'Components.food')}
      />,
      'nexo',
    );
    expect(host.querySelector('[data-slot=feature-toggle]')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('flags a property the project version does not have', () => {
    const host = render(
      <PropertyFeatureRow
        def={property('Components.tooltip_display')}
        value={['minecraft:attribute_modifiers']}
        onChange={() => {}}
        onRemove={() => {}}
        version="1.21.4"
        open
      />,
      'nexo',
    );
    expect(host.textContent).toContain('from 1.21.5');
    expect(host.textContent).toContain('Needs Minecraft 1.21.5 or newer; the project is set to 1.21.4.');
  });
});
