/**
 * Catalog search: matching over label, key, aliases and description, the ranking (label before key before alias
 * before description before words before fuzzy, unsupported last, common first on ties), highlight ranges, facets,
 * grouping and the arrow-key movement between cards.
 */
import { describe, expect, it } from 'vitest';
import {
  catalogFacets,
  catalogGroups,
  fuzzyPositions,
  highlightRanges,
  matchCatalogItem,
  moveInGrid,
  normalizeSearchText,
  orderedCategories,
  searchCatalog,
} from './search';
import type { CatalogItem } from './types';

const item = (id: string, rest: Partial<CatalogItem> = {}): CatalogItem => ({ id, label: id, yamlKey: id, ...rest });

const ITEMS: CatalogItem[] = [
  item('door_block', { label: 'Door', description: 'A two blocks high door that opens by hand', category: 'shapes' }),
  item('trapdoor_block', { label: 'Trapdoor', description: 'Opens like a door', category: 'shapes' }),
  item('falling_block', { label: 'Falling', description: 'Falls like sand', category: 'physics', common: true }),
  item('Components.max_damage', {
    label: 'Max damage',
    yamlKey: 'Components.max_damage',
    aliases: ['durability'],
    category: 'combat',
  }),
  item('Components.food', { label: 'Food', yamlKey: 'Components.food', description: 'Makes the item edible', common: true }),
  item('crop_block', { label: 'Crop', description: 'Grows in stages like wheat', category: 'plants', unsupported: true }),
];

const ids = (query: string) => searchCatalog(ITEMS, query).map((m) => m.item.id);

describe('matching', () => {
  it('reads underscores, dots and colons as spaces without moving positions', () => {
    expect(normalizeSearchText('Components.max_damage')).toBe('components max damage');
    expect(normalizeSearchText('minecraft:stone')).toHaveLength('minecraft:stone'.length);
  });

  it('matches label, key, alias and description and tells which', () => {
    expect(matchCatalogItem(ITEMS[0], 'door')?.tier).toBe(0);
    expect(matchCatalogItem(ITEMS[3], 'max_damage')?.tier).toBe(0); // the label "Max damage" matches "max damage"
    expect(matchCatalogItem(ITEMS[3], 'components')?.tier).toBe(1);
    expect(matchCatalogItem(ITEMS[3], 'durability')?.tier).toBe(2);
    expect(matchCatalogItem(ITEMS[4], 'edible')?.tier).toBe(3);
    expect(matchCatalogItem(ITEMS[0], 'hand high')?.tier).toBe(4);
    expect(matchCatalogItem(ITEMS[2], 'fllng')?.tier).toBe(5);
    expect(matchCatalogItem(ITEMS[2], 'xyz')).toBeNull();
  });

  it('scores exact before prefix before word start before anywhere', () => {
    expect(matchCatalogItem(item('a', { label: 'Door' }), 'door')?.score).toBe(0);
    expect(matchCatalogItem(item('a', { label: 'Doorway' }), 'door')?.score).toBe(1);
    expect(matchCatalogItem(item('a', { label: 'Iron door' }), 'door')?.score).toBe(2);
    expect(matchCatalogItem(item('a', { label: 'Trapdoor' }), 'door')?.score).toBe(3);
  });

  it('keeps fuzzy matches tight', () => {
    expect(fuzzyPositions('falling block', 'flbk')).toBeNull(); // spread over more than three times its length
    expect(fuzzyPositions('falling', 'fllg')).toEqual([0, 2, 3, 6]);
    expect(fuzzyPositions('door', 'd')).toBeNull(); // one letter is no fuzzy query
  });
});

