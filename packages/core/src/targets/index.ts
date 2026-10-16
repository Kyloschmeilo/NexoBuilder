/**
 * Public API of @resourcepackbuilder/core/targets: picks the target-specific data for a project's pack target.
 * The only module of core that imports every target.
 */
import { CRAFT_ENGINE_FORM } from '../craftEngine/form/schema';
import type { FormSchema } from '../form/types';
import { NEXO_FORM } from '../nexo/form/schema';
import type { PackTargetId } from '../project/target';

const FORMS: Record<PackTargetId, FormSchema> = {
  nexo: NEXO_FORM,
  craftengine: CRAFT_ENGINE_FORM,
};

/** The item editor's form for a pack target. */
export function formFor(target: PackTargetId): FormSchema {
  return FORMS[target];
}
