// @vitest-environment jsdom
/**
 * The item editor's frame: which sections each target offers, the section nav with its feature groups, the fallback
 * of the stored section, one open feature per item, the settings search of the command palette, and the feature list
 * panel of a property group.
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formFor } from '@resourcepackbuilder/core/targets';
import {
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type PackTargetId,
} from '@resourcepackbuilder/core/project';
import { cleanup, render } from '../../components/catalog/testRender';
import { featureExpansionKey } from '../../components/features';
import { useProjectStore } from '../../store/project';
import { useUiStore } from '../../store/ui';
import { setFeatureOpen } from './properties/featureFocus';
import { PropertyGroupPanel } from './properties/PropertyGroupPanel';
import { featureGroupNavId, itemSectionNav, itemSections, resolveItemSection } from './sections';
import { openPaletteSetting, paletteSettings } from './settingsPalette';

/** Opens a project of `target` holding one item with `config`, and returns the item. */
function openItem(target: PackTargetId, config: Item['config']): Item {
  const project = createProject('Test', 'test', '1.21.8', target);
  const folder = createFolder('Weapons', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Fire Sword', itemId: 'fire_sword', folderId: folder.id, model: null });
  item.config = { ...item.config, ...config };
  insertItem(project, item);
  useProjectStore.setState({ project });
  return item;
}

/** The open project's current copy of an item. */
const current = (id: string) => useProjectStore.getState().project?.items[id] as Item;

const labels = { section: (id: string) => `S:${id}`, group: (group: string) => `G:${group}` };

beforeEach(() => useUiStore.setState({ expandedFeatures: {}, editorSection: 'general' }));
afterEach(cleanup);

describe('item sections', () => {
  it('offers the CraftEngine-only sections in CraftEngine projects only, and textures only with a model', () => {
    const item = openItem('nexo', {});
    expect(itemSections('nexo', item).map((s) => s.id)).toEqual(['basics', 'model', 'features', 'recipes', 'advanced']);
    expect(itemSections('craftengine', item).map((s) => s.id)).toEqual([
      'basics',
      'model',
      'features',
      'block',
      'furniture',
      'events',
      'loot',
      'recipes',
      'advanced',
    ]);
  });

  it('lists the feature groups below Features with their counts, empty ones faint', () => {
    const item = openItem('nexo', { Components: { food: { nutrition: 4 }, max_stack_size: 1 }, Mechanics: { commands: {} } });
    const nav = itemSectionNav(formFor('nexo'), item, labels);
    expect(nav.find((entry) => entry.id === 'features')).toMatchObject({ label: 'S:features', count: 3 });
    const groups = nav.filter((entry) => entry.level === 1);
    expect(groups.map((entry) => [entry.id, entry.count, entry.muted])).toEqual([
      ['features/components', 2, false],
      ['features/mechanics', 1, false],
      ['features/attributes', 0, true],
      ['features/appearance', 0, true],
    ]);
  });

  it('shows Features focused on a group, and the first section for an unknown or old id', () => {
    const sections = itemSections('craftengine', openItem('craftengine', {}));
    expect(resolveItemSection(sections, featureGroupNavId('settings'))).toMatchObject({
      section: { id: 'features' },
      focus: 'settings',
      navId: 'features/settings',
    });
    expect(resolveItemSection(sections, 'loot')).toMatchObject({ section: { id: 'loot' }, navId: 'loot' });
    // "general" was the first tab of the old editor
    expect(resolveItemSection(sections, 'general')).toMatchObject({ section: { id: 'basics' }, navId: 'basics' });
  });
});

describe('one open feature per item', () => {
  it('closes the other features of the same item and leaves other items alone', () => {
    useUiStore.setState({
      expandedFeatures: { [featureExpansionKey('a', 'x')]: true, [featureExpansionKey('b', 'x')]: true },
    });
    setFeatureOpen('a', 'y', true);
    expect(useUiStore.getState().expandedFeatures).toEqual({ 'a/y': true, 'b/x': true });
    setFeatureOpen('a', 'y', false);
    expect(useUiStore.getState().expandedFeatures['a/y']).toBe(false);
  });
});

describe('settings search of the command palette', () => {
  it('lists the settings of the editor groups with their section and aliases', () => {
    const item = openItem('nexo', { Components: { max_stack_size: 16 } });
    const settings = paletteSettings(formFor('nexo'), item);
    const stack = settings.find((setting) => setting.def.id === 'Components.max_stack_size');
    expect(stack).toMatchObject({ navId: 'features/components', added: true, yamlKey: 'Components.max_stack_size' });
    expect(stack?.def.aliases).toContain('stack size');
    expect(settings.find((setting) => setting.def.id === 'lore')?.navId).toBe('basics');
  });

  it('offers block settings only on an item that places a block', () => {
    const schema = formFor('craftengine');
    const hasHardness = (item: Item) => paletteSettings(schema, item).some((s) => s.def.id === 'block.settings.hardness');
    expect(hasHardness(openItem('craftengine', {}))).toBe(false);
    const block = openItem('craftengine', { block: { settings: {} } });
    expect(paletteSettings(schema, block).find((s) => s.def.id === 'block.settings.hardness')?.navId).toBe('block');
  });

  it('adds a setting the item does not use, then goes to its group and opens it', () => {
    const item = openItem('nexo', {});
    const food = paletteSettings(formFor('nexo'), item).find((setting) => setting.def.id === 'Components.food');
    if (!food) throw new Error('no food setting');
    openPaletteSetting(item.id, food);
    expect(current(item.id).config.Components).toMatchObject({ food: { nutrition: 4 } });
    expect(useUiStore.getState().editorSection).toBe('features/components');
    expect(useUiStore.getState().expandedFeatures[featureExpansionKey(item.id, 'Components.food')]).toBe(true);
  });
});

describe('property group panel', () => {
  it('shows one row per feature with the count, and the empty line of an empty group', () => {
    const item = openItem('nexo', { Components: { food: { nutrition: 4, saturation: 2.4 }, max_stack_size: 1 } });
    const host = render(<PropertyGroupPanel item={item} group="components" />, 'nexo');
    expect(host.querySelector('h2')?.textContent).toBe('Components');
    expect(host.textContent).toContain('2 features');
    expect([...host.querySelectorAll('[data-feature-id]')].map((row) => row.getAttribute('data-feature-id'))).toEqual([
      'Components.max_stack_size',
      'Components.food',
    ]);
    const empty = render(<PropertyGroupPanel item={item} group="mechanics" />, 'nexo');
    expect(empty.querySelectorAll('[data-feature-id]')).toHaveLength(0);
    expect(empty.textContent).toContain('No mechanics yet.');
  });

  it('leaves out excluded properties and opens the catalog of the group from "Add feature"', () => {
    const item = openItem('nexo', { Mechanics: { commands: {}, misc: {} } });
    const host = render(<PropertyGroupPanel item={item} group="mechanics" exclude={['Mechanics.misc']} />, 'nexo');
    expect([...host.querySelectorAll('[data-feature-id]')].map((row) => row.getAttribute('data-feature-id'))).toEqual([
      'Mechanics.commands',
    ]);
    const add = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('Add feature'));
    act(() => add?.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Add to Mechanics');
    // The excluded property is not offered
    expect(dialog?.querySelector('[data-item-id="Mechanics.misc"]')).toBeNull();
    expect(dialog?.querySelector('[data-item-id="Mechanics.commands"]')?.getAttribute('data-added')).toBe('true');
  });
});
