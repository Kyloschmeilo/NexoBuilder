/**
 * JavaScript files of a CraftEngine pack: resources/<pack>/script/<path>.js, each known to CraftEngine as
 * `<pack namespace>:<path>`. `js` functions and conditions and the `js` damage formula call their functions, and
 * annotations in them (`//@Subscribe`, `//@Task`, `//@Enable`, …) register event handlers and tasks. CraftEngine only
 * runs scripts with `scripting.js.enable: true` in its config.yml (the test server sets it for a project with scripts).
 *
 * The project keeps its scripts as a list (`scripts` of `Project.craftEngine`), each with its `path` (without `.js`)
 * and its `source`.
 */
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import { field, resolveFields } from '../form/build';
import type { ObjectListField } from '../form/fields';
import { type Option, plainOptions } from '../form/options';
import type { ConfigObject, Project } from '../project/types';

/** Paths a script can have: lower-case folders and a file name, without `.js`; no `.` or `..` segment */
export const CE_SCRIPT_PATH = /^(?!\.\.?(\/|$))[a-z0-9_.-]+(\/(?!\.\.?(\/|$))[a-z0-9_.-]+)*$/;

/** The project's scripts (an empty list for a project without any). */
export const projectScripts = (project: Pick<Project, 'craftEngine'>): ConfigObject[] => project.craftEngine?.scripts ?? [];

/** The path of a script entry as the pack names it: trimmed, without a leading `/` or a trailing `.js` ('' without one). */
export function scriptPath(entry: ConfigObject): string {
  return typeof entry.path === 'string' ? entry.path.trim().replace(/^\/+/, '').replace(/\.js$/, '') : '';
}

/** A new script: a function a `js` function can call */
export const newScript = (): ConfigObject => ({ path: '', source: 'function run() {\n  log.info("Hello from CraftEngine");\n}\n' });

const [scriptList] = resolveFields(
  {
    scripts: field.objectList(
      {
        path: field.text({ placeholder: true, help: true }),
        source: field.text({ multiline: true, placeholder: true, help: true }),
      },
      { titleKey: 'path', newItem: newScript },
    ),
  },
  'craftEngine',
);

/** The project's scripts as the editor edits them (messages at `craftEngine.fields.scripts` of ceSchema). */
export const CE_SCRIPT_LIST = scriptList as ObjectListField;

/** The scripts the export writes: file path in the pack (`script/<path>.js`) → source; bad and taken paths are left out. */
export function craftEngineScriptFiles(project: Project): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of projectScripts(project)) {
    const path = scriptPath(entry);
    const file = `script/${path}.js`;
    if (!CE_SCRIPT_PATH.test(path) || files.has(file) || typeof entry.source !== 'string') continue;
    files.set(file, entry.source.endsWith('\n') ? entry.source : `${entry.source}\n`);
  }
  return files;
}

/** Whether the project ships scripts, which CraftEngine only runs with scripting switched on. */
export function craftEngineUsesScripts(project: Project): boolean {
  return craftEngineScriptFiles(project).size > 0;
}

/** The project's scripts by the id `js` functions and conditions name them with (`<namespace>:<path>`). */
export function projectScriptOptions(project: Project): Option[] {
  return plainOptions(
    [...craftEngineScriptFiles(project).keys()].map((file) => formatResourceLocation(project.namespace, file.slice(7, -3))),
  );
}
