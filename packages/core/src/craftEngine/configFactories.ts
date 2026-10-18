/**
 * Config factories of a CraftEngine pack: a blueprint of config sections (items, recipes, …) with `${argument}`
 * placeholders, read once per instance with that instance's arguments (AbstractPackManager.ConfigFactoryParser). A
 * file holds one factory per section, `config_factory#<id>`, with its `blueprint` and `instances` (a list of
 * argument maps; an argument can be a typed template argument like `{ type: expression, … }`).
 *
 * The project keeps its factories as a list (`configFactories` of `Project.craftEngine`), each with its `id`,
 * `blueprint` and `instances`, both as YAML.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, resolveFields } from '../form/build';
import type { ObjectListField } from '../form/fields';
import type { ConfigObject, Project } from '../project/types';

/** Ids a config factory can have: they name the section `config_factory#<id>` */
export const CE_CONFIG_FACTORY_ID = /^[A-Za-z0-9_.-]+$/;

/** The project's config factories (an empty list for a project without any). */
export const projectConfigFactories = (project: Pick<Project, 'craftEngine'>): ConfigObject[] => project.craftEngine?.configFactories ?? [];

/** A new config factory: an item per instance */
export const newConfigFactory = (): ConfigObject => ({
  id: '',
  blueprint: { items: { '${__NAMESPACE__}:${color}_wool_block': { material: 'paper' } } },
  instances: [{ color: 'white' }],
});

const [factoryList] = resolveFields(
  {
    config_factories: field.objectList(
      {
        id: field.text({ placeholder: true, help: true }),
        blueprint: field.yaml({ help: true, placeholder: true }),
        instances: field.yaml({ help: true, placeholder: true }),
      },
      { titleKey: 'id', newItem: newConfigFactory },
    ),
  },
  'craftEngine',
);

/** The project's config factories as the editor edits them (messages at `craftEngine.fields.configFactories`). */
export const CE_CONFIG_FACTORY_LIST = factoryList as ObjectListField;

/** The id of a config factory ('' without one). */
export const configFactoryId = (entry: ConfigObject): string => (typeof entry.id === 'string' ? entry.id.trim() : '');

/** Whether a factory can be written: an id CraftEngine reads, a blueprint with sections and at least one instance. */
export function isWritableConfigFactory(entry: ConfigObject): boolean {
  return (
    CE_CONFIG_FACTORY_ID.test(configFactoryId(entry)) &&
    isPlainObject(entry.blueprint) &&
    Object.keys(entry.blueprint).length > 0 &&
    Array.isArray(entry.instances) &&
    entry.instances.some((instance) => isPlainObject(instance))
  );
}

/** The factory sections, `config_factory#<id>` → blueprint and instances (a later factory with a taken id is left out). */
export function craftEngineConfigFactories(project: Project): Record<string, ConfigObject> {
  const sections: Record<string, ConfigObject> = {};
  for (const entry of projectConfigFactories(project)) {
    if (!isWritableConfigFactory(entry)) continue;
    const key = `config_factory#${configFactoryId(entry)}`;
    if (key in sections) continue;
    const instances = (entry.instances as ConfigObject[]).filter((instance) => isPlainObject(instance));
    sections[key] = { blueprint: entry.blueprint as ConfigObject, instances };
  }
  return sections;
}
