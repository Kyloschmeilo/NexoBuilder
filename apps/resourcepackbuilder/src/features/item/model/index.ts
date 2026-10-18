/**
 * The model sections of the item editor, for `features/item/sections.ts`: `ModelSection` (the model, its special
 * appearance and the item model tree) and `TexturesSection` (the texture tiles). Both take `{ item, id? }` and render
 * their own panels with `data-section-id` set to `id` (`model` and `textures` by default). The parts are exported too,
 * for a layout that gives them nav entries of their own.
 */
export { ItemModelTreeSection } from './itemModelTree';
export { ModelSection } from './ModelSection';
export { TexturesSection } from './TexturesSection';
export { VariantsSection } from './VariantsSection';
