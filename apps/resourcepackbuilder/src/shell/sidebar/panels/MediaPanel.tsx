/** The Media activity's panel: the glyphs, sounds and paintings (and every later media kind) with their entries. */
import { MEDIA_REGISTRIES } from '../../../features/media/mediaKinds';
import { RESOURCES } from '../ViewEntries';
import { RegistryPanel } from './RegistryPanel';

export function MediaPanel() {
  return <RegistryPanel activity="media" views={RESOURCES} registries={MEDIA_REGISTRIES} />;
}
