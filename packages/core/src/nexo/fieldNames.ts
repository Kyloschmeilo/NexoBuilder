/** English display names of YAML keys – shown as field titles as they appear in the Nexo docs (not translated). */

const ACRONYMS: Record<string, string> = { id: 'ID', gui: 'GUI', uuid: 'UUID', xp: 'XP', ui: 'UI', nbt: 'NBT' };

/** max_stack_size → Max Stack Size, layer1 → Layer 1 */
export function englishName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([a-zA-Z])(\d)/g, '$1_$2')
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Name of a field as it appears in the Nexo docs.
 * Falls back to `label` (a `schema` message key) only for fields without name and key.
 */
export function fieldName(field: { key: string; label: string; name?: string }): string {
  if (field.name) return field.name;
  if (field.key && field.key !== '*') return englishName(field.key);
  return field.label;
}
