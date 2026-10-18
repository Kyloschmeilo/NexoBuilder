/**
 * Export of dialogs: one file per dialog in plugins/Nexo/dialogs, named by the dialog's ID (Nexo registers it as
 * `nexo:<id>`). The file is the dialog's config without its empty values, in the editor's key order (type, the
 * type's buttons, base); keys the editor does not know are kept after them.
 */
import { pruneValue } from '../../form/prune';
import type { Dialog } from '../../project/media/dialog';
import type { Project } from '../../project/types';
import { toYaml } from '../../yaml/yaml';
import { NEXO_DIALOG_FIELD } from './form';

/** The folder of the dialog files, relative to plugins/Nexo. */
export const DIALOGS_DIR = 'dialogs';

/** The dialog's file relative to plugins/Nexo, e.g. "dialogs/welcome.yml". */
export function dialogFilePath(dialog: Pick<Dialog, 'dialogId'>): string {
  return `${DIALOGS_DIR}/${dialog.dialogId}.yml`;
}

/** The text of the dialog's file. */
export function dialogToYaml(dialog: Dialog): string {
  return toYaml(pruneValue(dialog.config, NEXO_DIALOG_FIELD) ?? {});
}

/** The project's dialog files (path relative to plugins/Nexo → text), in list order. */
export function buildDialogFiles(project: Project): Map<string, string> {
  return new Map((project.dialogs ?? []).map((dialog) => [dialogFilePath(dialog), dialogToYaml(dialog)]));
}
