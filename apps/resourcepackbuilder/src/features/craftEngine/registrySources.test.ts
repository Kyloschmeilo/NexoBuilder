/** The CraftEngine registries as entry sources: keys, labels, the list and map operations and the add command. */
import { afterEach, describe, expect, it } from 'vitest';
import { createProject, type Project } from '@resourcepackbuilder/core/project';
import { setProject, useProjectStore } from '../../store/project';
import { CRAFT_ENGINE_VIEW_NAMES } from '../../shell/sidebar/ViewEntries';
import { CRAFT_ENGINE_REGISTRIES } from './registries';
import {
  CRAFT_ENGINE_SOURCES,
  entryKey,
  followListEntry,
  type ListSource,
  mapKeyProblem,
  type MapSource,
  newListEntry,
  parseEntryKey,
  resolveEntry,
  sourceGroups,
  withDuplicate,
  withListEntry,
  withMovedEntry,
  withoutKey,
  withoutListEntry,
  withRenamedKey,
} from './registrySources';

function sampleProject(): Project {
  const project = createProject('Demo', 'demo', undefined, 'craftengine');
  project.craftEngine = {
    lootSources: [{ id: 'zombie_extra', type: 'entity' }, { type: 'block' }],
    templates: [{ id: 'my:tpl', body: {} }],
    globalVariables: { prefix: '<gold>[Shop]', footer: 'Thanks' },
    lang: { en_us: { 'item.title': 'Title', other: 'x' } },
    configuredFeatures: [{ id: 'oak' }],
    placedFeatures: [{ id: 'oak_placed' }, { id: 'birch_placed' }],
  };
  return project;
}

const lootSources = CRAFT_ENGINE_SOURCES.lootSources[0] as ListSource;
const globals = CRAFT_ENGINE_SOURCES.globalVariables[0] as MapSource;

afterEach(() => setProject(null));

describe('entry keys', () => {
  it('splits a key at its first slash', () => {
    expect(parseEntryKey('lang/en_us')).toEqual({ source: 'lang', rest: 'en_us' });
    expect(parseEntryKey('globalVariables/a/b')).toEqual({ source: 'globalVariables', rest: 'a/b' });
    expect(parseEntryKey('nope')).toBeNull();
    expect(parseEntryKey('/0')).toBeNull();
  });

  it('resolves list entries by index and map entries by key, and nothing that is gone', () => {
    const project = sampleProject();
    const sources = CRAFT_ENGINE_SOURCES.lootSources;
    expect(resolveEntry(sources, project, 'lootSources/1')).toMatchObject({ kind: 'list', index: 1, value: { type: 'block' } });
    expect(resolveEntry(sources, project, 'lootSources/2')).toBeNull();
    expect(resolveEntry(sources, project, 'lootSources/x')).toBeNull();
    expect(resolveEntry(sources, project, 'templates/0')).toBeNull();
    expect(resolveEntry(sources, project, undefined)).toBeNull();
    expect(resolveEntry(CRAFT_ENGINE_SOURCES.globalVariables, project, 'globalVariables/footer')).toMatchObject({
      kind: 'map',
      key: 'footer',
      value: 'Thanks',
    });
    expect(resolveEntry(CRAFT_ENGINE_SOURCES.globalVariables, project, 'globalVariables/toString')).toBeNull();
  });
});

describe('sourceGroups', () => {
  it('lists list entries by their id with the type of a typed entry, and unnamed ones with an empty label', () => {
    const [group] = sourceGroups(CRAFT_ENGINE_SOURCES.lootSources, sampleProject());
    expect(group).toEqual({
      id: 'lootSources',
      entries: [
        { key: 'lootSources/0', label: 'zombie_extra', detail: 'entity' },
        { key: 'lootSources/1', label: '', detail: 'block' },
      ],
    });
  });

  it('lists map entries by key, with a short text value or the size of a nested map', () => {
    const project = sampleProject();
    expect(sourceGroups(CRAFT_ENGINE_SOURCES.globalVariables, project)[0]?.entries).toEqual([
      { key: 'globalVariables/prefix', label: 'prefix', detail: '<gold>[Shop]' },
      { key: 'globalVariables/footer', label: 'footer', detail: 'Thanks' },
    ]);
    const [lang, server] = sourceGroups(CRAFT_ENGINE_SOURCES.translations, project);
    expect(lang?.entries).toEqual([{ key: 'lang/en_us', label: 'en_us', detail: '2' }]);
    expect(server).toEqual({ id: 'server', entries: [] });
  });

  it('keeps one group per source in order (worldgen: configured, then placed)', () => {
    const groups = sourceGroups(CRAFT_ENGINE_SOURCES.worldgen, sampleProject());
    expect(groups.map((group) => [group.id, group.entries.map((entry) => entry.label)])).toEqual([
      ['configuredFeatures', ['oak']],
      ['placedFeatures', ['oak_placed', 'birch_placed']],
    ]);
  });
});

