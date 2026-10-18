/**
 * Search, facets and ordering of a catalog. A query matches an entry's label, YAML key, aliases and description, with
 * fuzzy matching on the label and key. Results rank by where they match (label, then key, then alias, then
 * description, then several words spread over the fields, then fuzzy), entries the project's version does not have
 * come last, and ties keep the catalog order with common entries first. Every function here is pure.
 */
import type { CatalogCategory, CatalogItem } from './types';

/** A half-open range `[start, end)` of characters to highlight. */
export type MatchRange = readonly [start: number, end: number];

/** The highlight ranges of an entry's visible texts. */
export interface MatchRanges {
  label: MatchRange[];
  key: MatchRange[];
  description: MatchRange[];
}

/** An entry with how well it matches the query (lower tier and score rank higher). */
export interface CatalogMatch {
  item: CatalogItem;
  /** Position in the catalog, the last tie breaker. */
  index: number;
  /** 0 label, 1 key, 2 alias, 3 description, 4 words across fields, 5 fuzzy; 0 without a query. */
  tier: number;
  /** Within a tier: 0 exact, 1 prefix, 2 word start, 3 anywhere (fuzzy: the gaps between the letters). */
  score: number;
  ranges: MatchRanges;
}

/** The facets every catalog has besides its categories. */
export const FACET_ALL = 'all';
export const FACET_COMMON = 'common';
export const FACET_ADDED = 'added';
/** The category of entries without one. */
export const CATEGORY_OTHER = 'other';

/** A facet of the catalog sidebar with the number of entries it holds for the current query. */
export interface CatalogFacet {
  id: string;
  /** The category's name; empty for the fixed facets, which the dialog names. */
  label: string;
  count: number;
}

/** A titled run of results; `category` is null for the flat list of a search or a single facet. */
export interface CatalogGroup {
  category: string | null;
  matches: CatalogMatch[];
}

const NO_RANGES: MatchRanges = { label: [], key: [], description: [] };

/** Lower case, with `_ - . : /` read as spaces (one character each, so positions stay valid for highlighting). */
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[_\-.:/]/g, ' ');
}

