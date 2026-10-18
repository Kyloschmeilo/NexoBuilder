/**
 * The Block section of the item editor and its parts. `sections.ts` mounts `BlockSection` for both targets; the
 * panels it renders carry the anchors below, so the section nav can list them under Block. `itemPlaces` tells what
 * the item places (the Furniture section shows only for furniture), and the Nexo mechanics the section edits itself
 * are named so the Features section can leave them out.
 */
export { BLOCK_BEHAVIORS_SECTION_ID, BehaviorsSection } from './BehaviorsSection';
export { BLOCK_MODELS_SECTION_ID, BlockModelsSection } from './BlockModelsSection';
export { BLOCK_SECTION_ID, BLOCK_SETTINGS_SECTION_ID, BlockSection, hasBlockSettings, itemPlaces, PlacesControl } from './BlockSection';
export { BLOCK_STATES_SECTION_ID, StatesSection } from './StatesSection';
export { NEXO_BLOCK_FEATURES_SECTION_ID } from './NexoBlock';
export { type ItemPlaces, NEXO_BLOCK_PROPERTY, NEXO_FURNITURE_PROPERTY } from '../../../commands/items';
