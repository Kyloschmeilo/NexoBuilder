/**
 * pack.yml: the identity of the project's CraftEngine pack (resources/<pack>/pack.yml). CraftEngine reads its
 * `namespace`, `author`, `version`, `description`, `enable` and `subpacks` (folders of the pack loaded as packs of
 * their own when true; a key like `$$>=1.21.4` turns a group of them on by server version). The project sets the
 * author, version, enable and subpacks (`pack` of `Project.craftEngine`); namespace and description come from the
 * project itself.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, resolveFields } from '../form/build';
import type { ObjectField } from '../form/fields';
import type { ConfigObject, Project } from '../project/types';
import { toYaml, yamlHeader } from '../yaml';

/** Shown as the pack's author in CraftEngine unless the project sets one. */
export const CRAFT_ENGINE_PACK_AUTHOR = 'ResourcepackBuilder';
/** The pack's version unless the project sets one. */
export const CRAFT_ENGINE_PACK_VERSION = '1.0';

/** The project's pack.yml values ({} for a project without any). */
export const projectPack = (project: Pick<Project, 'craftEngine'>): ConfigObject => project.craftEngine?.pack ?? {};

const [packObject] = resolveFields(
  {
    pack: field.object({
      author: field.text({ placeholder: true }),
      version: field.text({ placeholder: true }),
      enable: field.boolean({ defaultHint: true, help: true }),
      subpacks: field.yaml({ help: true, placeholder: true }),
    }),
  },
  'craftEngine',
);

/** The project's pack.yml values as the editor edits them (messages at `craftEngine.fields.pack` of ceSchema). */
export const CE_PACK_FIELD = packObject as ObjectField;

/** A text value of the project's pack values, '' when unset. */
const text = (pack: ConfigObject, key: string): string => {
  const value = pack[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
};

/** The pack.yml of the project: its namespace is the default namespace of every config file in the pack. */
export function buildPackYml(project: Project): string {
  const values = projectPack(project);
  const pack: Record<string, unknown> = {
    namespace: project.namespace,
    author: text(values, 'author') || CRAFT_ENGINE_PACK_AUTHOR,
    version: text(values, 'version') || CRAFT_ENGINE_PACK_VERSION,
    description: project.settings.packDescription || project.name,
    enable: values.enable !== false,
  };
  if (isPlainObject(values.subpacks) && Object.keys(values.subpacks).length > 0) pack.subpacks = values.subpacks;
  return yamlHeader(`pack of project "${project.name}"`) + toYaml(pack);
}
