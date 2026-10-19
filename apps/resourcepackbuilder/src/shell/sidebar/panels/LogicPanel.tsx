/** The Logic and data activity's panel (CraftEngine): loot sources, templates and the other project registries with their entries. */
import { CRAFT_ENGINE_REGISTRIES } from '../../../features/craftEngine/registries';
import { CRAFT_ENGINE_VIEWS } from '../ViewEntries';
import { RegistryPanel } from './RegistryPanel';

export function LogicPanel() {
  return <RegistryPanel activity="logic" views={CRAFT_ENGINE_VIEWS} registries={CRAFT_ENGINE_REGISTRIES} />;
}
