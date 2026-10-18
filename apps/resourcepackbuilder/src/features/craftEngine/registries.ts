/**
 * The CraftEngine registries of the Logic panel: one descriptor per view, built from its entry sources. A list entry
 * is added empty (or from the field's template); a map entry first asks for its name.
 */
import { useTranslations } from 'next-intl';
import type { Project } from '@resourcepackbuilder/core/project';
import { prompt } from '../../store/dialogs';
import { useProjectStore } from '../../store/project';
import type { Registry, RegistryAdd, RegistryTable } from '../../shell/sidebar/panels/registry';
import type { RegistryMapGroupId } from '../../shell/sidebar/panels/registryTexts';
import {
  CRAFT_ENGINE_SOURCES,
  type CraftEngineRegistryView,
  entryKey,
  type EntrySource,
  mapKeyProblem,
  newListEntry,
  newMapValue,
  sourceGroups,
} from './registrySources';

/** The open project (the panel and pages only render with one). */
function currentProject(): Project | null {
  return useProjectStore.getState().project;
}

/** Adds an entry to `source` and returns its key; a map entry asks for its name first (null when cancelled). */
export function useAddEntry(): (source: EntrySource) => Promise<string | null> {
  const t = useTranslations('media.registry');
  const tCommon = useTranslations('common');
  return async (source) => {
    const project = currentProject();
    if (!project) return null;
    if (source.kind === 'list') {
      const entries = source.read(project);
      source.write([...entries, newListEntry(source)]);
      return entryKey(source, entries.length);
    }
    const name = await prompt({
      title: t(`groups.${source.id as RegistryMapGroupId}.add`),
      label: t(`groups.${source.id as RegistryMapGroupId}.keyLabel`),
      initial: '',
      confirmLabel: tCommon('create'),
      validate: (value) => (mapKeyProblem(source.read(currentProject() ?? project), value) === 'taken' ? t('keyTaken') : null),
    });
    if (name === null) return null;
    const key = name.trim();
    // The project may have changed while the dialog was open
    const map = source.read(currentProject() ?? project);
    if (mapKeyProblem(map, key)) return null;
    source.write({ ...map, [key]: newMapValue(source) });
    return entryKey(source, key);
  };
}

function craftEngineRegistry(view: CraftEngineRegistryView): Registry {
  const sources = CRAFT_ENGINE_SOURCES[view];
  return {
    view,
    groups: (project) => sourceGroups(sources, project),
    useAdd(): RegistryAdd {
      const addEntry = useAddEntry();
      return {
        add: async (group) => {
          const source = sources.find((candidate) => candidate.id === group);
          return source ? addEntry(source) : null;
        },
      };
    },
  };
}

/** The registry of every CraftEngine view that lists entries. */
export const CRAFT_ENGINE_REGISTRIES: RegistryTable = Object.fromEntries(
  (Object.keys(CRAFT_ENGINE_SOURCES) as CraftEngineRegistryView[]).map((view) => [view, craftEngineRegistry(view)]),
);
