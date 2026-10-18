/** The registry model of the Media and Logic panels: search, counts, issue levels, the media entries and the texts. */
import { describe, expect, it } from 'vitest';
import { createGlyph, createProject, createSound, type Project } from '@resourcepackbuilder/core/project';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { planExport } from '@resourcepackbuilder/export';
import { CRAFT_ENGINE_REGISTRIES } from '../../../features/craftEngine/registries';
import { MEDIA_REGISTRIES, mediaEntries } from '../../../features/media/mediaKinds';
import { MEDIA_VIEW_NAMES } from '../ViewEntries';
import { entryCount, entryMatches, filterGroups, hasEntry, type RegistryGroup, worstEntryLevel } from './registry';
import { REGISTRY_GROUP_IDS, REGISTRY_GROUP_TEXTS, REGISTRY_MAP_GROUP_IDS, registryGroupId } from './registryTexts';

const groups: RegistryGroup[] = [
  {
    id: 'configuredFeatures',
    entries: [
      { key: 'configuredFeatures/0', label: 'oak_tree', level: 'warning' },
      { key: 'configuredFeatures/1', label: 'ruby_ore', detail: 'ore' },
    ],
  },
  { id: 'placedFeatures', entries: [{ key: 'placedFeatures/0', label: 'oak_placed', level: 'info' }] },
];

describe('registry search and summaries', () => {
  it('matches label or detail, ignoring case and surrounding spaces', () => {
    expect(entryMatches({ key: 'k', label: 'Ruby_Ore' }, ' ruby ')).toBe(true);
    expect(entryMatches({ key: 'k', label: 'x', detail: 'entity' }, 'ENT')).toBe(true);
    expect(entryMatches({ key: 'k', label: 'x' }, 'y')).toBe(false);
    expect(entryMatches({ key: 'k', label: 'x' }, '')).toBe(true);
  });

  it('keeps only matching entries and drops groups without a match while searching', () => {
    expect(filterGroups(groups, '')).toBe(groups);
    expect(filterGroups(groups, 'oak')).toEqual([
      { id: 'configuredFeatures', entries: [groups[0]!.entries[0]] },
      { id: 'placedFeatures', entries: groups[1]!.entries },
    ]);
    expect(filterGroups(groups, 'ore')).toEqual([{ id: 'configuredFeatures', entries: [groups[0]!.entries[1]] }]);
  });

  it('counts entries, finds keys and reports the worst level', () => {
    expect(entryCount(groups)).toBe(3);
    expect(hasEntry(groups, 'placedFeatures/0')).toBe(true);
    expect(hasEntry(groups, 'placedFeatures/1')).toBe(false);
    expect(hasEntry(groups, undefined)).toBe(false);
    expect(worstEntryLevel(groups)).toBe('warning');
    expect(worstEntryLevel([{ id: 'x', entries: [{ key: 'a', label: 'a', level: 'error' }, ...groups[0]!.entries] }])).toBe('error');
    expect(worstEntryLevel([{ id: 'x', entries: [] }])).toBeNull();
  });
});

describe('media registries', () => {
  function mediaProject(): Project {
    const project = createProject('Demo', 'demo', undefined, 'nexo');
    const file = { name: 'heart.png', dataUrl: 'data:image/png;base64,AAAA', width: 16, height: 8 };
    project.glyphs.push(createGlyph('g1', 'heart', file, 'image'), createGlyph('g2', 'cell', null, 'reference'));
    project.sounds.push(createSound('s1', 'click', []));
    return project;
  }

  it('cover every view of the Media panel', () => {
    for (const view of MEDIA_VIEW_NAMES) expect(MEDIA_REGISTRIES[view]?.view).toBe(view);
  });

  it('list entries by their internal id with the media id, size and thumbnail', () => {
    const entries = mediaEntries('glyph', mediaProject(), null);
    expect(entries[0]).toEqual({ key: 'g1', label: 'heart', detail: '16×8', thumb: 'data:image/png;base64,AAAA', level: null });
    expect(entries[1]).toMatchObject({ key: 'g2', label: 'cell', thumb: undefined });
  });

  it('mark entries with the worst level of their issues', () => {
    const project = mediaProject();
    const plan = planExport(project, { includeBinaries: false });
    const [sound] = mediaEntries('sound', project, plan);
    // A sound without files that neither replaces nor references another one is an error
    expect(sound?.level).toBe('error');
  });
});

describe('registry texts', () => {
  it('cover every group id the registries produce', () => {
    const project = createProject('Demo', 'demo', undefined, 'craftengine');
    const ids = [...Object.values(CRAFT_ENGINE_REGISTRIES), ...Object.values(MEDIA_REGISTRIES)].flatMap((registry) =>
      registry!.groups(project, null).map((group) => group.id),
    );
    for (const id of ids) expect(registryGroupId(id), id).toBe(id);
    expect(registryGroupId('dialogs')).toBeNull();
  });

  for (const [locale, messages] of Object.entries(MESSAGES_BY_LOCALE)) {
    it(`has every group text in ${locale}`, () => {
      const registry = messages.media.registry as unknown as {
        groups: Record<string, Record<string, string>>;
        generic: Record<string, string>;
      };
      for (const id of REGISTRY_GROUP_IDS)
        for (const text of REGISTRY_GROUP_TEXTS) expect(registry.groups[id]?.[text], `${id}.${text}`).toBeTruthy();
      for (const id of REGISTRY_MAP_GROUP_IDS) expect(registry.groups[id]?.keyLabel, `${id}.keyLabel`).toBeTruthy();
      for (const text of REGISTRY_GROUP_TEXTS) expect(registry.generic[text]).toBeTruthy();
    });
  }
});
