/**
 * What the output dock shows for the page: the file the selected entry writes (path and text) and the entry's
 * checks. Every page kind supplies its own provider here, so the dock never special-cases a page:
 * items and folders through {@link SELECTION_OUTPUTS}, project-wide views through {@link VIEW_OUTPUTS}. A page without a
 * provider writes no file, and the dock leaves its room to the page.
 */
import {
  type ExportPlan,
  craftEngineConfigFile,
  findItemPlan,
  itemYamlPreview,
  packTargetFor,
  packYmlFile,
} from '@resourcepackbuilder/export';
import { buildDialogFiles, MULTIPACK_FILE, multipackFile } from '@resourcepackbuilder/core/nexo';
import type { MediaKind, Project } from '@resourcepackbuilder/core/project';
import { issuesFor, type Issue, type IssueTarget } from '@resourcepackbuilder/utils';
import type { Selection, ViewName } from '../store/ui';

/** The dock's content for one page. */
export interface Output {
  /** The written file, relative to the plugin folder; null while the entry writes nothing yet */
  file: string | null;
  /** The file's text ('' when there is none) */
  text: string;
  /** Checks of this entry */
  issues: Issue[];
}

/** The output of a project-wide view; null when the view writes no file. */
export type ViewOutputProvider = (project: Project, plan: ExportPlan) => Output | null;

/** A text file of the plan's plugin folder ('' when there is none). */
export function pluginText(plan: ExportPlan, path: string): string {
  const content = plan.pluginFiles.get(path);
  return typeof content === 'string' ? content : '';
}

/** The issues whose target is of `kind`. */
function issuesOfKind(plan: ExportPlan, kind: IssueTarget['kind']): Issue[] {
  return plan.issues.filter((issue) => issue.target?.kind === kind);
}

/** The project's config file of a media kind, with the issues of its entries; null when the target has no such kind. */
function mediaOutput(kind: MediaKind, target: IssueTarget['kind']): ViewOutputProvider {
  return (project, plan) => {
    const file = packTargetFor(project).layout.mediaFile(project, kind);
    return file === null ? null : { file, text: pluginText(plan, file), issues: issuesOfKind(plan, target) };
  };
}

/** A Nexo project's dialog files, one after the other, each headed by its path; with the dialogs' issues. */
const dialogsOutput: ViewOutputProvider = (project, plan) => {
  const folder = packTargetFor(project).layout.mediaFile(project, 'dialog');
  if (folder === null) return null;
  const text = [...buildDialogFiles(project)].map(([path, yaml]) => `# ${path}\n${yaml}`).join('\n');
  return { file: folder, text, issues: issuesOfKind(plan, 'dialog') };
};

/** A Nexo project's multipack.yml, with the checks of its templates and menu. */
const multipackOutput: ViewOutputProvider = (project, plan) => {
  if (project.target !== 'nexo') return null;
  const issues = plan.issues.filter((issue) => issue.code.startsWith('multipack.'));
  return { file: MULTIPACK_FILE, text: multipackFile(project) ?? '', issues };
};

/** A CraftEngine project's config file `<name>.yml` (only CraftEngine projects have these views). */
function craftEngineFileOutput(name: string): ViewOutputProvider {
  return (project, plan) => {
    if (project.target !== 'craftengine') return null;
    const file = craftEngineConfigFile(project, name);
    return { file, text: pluginText(plan, file), issues: [] };
  };
}

/**
 * The file each project-wide view writes. A new view that writes a file adds one line here; a view without an
 * entry (the test server) writes nothing, and its page gets the dock's room.
 */
export const VIEW_OUTPUTS: Partial<Record<ViewName, ViewOutputProvider>> = {
  glyphs: mediaOutput('glyph', 'glyph'),
  sounds: mediaOutput('sound', 'sound'),
  paintings: mediaOutput('painting', 'painting'),
  dialogs: dialogsOutput,
  multipack: multipackOutput,
  lootSources: craftEngineFileOutput('loot_sources'),
  templates: craftEngineFileOutput('templates'),
  globalVariables: craftEngineFileOutput('global_variables'),
  attributes: craftEngineFileOutput('attributes'),
};

type SelectionKind = Exclude<Selection, null>['kind'];
type SelectionOf<K extends SelectionKind> = Extract<Selection, { kind: K }>;

/** The output of each selection kind; views delegate to {@link VIEW_OUTPUTS}. */
export const SELECTION_OUTPUTS: { [K in SelectionKind]: (project: Project, plan: ExportPlan, selection: SelectionOf<K>) => Output | null } =
  {
    item: (project, plan, { id }) => {
      const item = project.items[id];
      if (!item) return null;
      return {
        file: findItemPlan(plan, item.id)?.yamlFile ?? null,
        text: itemYamlPreview(plan, item.id),
        issues: issuesFor(plan.issues, { kind: 'item', id }),
      };
    },
    folder: (project, plan, { id }) => {
      const folder = project.folders[id];
      if (!folder) return null;
      const itemIds = new Set(folder.itemIds);
      const entry = plan.items.find((p) => itemIds.has(p.item.id));
      const issues = plan.issues.filter(
        (issue) =>
          (issue.target?.kind === 'folder' && issue.target.id === id) || (issue.target?.kind === 'item' && itemIds.has(issue.target.id)),
      );
      return { file: entry?.yamlFile ?? null, text: entry ? pluginText(plan, entry.yamlFile) : '', issues };
    },
    view: (project, plan, { view }) => VIEW_OUTPUTS[view]?.(project, plan) ?? null,
    // CraftEngine writes the pack settings into pack.yml; Nexo keeps them in its own config
    settings: (project, plan) => {
      if (project.target !== 'craftengine') return null;
      const file = packYmlFile(project);
      return { file, text: pluginText(plan, file), issues: [] };
    },
  };

/** What the dock shows for `selection`; null when the page writes no file (or nothing is selected or planned yet). */
export function outputFor(project: Project, plan: ExportPlan | null, selection: Selection): Output | null {
  if (!plan || !selection) return null;
  const provider = SELECTION_OUTPUTS[selection.kind] as (project: Project, plan: ExportPlan, selection: Selection) => Output | null;
  return provider(project, plan, selection);
}

/** The arguments and result of the last {@link pageOutput} call. */
let lastOutput: { project: Project; plan: ExportPlan | null; selection: Selection; output: Output | null } | null = null;

/**
 * {@link outputFor}, remembering the last result: the dock, its toggle and the shortcuts ask for the same page's
 * output in one render, and the YAML is built only once.
 */
export function pageOutput(project: Project, plan: ExportPlan | null, selection: Selection): Output | null {
  if (lastOutput && lastOutput.project === project && lastOutput.plan === plan && lastOutput.selection === selection)
    return lastOutput.output;
  const output = outputFor(project, plan, selection);
  lastOutput = { project, plan, selection, output };
  return output;
}
