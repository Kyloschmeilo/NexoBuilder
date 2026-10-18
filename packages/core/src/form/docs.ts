/** Links from form properties to the documentation of the target's plugin, shared by every target's form. */
import type { PropertySpec } from './build';

/**
 * Links every property of a group to a documentation page. A property's own `docs` wins, so a group can point at
 * one page and single properties at their own section of it.
 */
export const withDocs = (docs: string, specs: Record<string, PropertySpec>): Record<string, PropertySpec> =>
  Object.fromEntries(Object.entries(specs).map(([id, spec]) => [id, { docs, ...spec }]));
