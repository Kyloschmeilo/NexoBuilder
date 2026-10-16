/** pack.yml: the identity of the project's CraftEngine pack (resources/<pack>/pack.yml). */
import type { Project } from '../project/types';
import { toYaml, yamlHeader } from '../yaml';

/** Shown as the pack's author in CraftEngine. */
export const CRAFT_ENGINE_PACK_AUTHOR = 'ResourcepackBuilder';
/** The pack's version; projects have none of their own. */
export const CRAFT_ENGINE_PACK_VERSION = '1.0';

/** The pack.yml of the project: its namespace is the default namespace of every config file in the pack. */
export function buildPackYml(project: Project): string {
  const pack = {
    namespace: project.namespace,
    author: CRAFT_ENGINE_PACK_AUTHOR,
    version: CRAFT_ENGINE_PACK_VERSION,
    description: project.settings.packDescription || project.name,
    enable: true,
  };
  return yamlHeader(`pack of project "${project.name}"`) + toYaml(pack);
}
