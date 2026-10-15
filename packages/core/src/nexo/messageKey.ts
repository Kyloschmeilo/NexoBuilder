/**
 * Message keys in the `schema` namespace are built from identifiers: each key segment is the camelCase
 * form of a property id, YAML key or option value.
 */

/** `Components.max_stack_size` → `componentsMaxStackSize`, `CLICK:right:all` → `clickRightAll`, `ItemFlags` → `itemFlags` */
export function keySegment(id: string): string {
  return id
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word, index) => {
      const normalized = word === word.toUpperCase() ? word.toLowerCase() : word;
      const first = index === 0 ? normalized.charAt(0).toLowerCase() : normalized.charAt(0).toUpperCase();
      return first + normalized.slice(1);
    })
    .join('');
}
