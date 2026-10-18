/**
 * Public API of @resourcepackbuilder/core/targets: picks the target-specific data for a project's pack target.
 * The only module of core that imports every target.
 */
import { CRAFT_ENGINE_FORM } from '../craftEngine/form/schema';
import { craftEngineImageTag } from '../craftEngine/media';
import type { FormSchema } from '../form/types';
import { NEXO_FORM } from '../nexo/form/schema';
import { glyphTag, type Glyph } from '../project/media/glyph';
import type { PackTargetId } from '../project/target';
import type { Project } from '../project/types';

export * from './recipes';

const FORMS: Record<PackTargetId, FormSchema> = {
  nexo: NEXO_FORM,
  craftengine: CRAFT_ENGINE_FORM,
};

/** The item editor's form for a pack target. */
export function formFor(target: PackTargetId): FormSchema {
  return FORMS[target];
}

/** The tag that shows the glyph in text: Nexo `<glyph:id>`, CraftEngine `<image:namespace:id>`. */
export function glyphTagFor(project: Pick<Project, 'namespace' | 'target'>, glyph: Glyph): string {
  return project.target === 'craftengine' ? craftEngineImageTag(project, glyph) : glyphTag(glyph);
}
