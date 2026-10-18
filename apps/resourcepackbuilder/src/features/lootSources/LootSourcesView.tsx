/**
 * The loot sources of a CraftEngine project: each binds a loot table to a vanilla loot event (breaking a block, killing
 * an entity, fishing …), edited by its loot source type. The export writes them to configuration/loot_sources.yml.
 */
import { Gem } from 'lucide-react';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { RegistryPage } from '../craftEngine/RegistryPage';

export function LootSourcesView() {
  return (
    <RegistryPage
      view="lootSources"
      icon={Gem}
      docs={CE_DOCS.lootSources}
      file={(project) => craftEngineConfigFile(project, 'loot_sources')}
    />
  );
}
