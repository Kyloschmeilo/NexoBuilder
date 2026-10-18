/**
 * The attribute system of a CraftEngine project (experimental): its custom attributes, operations, equipment sets and
 * damage rules, one group each. Items add modifiers and join sets in their settings. The export writes all of it to
 * configuration/attributes.yml; CraftEngine only reads it with `attribute.enable: true` in its config.yml.
 */
import { Dumbbell } from 'lucide-react';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { RegistryPage } from './RegistryPage';

export function AttributesView() {
  return (
    <RegistryPage
      view="attributes"
      icon={Dumbbell}
      docs={CE_DOCS.attributes}
      file={(project) => craftEngineConfigFile(project, 'attributes')}
    />
  );
}
