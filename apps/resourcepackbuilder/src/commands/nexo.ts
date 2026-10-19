/** The project-wide Nexo data kept in the settings: the Carpentry addon switch and the content of multipack.yml. */
import { toConfigValue } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { mutate } from '../store/project';

/** Says whether the server has the Carpentry addon; off removes the key, so other projects keep their shape. */
export function setCarpentryAddon(installed: boolean): void {
  mutate((draft) => {
    if (installed) draft.settings.carpentryAddon = true;
    else delete draft.settings.carpentryAddon;
  }, 'settings');
}

/** Replaces the content of multipack.yml; an empty one removes the key. */
export function setMultipack(value: unknown): void {
  const config = toConfigValue(value);
  mutate((draft) => {
    if (isPlainObject(config) && Object.keys(config).length > 0) draft.settings.multipack = config;
    else delete draft.settings.multipack;
  }, 'multipack');
}
