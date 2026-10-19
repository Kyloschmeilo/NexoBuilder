/**
 * Nexo's multipack feature (docs: configuration/resourcepack/multipack-feature): extra resource packs ("templates")
 * sent with the main pack, each required, on by default or toggled by the player, plus an optional menu to toggle
 * them. The project keeps the content of plugins/Nexo/multipack.yml 1:1 in `settings.multipack`; the template packs
 * themselves go to plugins/Nexo/pack/template_packs/<id> and are not part of the export.
 */
import { createIssue, isPlainObject, type Issue } from '@resourcepackbuilder/utils';
import { field, resolveFields, whenType } from '../form/build';
import type { ObjectField } from '../form/fields';
import { plainOptions } from '../form/options';
import { pruneValue } from '../form/prune';
import type { ConfigValue, Project } from '../project/types';
import { toYaml } from '../yaml/yaml';
import { NEXO_DOCS } from './form/schema/docs';

const DOCS = NEXO_DOCS.multipack;

/** The file Nexo reads, relative to plugins/Nexo. */
export const MULTIPACK_FILE = 'multipack.yml';

/** What clicking a menu slot does: toggle one template, or cycle through several (one of them on at a time). */
export const MULTIPACK_ACTION_TYPES = ['TOGGLE', 'CYCLING'] as const;

/** An item of the menu: `nexo_item`, `item_model` or an inline item (material, itemname, lore …), as YAML */
const menuItem = (only = {}) => field.yaml({ help: true, placeholder: true, ...only });

/** A template id of the project (with the project's templates as suggestions) */
const templateRef = (only = {}) => field.select([], { allowCustom: true, dynamicSuggestions: 'multipackTemplates', ...only });

const [multipackField] = resolveFields(
  {
    multipack: field.object(
      {
        templates: field.map(
          field.object({
            required: field.boolean({ defaultHint: false }),
            default: field.boolean({ defaultHint: false }),
            conflicts_with: field.stringList({ singleAsString: true, dynamicSuggestions: 'multipackTemplates', placeholder: true }),
            path: field.text({ placeholder: true, help: true }),
          }),
          { keyPlaceholder: true, newValue: () => ({ required: false, default: false }), docs: DOCS.templates },
        ),
        menu: field.object(
          {
            title: field.text({ format: 'minimessage', placeholder: true }),
            rows: field.number({ integer: true, min: 1, max: 6 }),
            slots: field.map(
              field.object({
                offset: field.text({ placeholder: true, help: true }),
                size: field.text({ placeholder: true }),
                all_slots_except_first_empty: field.boolean({ advanced: true }),
                base_item: menuItem(),
                action: field.object(
                  {
                    type: field.select(plainOptions(MULTIPACK_ACTION_TYPES)),
                    target: templateRef(whenType('TOGGLE')),
                    enabled_item: menuItem(whenType('TOGGLE')),
                    disabled_item: menuItem(whenType('TOGGLE')),
                    targets: field.choice(
                      {
                        ids: {
                          field: field.stringList({ dynamicSuggestions: 'multipackTemplates', placeholder: true }),
                          matches: (value) => Array.isArray(value) && value.every((entry) => typeof entry === 'string'),
                          newValue: () => [],
                        },
                        items: {
                          field: field.yaml({ placeholder: true }),
                          matches: (value) => Array.isArray(value),
                          newValue: () => [{ id: '' }],
                        },
                      },
                      whenType('CYCLING'),
                    ),
                  },
                  { docs: DOCS.actions },
                ),
              }),
              { keyPlaceholder: true, newValue: () => ({ offset: '1,1', action: { type: 'TOGGLE' } }), docs: DOCS.slots },
            ),
          },
          { docs: DOCS.menu },
        ),
      },
      { docs: DOCS.page },
    ),
  },
  'nexoMultipack',
);

/** The content of multipack.yml as the editor edits it (messages at `nexoMultipack.fields.multipack` of the schema namespace). */
export const NEXO_MULTIPACK_FIELD = multipackField as ObjectField;

/** The ids of the project's templates. */
export function multipackTemplateIds(project: Pick<Project, 'settings'>): string[] {
  const templates = project.settings.multipack?.templates;
  return isPlainObject(templates) ? Object.keys(templates) : [];
}

/** The text of multipack.yml; null when the project has neither templates nor a menu. */
export function multipackFile(project: Pick<Project, 'settings'>): string | null {
  const content = pruneValue(project.settings.multipack, NEXO_MULTIPACK_FIELD);
  return isPlainObject(content) ? toYaml(content) : null;
}

/** The template ids a template's `conflicts_with` (a single string or a list) or a slot action names. */
function namedTemplates(value: ConfigValue | undefined): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((entry) => {
    if (typeof entry === 'string') return [entry.trim()];
    if (isPlainObject(entry) && typeof entry.id === 'string') return [entry.id.trim()];
    return [];
  });
}

/**
 * Checks multipack.yml: every template a conflict or a menu slot names must exist (Nexo skips the rest), and a menu
 * slot's offset must lie inside the menu's rows.
 */
export function validateMultipack(project: Pick<Project, 'settings'>): Issue[] {
  const multipack = project.settings.multipack;
  if (!isPlainObject(multipack)) return [];
  const issues: Issue[] = [];
  const ids = new Set(multipackTemplateIds(project));
  const checkRefs = (refs: string[]) => {
    for (const ref of refs) {
      if (ref && !ids.has(ref)) issues.push(createIssue('warning', 'multipack.unknownTemplate', { template: ref }));
    }
  };
  if (isPlainObject(multipack.templates)) {
    for (const template of Object.values(multipack.templates)) {
      if (isPlainObject(template)) checkRefs(namedTemplates(template.conflicts_with));
    }
  }
  const menu = isPlainObject(multipack.menu) ? multipack.menu : null;
  const slots = menu && isPlainObject(menu.slots) ? menu.slots : {};
  const rows = typeof menu?.rows === 'number' ? menu.rows : 3;
  for (const [slot, config] of Object.entries(slots)) {
    if (!isPlainObject(config)) continue;
    const action = isPlainObject(config.action) ? config.action : {};
    checkRefs(namedTemplates(action.type === 'CYCLING' ? action.targets : action.target));
    const offset = typeof config.offset === 'string' ? /^\s*(\d+)\s*,\s*(\d+)\s*$/.exec(config.offset) : null;
    if (offset && (Number(offset[1]) < 1 || Number(offset[1]) > 9 || Number(offset[2]) < 1 || Number(offset[2]) > rows)) {
      issues.push(createIssue('warning', 'multipack.slotOutside', { slot, rows }));
    }
  }
  return issues;
}
