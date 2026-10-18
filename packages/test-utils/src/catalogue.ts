/**
 * Test helper: reads a message namespace of the i18n package from disk (Node only), merging the per-group JSON
 * files of a split namespace (`messages/<locale>/<namespace>/*.json`) or reading its single file. Tests use it to
 * check message keys without a dependency on the i18n package.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';

/** A parsed message catalogue: strings nested in objects. */
export type MessageTree = { [key: string]: string | MessageTree };

const MESSAGES_DIR = new URL('../../i18n/src/messages/', import.meta.url);
const cache = new Map<string, MessageTree>();

function readJson(url: URL): MessageTree {
  return JSON.parse(readFileSync(url, 'utf8')) as MessageTree;
}

function mergeInto(target: MessageTree, source: MessageTree, path: string): void {
  for (const [key, value] of Object.entries(source)) {
    const here = path ? `${path}.${key}` : key;
    const existing = target[key];
    if (existing === undefined) target[key] = value;
    else if (typeof existing === 'object' && typeof value === 'object') mergeInto(existing, value, here);
    else throw new Error(`Message key "${here}" is defined in more than one file`);
  }
}

/**
 * Loads one namespace of one locale. A split namespace is a directory of JSON fragments that are merged deeply; a
 * key defined twice throws. Each namespace is read once and the result is shared, so callers must not modify it.
 *
 * @param locale the catalogue language
 * @param namespace the namespace, such as `ceSchema` or `schema`
 * @returns the merged message tree
 */
export function loadCatalogue(locale: 'en' | 'de', namespace: string): MessageTree {
  const cacheKey = `${locale}/${namespace}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const dir = new URL(`${locale}/${namespace}/`, MESSAGES_DIR);
  const catalogue: MessageTree = {};
  if (existsSync(dir)) {
    for (const file of readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort()) {
      mergeInto(catalogue, readJson(new URL(file, dir)), '');
    }
  } else {
    mergeInto(catalogue, readJson(new URL(`${locale}/${namespace}.json`, MESSAGES_DIR)), '');
  }
  cache.set(cacheKey, catalogue);
  return catalogue;
}
