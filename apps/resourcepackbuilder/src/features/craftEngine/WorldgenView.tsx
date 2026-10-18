/**
 * The worldgen features of a CraftEngine project: configured features (what a tree, ore or flower looks like, as
 * YAML) and placed features (where and how often one generates). Saplings grow configured features, grass blocks
 * placed features. The export writes both to configuration/worldgen.yml.
 */
import { Trees } from 'lucide-react';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { RegistryPage } from './RegistryPage';

export function WorldgenView() {
  return (
    <RegistryPage view="worldgen" icon={Trees} docs={CE_DOCS.worldgen} file={(project) => craftEngineConfigFile(project, 'worldgen')} />
  );
}
