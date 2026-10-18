/**
 * The model tab of the item editor's tab layout: the Model and Textures sections, the furniture and block models, the
 * model-related property groups and CraftEngine's block and furniture sections. The section layout of the item
 * editor mounts `ModelSection` and `TexturesSection` (see `./index.ts`) and the block and furniture sections directly.
 */
import type { Item } from '@resourcepackbuilder/core/project';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { useProjectForm } from '../properties/useProjectForm';
import { BlockModelsSection } from './BlockModelsSection';
import { CraftEngineBlockSection, hasBlockSettings } from './CraftEngineBlockSection';
import { CraftEngineFurnitureSection } from './CraftEngineFurnitureSection';
import { FurnitureModelsSection } from './FurnitureModelsSection';
import { ModelSection } from './ModelSection';
import { TexturesSection } from './TexturesSection';

const APPEARANCE_GROUP = 'appearance';
/** CraftEngine's item keys around the model (oversized_in_gui, item_model …) */
const MODEL_GROUP = 'model';

/**
 * The item's model with its textures, extra models (variants, furniture, block) and the appearance properties, if the
 * project's form has that group (Nexo does, CraftEngine does not). CraftEngine items get the Block and Furniture
 * sections instead, and the model group. Both targets get the item model tree.
 */
export function ModelTab({ item }: { item: Item }) {
  const groups = useProjectForm().groups;
  const hasAppearance = groups.some((group) => group.id === APPEARANCE_GROUP);
  const hasModelGroup = groups.some((group) => group.id === MODEL_GROUP);
  return (
    <div className="flex flex-col gap-3">
      <ModelSection item={item} />
      {item.model && <TexturesSection item={item} />}
      {item.model && <FurnitureModelsSection item={item} />}
      {item.model && <BlockModelsSection item={item} />}
      {hasModelGroup && <PropertiesPanel item={item} group={MODEL_GROUP} />}
      {hasBlockSettings(groups) && <CraftEngineBlockSection item={item} />}
      {hasBlockSettings(groups) && <CraftEngineFurnitureSection item={item} />}
      {hasAppearance && <PropertiesPanel item={item} group={APPEARANCE_GROUP} />}
    </div>
  );
}
