/** Generated IDs. */

/** Random internal ID, e.g. uid('i_') → "i_3f9a0c1b2d4e" */
export function uid(prefix = ''): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix + random;
}

/** `base` if it is free, otherwise the first free `base_2`, `base_3` … */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