/** The words of a query, normalised. */
function queryWords(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

/** How a normalised text contains a normalised needle: 0 exact, 1 prefix, 2 at a word start, 3 anywhere, null not. */
function substringScore(text: string, needle: string): number | null {
  if (!needle) return null;
  if (text === needle) return 0;
  if (text.startsWith(needle)) return 1;
  let at = text.indexOf(needle);
  if (at < 0) return null;
  let best = 3;
  while (at >= 0) {
    if (at === 0 || text[at - 1] === ' ') {
      best = 2;
      break;
    }
    at = text.indexOf(needle, at + 1);
  }
  return best;
}

/**
 * The positions of the needle's characters in order in the text, preferring the earliest start, or null. Matches
 * whose letters spread over more than three times the needle's length are too loose to count.
 */
export function fuzzyPositions(text: string, needle: string): number[] | null {
  const letters = needle.replace(/\s+/g, '');
  if (letters.length < 2) return null;
  let best: number[] | null = null;
  for (let start = text.indexOf(letters[0]); start >= 0; start = text.indexOf(letters[0], start + 1)) {
    const positions = [start];
    let at = start;
    for (let i = 1; i < letters.length && at >= 0; i++) {
      at = text.indexOf(letters[i], at + 1);
      if (at >= 0) positions.push(at);
    }
    if (positions.length !== letters.length) break;
    const span = positions[positions.length - 1] - start + 1;
    if (span <= letters.length * 3 && (!best || span < best[best.length - 1] - best[0] + 1)) best = positions;
  }
  return best;
}

/** Merges overlapping or touching ranges and sorts them. */
function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/**
 * What to highlight in a text for a query: the whole query where it occurs, else each word where it occurs, else
 * (with `fuzzy`) the letters of a fuzzy match.
 */
export function highlightRanges(text: string, query: string, fuzzy = false): MatchRange[] {
  const normal = normalizeSearchText(text);
  const words = queryWords(query);
  if (!words.length) return [];
  const whole = words.join(' ');
  const at = normal.indexOf(whole);
  if (at >= 0) return [[at, at + whole.length]];
  const wordRanges = words.flatMap((word): MatchRange[] => {
    const i = normal.indexOf(word);
    return i >= 0 ? [[i, i + word.length]] : [];
  });
  if (wordRanges.length) return mergeRanges(wordRanges);
  if (!fuzzy) return [];
  return mergeRanges((fuzzyPositions(normal, whole) ?? []).map((i): MatchRange => [i, i + 1]));
}

/** How an entry matches a query, or null when it does not. Without a query every entry matches at tier 0. */
export function matchCatalogItem(item: CatalogItem, query: string, index = 0): CatalogMatch | null {
  const words = queryWords(query);
  if (!words.length) return { item, index, tier: 0, score: 0, ranges: NO_RANGES };
  const whole = words.join(' ');
  const label = normalizeSearchText(item.label);
  const keys = [item.yamlKey, item.id].map(normalizeSearchText);
  const aliases = (item.aliases ?? []).map(normalizeSearchText);
  const description = normalizeSearchText(item.description ?? '');

  const best = (texts: string[]) =>
    texts.reduce<number | null>((acc, text) => {
      const score = substringScore(text, whole);
      return score === null ? acc : acc === null ? score : Math.min(acc, score);
    }, null);

  const ranges = (fuzzy: boolean): MatchRanges => ({
    label: highlightRanges(item.label, query, fuzzy),
    key: highlightRanges(item.yamlKey, query, fuzzy),
    description: highlightRanges(item.description ?? '', query),
  });

  const tiers: Array<number | null> = [best([label]), best(keys), best(aliases), best([description])];
  const tier = tiers.findIndex((score) => score !== null);
  if (tier >= 0) return { item, index, tier, score: tiers[tier] ?? 0, ranges: ranges(false) };

  const haystack = [label, ...keys, ...aliases, description].join(' ');
  if (words.length > 1 && words.every((word) => haystack.includes(word))) {
    return { item, index, tier: 4, score: 0, ranges: ranges(false) };
  }

  const fuzzy = [label, ...keys]
    .map((text) => fuzzyPositions(text, whole))
    .filter((positions): positions is number[] => positions !== null)
    .map((positions) => positions[positions.length - 1] - positions[0] + 1 - positions.length);
  if (fuzzy.length) return { item, index, tier: 5, score: Math.min(...fuzzy), ranges: ranges(true) };
  return null;
}

/** Ranking: entries the project's version has first, then by tier and score, then common ones, then catalog order. */
export function compareMatches(a: CatalogMatch, b: CatalogMatch): number {
  return (
    Number(!!a.item.unsupported) - Number(!!b.item.unsupported) ||
    a.tier - b.tier ||
    a.score - b.score ||
    Number(!!b.item.common) - Number(!!a.item.common) ||
    a.index - b.index
  );
}

/** The entries matching a query, best first. */
export function searchCatalog(items: readonly CatalogItem[], query: string): CatalogMatch[] {
  return items
    .map((item, index) => matchCatalogItem(item, query, index))
    .filter((match): match is CatalogMatch => match !== null)
    .sort(compareMatches);
}

/** The category id of an entry, "other" when it has none. */
export const categoryOf = (item: CatalogItem): string => item.category ?? CATEGORY_OTHER;

/** Whether an entry belongs to a facet. */
export function inFacet(item: CatalogItem, facet: string): boolean {
  if (facet === FACET_ALL) return true;
  if (facet === FACET_COMMON) return !!item.common;
  if (facet === FACET_ADDED) return !!item.added;
  return categoryOf(item) === facet;
}

/**
 * The categories in display order: those `categories` lists first (in its order), then the ones only entries name (in
 * the order they first appear), then "other". Only categories with entries are returned.
 */
export function orderedCategories(items: readonly CatalogItem[], categories: readonly CatalogCategory[]): CatalogCategory[] {
  const used = new Set(items.map(categoryOf));
  const listed = categories.filter((category) => used.has(category.id) && category.id !== CATEGORY_OTHER);
  const known = new Set(listed.map((category) => category.id));
  const extra = [...used].filter((id) => !known.has(id) && id !== CATEGORY_OTHER).map((id) => ({ id, label: id }));
  const other = used.has(CATEGORY_OTHER)
    ? [categories.find((category) => category.id === CATEGORY_OTHER) ?? { id: CATEGORY_OTHER, label: '' }]
    : [];
  return [...listed, ...extra, ...other];
}

/**
 * The facets of the sidebar with their counts for the query: All, Common (when any entry is common), the categories,
 * and Added (when any entry is added). With one category only, the category facets are left out.
 */
export function catalogFacets(items: readonly CatalogItem[], categories: readonly CatalogCategory[], query: string): CatalogFacet[] {
  const matching = searchCatalog(items, query).map((match) => match.item);
  const count = (facet: string) => matching.filter((item) => inFacet(item, facet)).length;
  const ordered = orderedCategories(items, categories);
  const facets: CatalogFacet[] = [{ id: FACET_ALL, label: '', count: matching.length }];
  if (items.some((item) => item.common)) facets.push({ id: FACET_COMMON, label: '', count: count(FACET_COMMON) });
  if (ordered.length > 1) facets.push(...ordered.map((category) => ({ ...category, count: count(category.id) })));
  if (items.some((item) => item.added)) facets.push({ id: FACET_ADDED, label: '', count: count(FACET_ADDED) });
  return facets;
}

/**
 * The results to show: with a query, or for any facet but All, one ranked list; without a query on All, one group per
 * category (in category order, each with common entries first).
 */
export function catalogGroups(
  items: readonly CatalogItem[],
  categories: readonly CatalogCategory[],
  query: string,
  facet: string,
): CatalogGroup[] {
  const matches = searchCatalog(items, query).filter((match) => inFacet(match.item, facet));
  if (queryWords(query).length || facet !== FACET_ALL) return matches.length ? [{ category: null, matches }] : [];
  const ordered = orderedCategories(items, categories);
  if (ordered.length < 2) return matches.length ? [{ category: null, matches }] : [];
  return ordered
    .map((category) => ({ category: category.id, matches: matches.filter((match) => categoryOf(match.item) === category.id) }))
    .filter((group) => group.matches.length > 0);
}

/** A card's box, for moving between cards with the arrow keys. */
export interface CardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The card an arrow key moves to from `current`, by the cards' boxes: left and right go to the previous and next card,
 * up and down to the nearest card (by horizontal centre) in the row above or below. Without layout (all boxes empty,
 * as in tests) up and down step through the list like left and right. Returns `current` at the edges.
 */
export function moveInGrid(rects: readonly CardRect[], current: number, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): number {
  const count = rects.length;
  if (!count) return -1;
  if (current < 0 || current >= count) return 0;
  const step = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  const clamp = (i: number) => Math.min(count - 1, Math.max(0, i));
  const laidOut = rects.some((rect) => rect.width > 0 || rect.height > 0);
  if (key === 'ArrowLeft' || key === 'ArrowRight' || !laidOut) return clamp(current + step);
  const from = rects[current];
  const centre = (rect: CardRect) => rect.left + rect.width / 2;
  const rowTop = (rect: CardRect) => Math.round(rect.top);
  const candidates = rects
    .map((rect, index) => ({ rect, index }))
    .filter(({ rect }) => (step > 0 ? rowTop(rect) > rowTop(from) : rowTop(rect) < rowTop(from)));
  if (!candidates.length) return current;
  const rowOf =
    step > 0 ? Math.min(...candidates.map(({ rect }) => rowTop(rect))) : Math.max(...candidates.map(({ rect }) => rowTop(rect)));
  const row = candidates.filter(({ rect }) => rowTop(rect) === rowOf);
  return row.reduce((best, next) => (Math.abs(centre(next.rect) - centre(from)) < Math.abs(centre(best.rect) - centre(from)) ? next : best))
    .index;
}
