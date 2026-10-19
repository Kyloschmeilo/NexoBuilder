/**
 * Public API of @resourcepackbuilder/core/targets: picks the target-specific data for a project's pack target.
 * The only module of core that imports every target.
 */
import { CRAFT_ENGINE_FORM } from '../craftEngine/form/schema';
import { CE_MEDIA_DOCS, CE_MEDIA_EXTRA_DOCS } from '../craftEngine/form/schema/docs';
import { craftEngineImageTag } from '../craftEngine/media';
import type { FormSchema } from '../form/types';
import { NEXO_FORM } from '../nexo/form/schema';
import { NEXO_DOCS, NEXO_MEDIA_DOCS } from '../nexo/form/schema/docs';
import { glyphTag, type Glyph } from '../project/media/glyph';
import type { MediaKind } from '../project/media/kinds';
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

/**
 * The plugin docs page of a media kind's page: Nexo's glyphs/sounds/paintings/dialogs, CraftEngine's
 * images/sounds/paintings. A kind only Nexo reads (dialogs) links to Nexo's page.
 */
export function mediaDocsFor(target: PackTargetId, kind: MediaKind): string {
  return (target === 'craftengine' ? CE_MEDIA_DOCS[kind] : undefined) ?? NEXO_MEDIA_DOCS[kind];
}

/** The plugin docs page of music discs (a sound's jukebox song). */
export function jukeboxDocsFor(target: PackTargetId): string {
  return target === 'craftengine' ? CE_MEDIA_EXTRA_DOCS.jukeboxSongs : NEXO_DOCS.musicDiscs;
}

/** The plugin docs section of a glyph's emoji options (CraftEngine's emoji page, Nexo's emoji list). */
export function emojiDocsFor(target: PackTargetId): string {
  return target === 'craftengine' ? CE_MEDIA_EXTRA_DOCS.emoji : NEXO_DOCS.glyphs.emojis;
}
