// @vitest-environment jsdom
/**
 * The item editor's frame: which sections each target offers, the section nav with its feature groups, the fallback
 * of the stored section, one open feature per item, the settings search of the command palette, and the feature list
 * panel of a property group.
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { EDITOR_TOP_ATTRIBUTE, goToSection } from './sectionNavigation';
import { featureGroupNavId, itemSectionNav, itemSections, resolveItemSection } from './sections';
import { FEATURE_GROUPS } from './sections/featureGroups';
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
      'events',
      'loot',
      'recipes',
      'advanced',
    ]);
  });

  it('offers Furniture only while the item places furniture', () => {
    expect(itemSections('nexo', openItem('nexo', { Mechanics: { furniture: {} } })).map((s) => s.id)).toContain('furniture');
    expect(itemSections('craftengine', openItem('craftengine', { furniture: {} })).map((s) => s.id)).toContain('furniture');
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
    expect(resolveItemSection(sections, featureGroupNavId('settings'), FEATURE_GROUPS.craftengine)).toMatchObject({
      section: { id: 'features' },
      focus: 'settings',
      navId: 'features/settings',
    });
    expect(resolveItemSection(sections, 'loot', FEATURE_GROUPS.craftengine)).toMatchObject({ section: { id: 'loot' }, navId: 'loot' });
    // "general" was the first tab of the old editor
    expect(resolveItemSection(sections, 'general', FEATURE_GROUPS.craftengine)).toMatchObject({
      section: { id: 'basics' },
      navId: 'basics',
    });
    // A Nexo group stored while a Nexo project was open
    const stale = resolveItemSection(sections, featureGroupNavId('components'), FEATURE_GROUPS.craftengine);
    expect(stale).toMatchObject({ section: { id: 'features' }, navId: 'features' });
    expect(stale.focus).toBeUndefined();
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
    const settings = paletteSettings(formFor('nexo'), item, '1.21.8');
    const stack = settings.find((setting) => setting.def.id === 'Components.max_stack_size');
    expect(stack).toMatchObject({ navId: 'features/components', added: true, yamlKey: 'Components.max_stack_size' });
    expect(stack?.def.aliases).toContain('stack size');
    expect(settings.find((setting) => setting.def.id === 'lore')?.navId).toBe('basics');
  });

  it('offers block settings only on an item that places a block', () => {
    const schema = formFor('craftengine');
    const hasHardness = (item: Item) => paletteSettings(schema, item, '1.21.8').some((s) => s.def.id === 'block.settings.hardness');
    expect(hasHardness(openItem('craftengine', {}))).toBe(false);
    const block = openItem('craftengine', { block: { settings: {} } });
    expect(paletteSettings(schema, block, '1.21.8').find((s) => s.def.id === 'block.settings.hardness')?.navId).toBe('block');
  });

  it('leaves out settings that conflict with one in use and reports version support', () => {
    const schema = formFor('nexo');
    const conflicting = schema.properties.find((def) => def.conflicts?.length && def.group !== 'general');
    const other = schema.properties.find((def) => def.id === conflicting?.conflicts?.[0]);
    if (!conflicting || !other || other.storage !== 'config') throw new Error('the Nexo form has no conflicting properties');
    const config = other.path.reduceRight<object>((inner, key) => ({ [key]: inner }), {});
    const ids = paletteSettings(schema, openItem('nexo', config as Item['config']), '1.21.8').map((s) => s.def.id);
    expect(ids).not.toContain(conflicting.id);
    const old = paletteSettings(schema, openItem('nexo', {}), '1.21.4');
    expect(old.find((s) => s.def.id === 'Components.tooltip_display')?.support).toBe('tooOld');
  });

  it('adds a setting the item does not use, then goes to its group and opens it', () => {
    const item = openItem('nexo', {});
    const food = paletteSettings(formFor('nexo'), item, '1.21.8').find((setting) => setting.def.id === 'Components.food');
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

describe('section navigation', () => {
  it('scrolls to a feature group once its section has rendered, from any section and when picked again', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    const flush = () => {
      while (frames.length) frames.shift()?.(0);
    };
    const scrolled: string[] = [];
    const scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this.getAttribute('data-section-id') ?? 'top');
    });
    Element.prototype.scrollIntoView = scrollIntoView;
    document.body.innerHTML = `<div ${EDITOR_TOP_ATTRIBUTE}><section data-section-id="group-mechanics"></section></div>`;
    try {
      goToSection('features/mechanics');
      expect(useUiStore.getState().editorSection).toBe('features/mechanics');
      flush();
      goToSection('features/mechanics');
      flush();
      goToSection('advanced');
      flush();
      expect(scrolled).toEqual(['group-mechanics', 'group-mechanics', 'top']);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('feature drafts', () => {
  it('keeps the fields of a feature mounted when opening another one closes it', () => {
    const item = openItem('nexo', { Components: { food: { nutrition: 4, saturation: 2.4 }, equippable: { slot: 'HEAD' } } });
    setFeatureOpen(item.id, 'Components.food', true);
    const host = render(<PropertyGroupPanel item={item} group="components" />, 'nexo');
    const food = host.querySelector('[data-feature-id="Components.food"]');
    const input = food?.querySelector('input');
    expect(input).toBeTruthy();
    act(() => setFeatureOpen(item.id, 'Components.equippable', true));
    expect(food?.getAttribute('data-open')).toBeNull();
    expect(input?.isConnected).toBe(true);
  });
});
