/**
 * CraftEngine templates and global variables.
 *
 * A template is a piece of config with `${argument}` placeholders (templateArgs.ts). CraftEngine reads them from
 * `template(s)` (TemplateManagerImpl), each under its id, and a map uses one with `template:` (an id or a list),
 * `arguments:` and optionally `overrides:` (replace keys) and `merges:` (deep-merged); other keys of that map are
 * merged over the template too. The project keeps its own templates as a list (`templates` of `Project.craftEngine`):
 * each entry has its `id`, its declared `arguments` (a name and an optional default) and its `body`; the export
 * writes them to configuration/templates.yml with the defaults filled into the placeholders. The default templates
 * pack of the jar (`default:*`) is listed in defaultTemplates.ts.
 *
 * Global variables are MiniMessage snippets CraftEngine reads from `global_variable(s)` (GlobalVariableManager),
 * each under its name, and puts in where a text says `<global:name>`. The project keeps them as a map
 * (`globalVariables`), the export writes configuration/global_variables.yml.
 */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, resolveFields } from '../form/build';
import type { MapField, ObjectListField } from '../form/fields';
import { type Option, plainOptions } from '../form/options';
import type { ConfigObject, ConfigValue, Project } from '../project/types';
import { CE_DEFAULT_TEMPLATES } from './defaultTemplates';
import {
  CE_IMPLICIT_TEMPLATE_ARGUMENTS,
  type TemplateArgumentNames,
  templateArgumentNames,
  templateIdsOf,
  templateKeyOf,
  templatePlaceholders,
} from './templateArgs';

/* ====================================================================== Project templates */

/** A declared argument of a project template: its name and the default used when a use does not pass it. */
export interface TemplateArgumentDecl {
  name: string;
  default?: string;
}

/** The project's templates (an empty list for a project without any). */
export const projectTemplates = (project: Project): ConfigObject[] => project.craftEngine?.templates ?? [];

/** The project's global variables ({} for a project without any). */
export const projectGlobalVariables = (project: Project): Record<string, string> => project.craftEngine?.globalVariables ?? {};

/** The id a project template is written under: as written, in the project's namespace when it names none. */
export function templateKey(project: Pick<Project, 'namespace'>, id: string): string {
  const trimmed = id.trim();
  return trimmed.includes(':') ? trimmed : formatResourceLocation(project.namespace, trimmed);
}

/** The id of a template entry ('' without one). */
export const templateEntryId = (entry: ConfigObject): string => (typeof entry.id === 'string' ? entry.id.trim() : '');

/** The declared arguments of a template entry (entries without a name are skipped). */
export function templateDeclarations(entry: ConfigObject): TemplateArgumentDecl[] {
  const list = Array.isArray(entry.arguments) ? entry.arguments : [];
  return list.flatMap((decl) => {
    if (!isPlainObject(decl) || typeof decl.name !== 'string' || !decl.name.trim()) return [];
    const value = decl.default;
    const text = typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : undefined;
    return [text === undefined || text === '' ? { name: decl.name.trim() } : { name: decl.name.trim(), default: text }];
  });
}

/** The written entries: those with an id, each under its key (a later entry with a taken key is left out). */
function writtenTemplates(project: Project): Map<string, ConfigObject> {
  const result = new Map<string, ConfigObject>();
  for (const entry of projectTemplates(project)) {
    const id = templateEntryId(entry);
    if (!id || entry.body === undefined || entry.body === null) continue;
    const key = templateKey(project, id);
    if (!result.has(key)) result.set(key, entry);
  }
  return result;
}

