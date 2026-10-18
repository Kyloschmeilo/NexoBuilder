// @vitest-environment jsdom
/**
 * The furniture editors: variant helpers, the furniture commands, the structured Nexo hitbox, seat and light lists
 * (also as the schema field's editor), and the CraftEngine variant editor's two panes.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { ObjectField } from '@resourcepackbuilder/core/form';
import { createItem, createProject, insertItem, type Item, type PackTargetId } from '@resourcepackbuilder/core/project';
import { formFor } from '@resourcepackbuilder/core/targets';
import { addCraftEngineFurnitureVariant, removeCraftEngineFurnitureVariant, updateNexoFurniture } from '../../../commands/items';
import { cleanup, click, render, type } from '../../../components/catalog/testRender';
import { FieldRenderer } from '../../../components/editor';
import { getProject, setProject } from '../../../store/project';
import { FurnitureSection } from './FurnitureSection';
import { itemFurniture, placesFurniture, variantNameError, variantNames, withoutVariant, withVariant } from './model';
import { NexoHitboxList, NexoLightList } from './nexoEntryEditors';

/** Opens a project of `target` with one item whose config is `config`; returns the item. */
function openProject(target: PackTargetId, config: Record<string, unknown>): Item {
  const project = createProject('Test', undefined, '1.21.8', target);
  const item = {
    ...createItem({ displayName: 'Chair', itemId: 'chair', folderId: '', model: null }),
    config: { material: 'PAPER', ...config },
  };
  insertItem(project, item as Item);
  setProject(project);
  return item as Item;
}

const itemConfig = (id: string) => getProject()?.items[id]?.config;
/** The summary of a list row (its expand button, without the row's action tooltips). */
const summaryOf = (row: Element | null) => row?.querySelector('button[aria-expanded]')?.textContent;

afterEach(() => {
  cleanup();
  setProject(null);
});

describe('furniture variants', () => {
  const furniture = { variants: { ground: {}, sitting: {} }, rules: { ground: { rotation: 'four' }, sitting: { alignment: 'center' } } };

  it('lists the anchors first, then the furniture’s own variants', () => {
    expect(variantNames(furniture)).toEqual(['ground', 'wall', 'ceiling', 'sitting']);
  });

  it('checks a new variant’s name', () => {
    expect(variantNameError(furniture, ' ')).toBe('required');
    expect(variantNameError(furniture, 'Big One')).toBe('invalid');
    expect(variantNameError(furniture, 'sitting')).toBe('taken');
    expect(variantNameError(furniture, 'lying_2')).toBeNull();
  });

  it('adds a variant with an element and a hitbox, and removes one with its rule', () => {
    const added = withVariant(furniture, 'wall');
    expect(Object.keys(added.variants as object)).toEqual(['ground', 'sitting', 'wall']);
    expect((added.variants as Record<string, object>).wall).toMatchObject({ elements: [{}], hitboxes: [{}] });
    expect(withVariant(added, 'ground')).toBe(added);
    expect(withoutVariant(furniture, 'sitting')).toEqual({ variants: { ground: {} }, rules: { ground: { rotation: 'four' } } });
    expect(withoutVariant({ variant: { ground: {} }, rules: { ground: {} } }, 'ground')).toEqual({ variant: {} });
  });

  it('tells whether an item places furniture for each target', () => {
    const ce = openProject('craftengine', { furniture: {} });
    expect(placesFurniture(ce, 'craftengine')).toBe(true);
    expect(placesFurniture(ce, 'nexo')).toBe(false);
    const nexo = openProject('nexo', { Mechanics: { furniture: { seats: ['0,0,0'] } } });
    expect(itemFurniture(nexo, 'nexo')).toEqual({ seats: ['0,0,0'] });
  });
});

describe('furniture commands', () => {
  it('adds and removes a CraftEngine furniture variant', () => {
    const item = openProject('craftengine', { furniture: { variants: { ground: { elements: [] } } } });
    addCraftEngineFurnitureVariant(item.id, 'wall');
    expect(Object.keys((itemConfig(item.id)?.furniture as { variants: object }).variants)).toEqual(['ground', 'wall']);
    removeCraftEngineFurnitureVariant(item.id, 'ground');
    expect(Object.keys((itemConfig(item.id)?.furniture as { variants: object }).variants)).toEqual(['wall']);
  });

  it('changes a Nexo furniture mechanic, and nothing without one', () => {
    const item = openProject('nexo', { Mechanics: { furniture: { rotatable: true } } });
    updateNexoFurniture(item.id, (f) => ({ ...f, seats: ['0,0.5,0'] }));
    expect(itemConfig(item.id)?.Mechanics).toEqual({ furniture: { rotatable: true, seats: ['0,0.5,0'] } });
    const plain = openProject('nexo', {});
    updateNexoFurniture(plain.id, (f) => ({ ...f, seats: [] }));
    expect(itemConfig(plain.id)?.Mechanics).toBeUndefined();
  });
});

