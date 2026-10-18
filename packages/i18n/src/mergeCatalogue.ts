/**
 * Assembles one message namespace from the JSON fragments that make up its catalogue (one file per property group
 * or logic catalog), typed as the intersection of the fragments so that the typed message keys match one big file.
 */

type MessageTree = { [key: string]: string | MessageTree };

/** The intersection of every member of a union. */
type UnionToIntersection<U> = (U extends unknown ? (member: U) => void : never) extends (member: infer I) => void ? I : never;

/** The type of `mergeCatalogue(...fragments)`: every fragment's keys, merged deeply. */
export type MergedCatalogue<T extends readonly object[]> = UnionToIntersection<T[number]>;

function isTree(value: unknown): value is MessageTree {
  return typeof value === 'object' && value !== null;
}

function mergeInto(target: MessageTree, source: MessageTree, path: string): void {
  for (const [key, value] of Object.entries(source)) {
    const here = path ? `${path}.${key}` : key;
    const existing = target[key];
    if (existing === undefined) {
      target[key] = isTree(value) ? structuredClone(value) : value;
    } else if (isTree(existing) && isTree(value)) {
      mergeInto(existing, value, here);
    } else {
      throw new Error(`Message key "${here}" is defined in more than one catalogue fragment`);
    }
  }
}

/**
 * Deep-merges catalogue fragments into one namespace. A key may live in exactly one fragment; defining it twice
 * (a leaf, or a leaf against an object) throws, so two groups can never silently overwrite each other's texts.
 *
 * @param fragments the parsed JSON files of one namespace and locale
 * @returns a new object holding all keys of all fragments
 */
export function mergeCatalogue<const T extends readonly object[]>(...fragments: T): MergedCatalogue<T> {
  const merged: MessageTree = {};
  for (const fragment of fragments) mergeInto(merged, fragment as MessageTree, '');
  return merged as MergedCatalogue<T>;
}