/** A default as CraftEngine reads it after `:-` (SNBT): numbers, booleans, null and quoted or nested values as they are, other text quoted. */
function snbtDefault(text: string): string {
  const raw = /^(-?\d+(\.\d+)?[bBsSlLfFdD]?|true|false|null)$/.test(text) || /^['"[{]/.test(text);
  const value = raw ? text : `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  // Braces end the placeholder unless escaped
  return value.replace(/[{}]/g, (brace) => `\\${brace}`);
}

/** A text with each placeholder of a declared argument that has no default given that argument's default. */
function textWithDefaults(text: string, defaults: Map<string, string>): string {
  let result = '';
  let last = 0;
  for (const p of templatePlaceholders(text)) {
    const fallback = defaults.get(p.name);
    if (p.defaultText !== undefined || fallback === undefined) continue;
    result += `${text.slice(last, p.start)}\${${p.name}${p.suffix}:-${snbtDefault(fallback)}}`;
    last = p.end;
  }
  return result + text.slice(last);
}

/** The body with the declared defaults filled into its placeholders (keys too). */
export function templateBodyWithDefaults(body: ConfigValue, declarations: TemplateArgumentDecl[]): ConfigValue {
  const defaults = new Map(declarations.flatMap((d) => (d.default === undefined ? [] : [[d.name, d.default] as [string, string]])));
  if (defaults.size === 0) return body;
  const fill = (value: ConfigValue): ConfigValue => {
    if (typeof value === 'string') return textWithDefaults(value, defaults);
    if (Array.isArray(value)) return value.map(fill);
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value as ConfigObject).map(([key, entry]) => [textWithDefaults(key, defaults), fill(entry)]),
      );
    }
    return value;
  };
  return fill(body);
}

/** The `templates` section: each project template with an id and a body under its key, its defaults filled in. */
export function craftEngineTemplates(project: Project): Record<string, ConfigValue> {
  const section: Record<string, ConfigValue> = {};
  for (const [key, entry] of writtenTemplates(project)) {
    section[key] = templateBodyWithDefaults(entry.body as ConfigValue, templateDeclarations(entry));
  }
  return section;
}

/* ====================================================================== Lookup */

const DEFAULT_TEMPLATE_NAMES = new Map<string, TemplateArgumentNames>(
  CE_DEFAULT_TEMPLATES.map((t) => [t.id, { required: [...(t.required ?? [])], optional: [...(t.optional ?? [])] }]),
);

/** Looks up the arguments of a template by id; undefined when neither the jar nor the project has it. */
export type TemplateLookup = (id: string) => TemplateArgumentNames | undefined;

/**
 * The templates a use in this project can name: the jar's default templates and the project's own (by their key).
 * A project template needs the arguments its body uses without a default and those declared without one.
 */
export function templateLookup(project: Project): TemplateLookup {
  const own = writtenTemplates(project);
  const cache = new Map<string, TemplateArgumentNames | undefined>();
  const lookup: TemplateLookup = (id) => {
    const entry = own.get(id);
    if (!entry) return DEFAULT_TEMPLATE_NAMES.get(id);
    if (cache.has(id)) return cache.get(id);
    cache.set(id, undefined); // A template that uses itself does not loop
    const declarations = templateDeclarations(entry);
    const names = templateArgumentNames(templateBodyWithDefaults(entry.body as ConfigValue, declarations), lookup);
    const required = new Set(names.required);
    for (const d of declarations) if (d.default === undefined) required.add(d.name);
    const optional = new Set([...names.optional, ...declarations.map((d) => d.name)].filter((name) => !required.has(name)));
    const result = { required: [...required].sort(), optional: [...optional].sort() };
    cache.set(id, result);
    return result;
  };
  return lookup;
}

/** An issue of a template use: the code (`ce.*`) and its arguments. */
export interface TemplateUseIssue {
  code: 'ce.templateUnknown' | 'ce.templateArgumentMissing';
  args: { template: string; argument?: string };
}

/**
 * The template uses in a config (an item, block or furniture definition, or a template body): each names a template
 * the jar or the project has, and passes the arguments it needs (or gets them from the use around it, as CraftEngine
 * passes arguments on). Ids with a placeholder are only known once a template is applied and are not checked;
 * `skip` leaves out uses the caller checks itself.
 */
export function templateUseIssues(value: unknown, lookup: TemplateLookup, skip: (id: string) => boolean = () => false): TemplateUseIssue[] {
  const issues: TemplateUseIssue[] = [];
  const implicit = new Set(CE_IMPLICIT_TEMPLATE_ARGUMENTS);
  const walk = (node: unknown, inherited: ReadonlySet<string>) => {
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry, inherited);
      return;
    }
    if (!isPlainObject(node)) return;
    const template = templateKeyOf(node);
    let given = inherited;
    if (template !== undefined) {
      given = new Set([...inherited, ...(isPlainObject(node.arguments) ? Object.keys(node.arguments) : [])]);
      for (const id of templateIdsOf(template)) {
        if (id.includes('${') || skip(id)) continue;
        const names = lookup(id);
        if (!names) issues.push({ code: 'ce.templateUnknown', args: { template: id } });
        for (const argument of names?.required ?? []) {
          if (!given.has(argument) && !implicit.has(argument))
            issues.push({ code: 'ce.templateArgumentMissing', args: { template: id, argument } });
        }
      }
    }
    for (const [key, entry] of Object.entries(node)) {
      if (template !== undefined && (key === 'template' || key === 'templates')) continue;
      walk(entry, given);
    }
  };
  walk(value, new Set());
  return issues;
}

/* ====================================================================== Editor */

/** Default templates for a block's settings (block_settings.yml) */
export const CE_SETTINGS_TEMPLATE_OPTIONS: Option[] = plainOptions(
  CE_DEFAULT_TEMPLATES.filter((t) => t.file === 'block_settings').map((t) => t.id),
);

/** The project's templates as suggestions (by the key a use names them with). */
export function projectTemplateOptions(project: Project): Option[] {
  return plainOptions([...writtenTemplates(project).keys()]);
}

/** A new template: an empty map with no arguments */
export const newTemplate = (): ConfigObject => ({ id: '', body: {} });

const [templateList, globalVariableMap] = resolveFields(
  {
    templates: field.objectList(
      {
        id: field.text({ placeholder: true, help: true }),
        arguments: field.objectList(
          { name: field.text({ placeholder: true }), default: field.text({ placeholder: true }) },
          { titleKey: 'name', newItem: () => ({ name: '' }), help: true },
        ),
        body: field.yaml({ help: true, placeholder: true }),
      },
      { titleKey: 'id', newItem: newTemplate },
    ),
    global_variables: field.map(field.text({ format: 'minimessage', placeholder: true }), { keyPlaceholder: true, newValue: () => '' }),
  },
  'craftEngine',
);

/** The project's templates as the editor edits them (messages at `craftEngine.fields.templates` of ceSchema). */
export const CE_TEMPLATE_LIST = templateList as ObjectListField;

/** The project's global variables as the editor edits them: name → MiniMessage text. */
export const CE_GLOBAL_VARIABLE_MAP = globalVariableMap as MapField;

/** Names CraftEngine can read in `<global:name>` (a `:` would start the tag's arguments, `<`, `>` and spaces end it) */
export const CE_GLOBAL_VARIABLE_NAME = /^[A-Za-z0-9_.\-/]+$/;

/** Ids a project template can have: a resource location, its namespace optional */
export const CE_TEMPLATE_ID = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

/** A text with each `<global:name>` (without arguments) replaced by the variable's text, for previews. */
export function resolveGlobalVariables(text: string, variables: Record<string, string>): string {
  if (!text.includes('<global:')) return text;
  return text.replace(/<global:([A-Za-z0-9_.\-/]+)>/g, (tag, name: string) => (Object.hasOwn(variables, name) ? variables[name] : tag));
}

/** The `global_variables` section: the variables with a name CraftEngine can read. */
export function craftEngineGlobalVariables(project: Project): Record<string, string> {
  return Object.fromEntries(Object.entries(projectGlobalVariables(project)).filter(([name]) => CE_GLOBAL_VARIABLE_NAME.test(name)));
}