describe('Nexo furniture entry lists', () => {
  it('shows every hitbox kind in one list and writes an edit back to its kind', () => {
    openProject('nexo', {});
    let value: unknown = { barriers: ['0..1,0,0'], interactions: ['0,1,0 1,2'] };
    const host = render(<NexoHitboxList label="Hitboxes" value={value} onChange={(next) => (value = next)} />, 'nexo');
    const rows = [...host.querySelectorAll('[data-slot=list-row]')];
    expect(rows.map((row) => summaryOf(row))).toEqual(['Barrier0, 0, 0 → 1, 0, 0', 'Interaction0, 1, 0 · 1 × 2']);
    click(rows[1].querySelector('button[aria-expanded]'));
    type(host.querySelector<HTMLInputElement>('input[aria-label="Width"]')!, '3');
    expect(value).toEqual({ barriers: ['0..1,0,0'], interactions: ['0,1,0 3,2'] });
  });

  it('keeps an entry Nexo cannot read editable as text', () => {
    openProject('nexo', {});
    let value: unknown = ['0,0,0 15', 'somewhere'];
    const host = render(<NexoLightList label="Lights" value={value} onChange={(next) => (value = next)} />, 'nexo');
    const rows = host.querySelectorAll('[data-slot=list-row]');
    expect(summaryOf(rows[0])).toBe('Light 10, 0, 0 · level 15');
    click(rows[1].querySelector('button[aria-expanded]'));
    expect(host.textContent).toContain('The plugin cannot read this entry.');
  });

  it('is the editor of the schema’s hitbox field, also in a FURNITURE state', () => {
    openProject('nexo', {});
    const furniture = formFor('nexo').properties.find((def) => def.id === 'Mechanics.furniture')?.field as ObjectField;
    const hitbox = furniture.fields.find((f) => f.key === 'hitbox')!;
    const host = render(<FieldRenderer field={hitbox} value={{ shulkers: ['0,0,0 1 1 north'] }} onChange={() => undefined} />, 'nexo');
    expect(summaryOf(host.querySelector('[data-slot=list-row]'))).toBe('Shulker0, 0, 0 · size 1 · North');
    const states = furniture.fields.find((f) => f.key === 'states') as ObjectField;
    const stateFields = (states.fields.find((f) => f.key === '*') as { value: ObjectField }).value.fields;
    expect(stateFields.find((f) => f.key === 'hitbox')?.editor).toBe(hitbox.editor);
    expect(stateFields.find((f) => f.key === 'properties')?.type).toBe('object');
    const door = furniture.fields.find((f) => f.key === 'door') as ObjectField;
    expect(door.fields.find((f) => f.key === 'open_properties')?.type).toBe('object');
  });
});

describe('CraftEngine furniture section', () => {
  const furniture = {
    variants: {
      ground: {
        elements: [{ type: 'item_display', position: '0,0.5,0' }],
        hitboxes: [{ type: 'interaction', position: '0,0,0', width: 1, height: 1, seats: ['0,0.5,0 90'] }],
      },
      wall: { elements: [], hitboxes: [] },
    },
  };

  it('edits the selected hitbox and its seats in the detail pane', () => {
    const item = openProject('craftengine', { furniture });
    const host = render(<FurnitureSection item={getProject()!.items[item.id]} />, 'craftengine');
    expect(host.querySelector('[data-slot=furniture-detail]')?.textContent).toContain('Ground variant');
    const hitboxRow = [...host.querySelectorAll('button[aria-pressed]')].find((b) => b.textContent?.startsWith('Interaction'));
    expect(hitboxRow?.textContent).toBe('Interaction0, 0, 0 · 1 × 1 · 1 seat');
    click(hitboxRow);
    const pane = host.querySelector('[data-slot=furniture-detail]')!;
    expect(pane.textContent).toContain('Hitbox 1');
    expect(summaryOf(pane.querySelector('[data-slot=list-row]'))).toBe('Seat0, 0.5, 0 · yaw 90');
  });

  it('renders nothing while the item places no furniture', () => {
    const item = openProject('craftengine', {});
    expect(render(<FurnitureSection item={item} />, 'craftengine').textContent).toBe('');
  });
});