describe('list and map operations', () => {
  const list = ['a', 'b', 'c'];

  it('replaces, removes, duplicates and moves list entries without touching the input', () => {
    expect(withListEntry(list, 1, 'B')).toEqual(['a', 'B', 'c']);
    expect(withoutListEntry(list, 0)).toEqual(['b', 'c']);
    expect(withDuplicate(list, 1)).toEqual(['a', 'b', 'b', 'c']);
    expect(withMovedEntry(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(withMovedEntry(list, 2, -5)).toEqual(['c', 'a', 'b']);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('duplicates objects as copies', () => {
    const entries = [{ id: 'x', nested: { a: 1 } }];
    const [first, copy] = withDuplicate(entries, 0) as typeof entries;
    expect(copy).toEqual(first);
    expect(copy).not.toBe(first);
    expect(copy?.nested).not.toBe(first?.nested);
  });

  it('renames a map key in place and removes keys', () => {
    expect(Object.keys(withRenamedKey({ a: 1, b: 2, c: 3 }, 'b', 'z'))).toEqual(['a', 'z', 'c']);
    expect(withoutKey({ a: 1, b: 2 }, 'a')).toEqual({ b: 2 });
  });

  it('checks new and renamed map keys', () => {
    expect(mapKeyProblem({ a: 1 }, '  ')).toBe('empty');
    expect(mapKeyProblem({ a: 1 }, 'a')).toBe('taken');
    expect(mapKeyProblem({ a: 1 }, ' a ', 'a')).toBeNull();
    expect(mapKeyProblem({ a: 1 }, 'b')).toBeNull();
  });

  it('creates new list entries from the field template (empty for a typed entry)', () => {
    expect(newListEntry(lootSources)).toEqual({});
    expect(newListEntry(CRAFT_ENGINE_SOURCES.templates[0] as ListSource)).toEqual({ id: '', body: {} });
  });
});

describe('the CraftEngine registries', () => {
  it('cover every view of the Logic panel', () => {
    for (const view of CRAFT_ENGINE_VIEW_NAMES) expect(CRAFT_ENGINE_REGISTRIES[view]?.view).toBe(view);
  });

  it('give every source an entry key of its own id', () => {
    for (const sources of Object.values(CRAFT_ENGINE_SOURCES))
      for (const source of sources) expect(entryKey(source, 0)).toBe(`${source.id}/0`);
  });

  it('write list changes through the source command', () => {
    setProject(sampleProject());
    const project = useProjectStore.getState().project!;
    lootSources.write(withoutListEntry(lootSources.read(project), 0));
    expect(useProjectStore.getState().project?.craftEngine?.lootSources).toEqual([{ type: 'block' }]);
    globals.write(withRenamedKey(globals.read(useProjectStore.getState().project!), 'prefix', 'head'));
    expect(Object.keys(useProjectStore.getState().project?.craftEngine?.globalVariables ?? {})).toEqual(['head', 'footer']);
  });
});

describe('followListEntry', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };

  it('keeps an entry that stayed or was edited in place', () => {
    expect(followListEntry([a, b, c], [a, b, c], 1)).toBe(1);
    expect(followListEntry([a, b, c], [a, { id: 'b2' }, c], 1)).toBe(1);
  });

  it('follows an entry that moved (undo of a move)', () => {
    expect(followListEntry([a, b, c], [b, a, c], 1)).toBe(0);
  });

  it('gives up when the slot now holds a neighbour (undo of an add or duplicate)', () => {
    expect(followListEntry([a, { id: 'new' }, b], [a, b], 1)).toBeNull();
  });
});
