/** The Media activity's panel: the media lists the project's target has (glyphs, sounds, paintings; Nexo dialogs and multipack) with their entries. */
import { MEDIA_REGISTRIES } from '../../../features/media/mediaKinds';
import { useOpenProject } from '../../../store/project';
import { isOffered, RESOURCES } from '../ViewEntries';
import { RegistryPanel } from './RegistryPanel';

export function MediaPanel() {
  const { target } = useOpenProject();
  return <RegistryPanel activity="media" views={RESOURCES.filter((entry) => isOffered(entry, target))} registries={MEDIA_REGISTRIES} />;
}
