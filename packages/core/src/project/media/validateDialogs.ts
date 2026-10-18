import { compareVersions, FEATURE_VERSIONS, ITEM_ID_PATTERN } from '@resourcepackbuilder/minecraft';
import { createIssue, isPlainObject, type Issue, type ReportIssue } from '@resourcepackbuilder/utils';
import type { ConfigValue, Project } from '../types';
import { DIALOG_TYPES, dialogKey, type Dialog } from './dialog';
import { validateEntries } from './entry';

/**
 * Checks all dialogs of the project; each issue targets its dialog and carries a `context.dialog` frame. Besides the
 * ID it checks what makes Nexo skip a dialog or a part of it: an unknown type, a multi action dialog without actions,
 * a number input whose range is empty, a single option input without options, links to `nexo:` dialogs the
 * project does not have, and `SHOW_DIALOG` buttons that open a `nexo:` dialog (Nexo 1.30 builds the dialogs before it
 * registers them, finds no such dialog and drops the action: "Invalid Dialog specified in …").
 */
export function validateDialogs(project: Project): Issue[] {
  const issues: Issue[] = [];
  const dialogs = project.dialogs ?? [];
  if (dialogs.length > 0 && compareVersions(project.settings.minecraftVersion, FEATURE_VERSIONS.dialogs) < 0) {
    issues.push(createIssue('warning', 'dialog.needsVersion', undefined, { target: { kind: 'dialog', id: dialogs[0].id } }));
  }
  const known = new Set(dialogs.map((dialog) => dialogKey(dialog.dialogId)));
  const rules = { kind: 'dialog', idOf: (d: Dialog) => d.dialogId, pattern: ITEM_ID_PATTERN } as const;
  const checked = validateEntries(dialogs, rules, (dialog, add) => {
    const { config } = dialog;
    const type = config.type ?? 'NOTICE';
    if (typeof type !== 'string' || !(DIALOG_TYPES as readonly string[]).includes(type)) {
      add('error', 'dialog.typeInvalid', { type: String(type) });
      return;
    }
    if (type === 'MULTI' && (!Array.isArray(config.actions) || config.actions.length === 0)) add('error', 'dialog.actionsMissing');
    checkInputs(config.base, add);
    for (const { link, button } of dialogLinks(config)) {
      if (!link.startsWith('nexo:')) continue;
      if (!known.has(link)) add('warning', 'dialog.unknownDialog', { dialog: link });
      // Nexo 1.30 builds every dialog before it registers any, so a button finds no nexo: dialog and is dropped
      else if (button) add('warning', 'dialog.showDialogNexo', { dialog: link });
    }
  });
  return [...issues, ...checked];
}

/** Number inputs need a range (`start` below `end`), single option inputs at least one option. */
function checkInputs(base: ConfigValue | undefined, add: ReportIssue): void {
  const inputs = isPlainObject(base) ? base.inputs : undefined;
  if (!isPlainObject(inputs)) return;
  for (const [key, input] of Object.entries(inputs)) {
    if (!isPlainObject(input)) continue;
    if (input.type === 'NUMBER' && typeof input.start === 'number' && typeof input.end === 'number' && input.start >= input.end) {
      add('error', 'dialog.numberRange', { input: key });
    }
    if (input.type === 'SINGLE' && (!isPlainObject(input.options) || Object.keys(input.options).length === 0)) {
      add('error', 'dialog.optionsMissing', { input: key });
    }
  }
}

/**
 * The dialogs a dialog links to, in file order: a list dialog's `dialogs` and every `SHOW_DIALOG` action's `dialog`
 * (`button`).
 */
function dialogLinks(config: ConfigValue): Array<{ link: string; button: boolean }> {
  const links: Array<{ link: string; button: boolean }> = [];
  const walk = (node: ConfigValue): void => {
    if (Array.isArray(node)) node.forEach(walk);
    if (!isPlainObject(node)) return;
    if (node.type === 'SHOW_DIALOG' && typeof node.dialog === 'string') links.push({ link: node.dialog.trim(), button: true });
    for (const [key, value] of Object.entries(node)) {
      if (key === 'dialogs' && Array.isArray(value)) {
        for (const entry of value) if (typeof entry === 'string') links.push({ link: entry.trim(), button: false });
      } else walk(value);
    }
  };
  walk(config);
  return links;
}
