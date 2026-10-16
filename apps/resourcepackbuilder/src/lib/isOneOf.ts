/** Whether `value` is one of `list` – narrows untyped input (select values, tab ids) to the list's union type. */
export function isOneOf<T extends string | number>(list: readonly T[], value: unknown): value is T {
  return list.some((entry) => entry === value);
}