describe('ordering', () => {
  it('ranks label matches before key, alias and description matches', () => {
    // "door": Door (label exact), Trapdoor (label anywhere), then nothing else by label
    expect(ids('door')).toEqual(['door_block', 'trapdoor_block']);
    // "block": no label has it; key matches rank common first, then by catalog order, the unsupported crop last
    expect(ids('block')).toEqual(['falling_block', 'door_block', 'trapdoor_block', 'crop_block']);
    // An alias match alone finds the entry
    expect(ids('durab')).toEqual(['Components.max_damage']);
  });

  it('puts description matches after label matches', () => {
    // A label match beats a description match that comes earlier in the catalog
    const items = [item('a', { label: 'Snack', description: 'Some food' }), item('b', { label: 'Food' })];
    expect(searchCatalog(items, 'food').map((m) => m.item.id)).toEqual(['b', 'a']);
    // Several description matches keep the catalog order (common first)
    expect(ids('like')).toEqual(['falling_block', 'trapdoor_block', 'crop_block']);
  });

  it('sorts entries the project version does not have last', () => {
    // Crop matches by label, but is unsupported; Door matches only in its description
    const items = [item('crop', { label: 'Grow crop', unsupported: true }), item('door', { label: 'Door', description: 'grow' })];
    expect(searchCatalog(items, 'grow').map((m) => m.item.id)).toEqual(['door', 'crop']);
  });

  it('prefers common entries on a tie and otherwise keeps the catalog order', () => {
    const items = [item('a', { label: 'Speed' }), item('b', { label: 'Speed', common: true }), item('c', { label: 'Speed' })];
    expect(searchCatalog(items, 'speed').map((m) => m.item.id)).toEqual(['b', 'a', 'c']);
    expect(searchCatalog(items, '').map((m) => m.item.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('highlighting', () => {
  it('marks the whole query, else each word, else fuzzy letters', () => {
    expect(highlightRanges('Max damage', 'damage')).toEqual([[4, 10]]);
    expect(highlightRanges('Components.max_damage', 'max damage')).toEqual([[11, 21]]);
    expect(highlightRanges('A two blocks high door', 'door high')).toEqual([
      [13, 17],
      [18, 22],
    ]);
    expect(highlightRanges('Falling', 'fllg', true)).toEqual([
      [0, 1],
      [2, 4],
      [6, 7],
    ]);
    expect(highlightRanges('Falling', 'fllg')).toEqual([]);
  });

  it('returns the ranges of label, key and description with a match', () => {
    const match = matchCatalogItem(ITEMS[3], 'damage');
    expect(match?.ranges.label).toEqual([[4, 10]]);
    expect(match?.ranges.key).toEqual([[15, 21]]);
  });
});

describe('facets and groups', () => {
  const categories = [
    { id: 'physics', label: 'Physics' },
    { id: 'shapes', label: 'Shapes' },
    { id: 'unused', label: 'Unused' },
  ];

  it('orders categories as listed, then unlisted ones, then Other, leaving out empty ones', () => {
    expect(orderedCategories(ITEMS, categories).map((c) => c.id)).toEqual(['physics', 'shapes', 'combat', 'plants', 'other']);
  });

  it('counts the entries of each facet for the query', () => {
    const added = ITEMS.map((i) => (i.id === 'door_block' ? { ...i, added: true } : i));
    const facets = catalogFacets(added, categories, '');
    expect(facets.map((f) => [f.id, f.count])).toEqual([
      ['all', 6],
      ['common', 2],
      ['physics', 1],
      ['shapes', 2],
      ['combat', 1],
      ['plants', 1],
      ['other', 1],
      ['added', 1],
    ]);
    expect(catalogFacets(added, categories, 'door').find((f) => f.id === 'shapes')?.count).toBe(2);
    expect(catalogFacets(added, categories, 'door').find((f) => f.id === 'physics')?.count).toBe(0);
  });

  it('groups by category without a query and lists ranked results with one', () => {
    const groups = catalogGroups(ITEMS, categories, '', 'all');
    expect(groups.map((g) => g.category)).toEqual(['physics', 'shapes', 'combat', 'plants', 'other']);
    expect(catalogGroups(ITEMS, categories, 'door', 'all')).toEqual([{ category: null, matches: expect.any(Array) }]);
    expect(catalogGroups(ITEMS, categories, '', 'common')[0].matches.map((m) => m.item.id)).toEqual(['falling_block', 'Components.food']);
    expect(catalogGroups(ITEMS, categories, 'zzz', 'all')).toEqual([]);
  });

  it('shows one flat list when the catalog has no categories', () => {
    const flat = [item('a'), item('b')];
    expect(catalogFacets(flat, [], '').map((f) => f.id)).toEqual(['all']);
    expect(catalogGroups(flat, [], '', 'all')).toHaveLength(1);
  });
});

describe('moving between cards', () => {
  // Two columns of 100 px, three rows: 0 1 / 2 3 / 4
  const rect = (col: number, row: number) => ({ left: col * 110, top: row * 60, width: 100, height: 50 });
  const grid = [rect(0, 0), rect(1, 0), rect(0, 1), rect(1, 1), rect(0, 2)];

  it('moves left and right through the list and stops at the ends', () => {
    expect(moveInGrid(grid, 1, 'ArrowRight')).toBe(2);
    expect(moveInGrid(grid, 0, 'ArrowLeft')).toBe(0);
    expect(moveInGrid(grid, 4, 'ArrowRight')).toBe(4);
  });

  it('moves up and down to the nearest card of the next row', () => {
    expect(moveInGrid(grid, 1, 'ArrowDown')).toBe(3);
    expect(moveInGrid(grid, 3, 'ArrowDown')).toBe(4);
    expect(moveInGrid(grid, 4, 'ArrowUp')).toBe(2);
    expect(moveInGrid(grid, 0, 'ArrowUp')).toBe(0);
  });

  it('steps through the list without a layout and starts at the first card', () => {
    const empty = grid.map(() => ({ left: 0, top: 0, width: 0, height: 0 }));
    expect(moveInGrid(empty, 1, 'ArrowDown')).toBe(2);
    expect(moveInGrid(grid, -1, 'ArrowDown')).toBe(0);
    expect(moveInGrid([], 0, 'ArrowDown')).toBe(-1);
  });
});
