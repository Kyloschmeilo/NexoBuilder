/**
 * Public API of @resourcepackbuilder/core/targets: picks the target-specific data for a project's pack target.
 * The only module of core that imports every target.
 */
import type { FormSchema } from '../form/types';
import { NEXO_FORM } from '../nexo/form/schema';
import type { PackTargetId } from '../project/target';

/** CraftEngine uses the Nexo form until it gets its own schema (task 7 of the CraftEngine plan). */
const FORMS: Record<PackTargetId, FormSchema> = {
  nexo: NEXO_FORM,
  craftengine: NEXO_FORM,
};

/** The item editor's form for a pack target. */
export function formFor(target: PackTargetId): FormSchema {
  return FORMS[target];
}
