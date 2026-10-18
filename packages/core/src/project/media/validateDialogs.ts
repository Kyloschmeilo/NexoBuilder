import { compareVersions, FEATURE_VERSIONS, ITEM_ID_PATTERN } from '@resourcepackbuilder/minecraft';
import { createIssue, isPlainObject, type Issue, type ReportIssue } from '@resourcepackbuilder/utils';
import type { ConfigValue, Project } from '../types';
import { DIALOG_TYPES, dialogKey, type Dialog } from './dialog';
import { validateEntries } from './entry';

/**
 * Checks all dialogs of the project; each issue targets its dialog and carries a `context.dialog` frame. Besides the
 * ID it checks what makes Nexo skip a dialog or a part of it: an unknown type, a multi action dialog without actions,
 * a number input whose range is empty, a single option input without options, and links to `nexo:` dialogs the
 * project does not have.
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
    for (const link of dialogLinks(config)) {
      if (link.startsWith('nexo:') && !known.has(link)) add('warning', 'dialog.unknownDialog', { dialog: link });
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

/** The dialogs a dialog links to: a list dialog's `dialogs` and every `SHOW_DIALOG` action's `dialog`, in file order. */
function dialogLinks(config: ConfigValue): string[] {
  const links: string[] = [];
  const walk = (node: ConfigValue): void => {
    if (Array.isArray(node)) node.forEach(walk);
    if (!isPlainObject(node)) return;
    if (node.type === 'SHOW_DIALOG' && typeof node.dialog === 'string') links.push(node.dialog.trim());
    for (const [key, value] of Object.entries(node)) {
      if (key === 'dialogs' && Array.isArray(value)) {
        for (const entry of value) if (typeof entry === 'string') links.push(entry.trim());
      } else walk(value);
    }
  };
  walk(config);
  return links;
}
