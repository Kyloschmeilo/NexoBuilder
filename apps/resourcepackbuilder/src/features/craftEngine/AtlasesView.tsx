/**
 * The texture atlases of a CraftEngine project: which textures go into a vanilla or custom atlas as sprites. Most
 * packs need none. The export writes them to configuration/atlases.yml.
 */
import { Images } from 'lucide-react';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { RegistryPage } from './RegistryPage';

export function AtlasesView() {
  return <RegistryPage view="atlases" icon={Images} docs={CE_DOCS.atlases} file={(project) => craftEngineConfigFile(project, 'atlases')} />;
}
