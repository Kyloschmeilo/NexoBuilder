/**
 * Going to a section of the item editor from its nav: the section is stored in the ui store, and once it has rendered
 * the page scrolls to the picked part. A feature group lands on its panel, also when it is picked from another section
 * or picked again; any other section starts at the top of the editor.
 */
import { setEditorSection } from '../../store/ui';

/** The element at the top of the item editor (the scroll target of a plain section switch). */
export const EDITOR_TOP_ATTRIBUTE = 'data-item-editor-top';

/** Prefix of the nav ids of the feature groups, as in `sections.ts`. */
const GROUP_PREFIX = 'features/';

/** The selector of the element a nav id scrolls to. */
export function navScrollTarget(navId: string): string {
  return navId.startsWith(GROUP_PREFIX)
    ? `[data-section-id="group-${CSS.escape(navId.slice(GROUP_PREFIX.length))}"]`
    : `[${EDITOR_TOP_ATTRIBUTE}]`;
}

/** Shows the section of `navId` and, after it has rendered, scrolls to it. */
export function goToSection(navId: string): void {
  setEditorSection(navId);
  // Two frames: the first lets React render the section, the second its panels
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.querySelector(navScrollTarget(navId))?.scrollIntoView({ block: 'start' })),
  );
}
