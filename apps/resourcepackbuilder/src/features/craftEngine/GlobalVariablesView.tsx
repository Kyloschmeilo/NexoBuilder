/**
 * The global variables of a CraftEngine project: MiniMessage texts by name, which CraftEngine puts in wherever a
 * text says `<global:name>`. The export writes them to configuration/global_variables.yml.
 */
import { Braces } from 'lucide-react';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { RegistryPage } from './RegistryPage';

export function GlobalVariablesView() {
  return (
    <RegistryPage
      view="globalVariables"
      icon={Braces}
      docs={CE_DOCS.globalVariables}
      file={(project) => craftEngineConfigFile(project, 'global_variables')}
    />
  );
}
