/**
 * Dialogs (Nexo: configuration/dialogs): Minecraft's dialog screens (1.21.6+), one YAML file per dialog in
 * plugins/Nexo/dialogs. Nexo registers each file under `nexo:<file name>`; the entry's config mirrors that file 1:1
 * (its type with the type's buttons, and the `base` with title, bodies and inputs). Only Nexo projects have dialogs.
 */
import type { ConfigObject } from '../types';

/** The dialog types Nexo reads (`type`, default NOTICE). */
export const DIALOG_TYPES = ['NOTICE', 'CONFIRM', 'LIST', 'MULTI', 'LINK'] as const;
export type DialogType = (typeof DIALOG_TYPES)[number];

/** The click actions of a dialog button (`action.type`): static ones, and dynamic ones that use the inputs' values. */
export const DIALOG_ACTION_TYPES = [
  'OPEN_URL',
  'RUN_COMMAND',
  'SUGGEST_COMMAND',
  'CHANGE_PAGE',
  'CLIPBOARD',
  'SHOW_DIALOG',
  'CUSTOM',
  'DYNAMIC_RUN_COMMAND',
  'DYNAMIC_CUSTOM',
] as const;

/** The body element types (`base.bodies.<key>.type`). */
export const DIALOG_BODY_TYPES = ['MESSAGE', 'ITEM'] as const;

/** The input control types (`base.inputs.<key>.type`). */
export const DIALOG_INPUT_TYPES = ['TEXT', 'BOOL', 'NUMBER', 'SINGLE'] as const;

/** What happens to the dialog after a click or submit (`base.afterAction`, default CLOSE). */
export const DIALOG_AFTER_ACTIONS = ['NONE', 'CLOSE', 'WAIT_FOR_RESPONSE'] as const;

export interface Dialog {
  id: string;
  /** File name in plugins/Nexo/dialogs (without .yml); Nexo registers the dialog as `nexo:<dialogId>` */
  dialogId: string;
  /** The dialog file's content (type, its buttons, base) */
  config: ConfigObject;
}

/** A new dialog: a notice with its ID as title and one button that closes it. */
export function createDialog(id: string, dialogId: string): Dialog {
  return {
    id,
    dialogId,
    config: { type: 'NOTICE', action: { label: 'OK' }, base: { title: dialogId, canCloseWithEscape: true } },
  };
}

/** The key Nexo registers a dialog under: namespace `nexo`, the file name in lower case. */
export function dialogKey(dialogId: string): string {
  return `nexo:${dialogId.toLowerCase()}`;
}
