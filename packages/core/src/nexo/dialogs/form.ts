/**
 * The editor of a Nexo dialog file, as one object field the generic renderer shows: the dialog type with the buttons
 * that type reads, and the `base` (title, behavior, body elements, input controls). Keys and types follow Nexo 1.30's
 * dialog loader (`NexoDialogs`, `NexoActionButton`, `NexoDialogAction`, `NexoDialogBody`, `NexoDialogInput`); the
 * keys only the jar reads are tucked away as advanced. Messages live at `nexoDialogs.*` of the `schema` namespace.
 */
import { type FieldSpec, field, resolveFields, whenType } from '../../form/build';
import type { ObjectField } from '../../form/fields';
import { plainOptions } from '../../form/options';
import { DIALOG_ACTION_TYPES, DIALOG_AFTER_ACTIONS, DIALOG_BODY_TYPES, DIALOG_INPUT_TYPES, DIALOG_TYPES } from '../../project/media/dialog';
import { NEXO_DOCS } from '../form/schema/docs';
import { JAR_ONLY } from '../form/schema/shared';

const DOCS = NEXO_DOCS.dialogs;

/** Message scope of the button fields every button (action, yes, no, exit, multi actions) shares */
const BUTTON_SCOPE = 'nexoDialogs.button';

/** The click action of a button: its type and the one value that type reads */
const clickAction = field.object(
  {
    type: field.select(plainOptions(DIALOG_ACTION_TYPES)),
    url: field.text({ placeholder: true, ...whenType('OPEN_URL') }),
    command: field.text({ placeholder: true, help: true, ...whenType('RUN_COMMAND', 'SUGGEST_COMMAND') }),
    page: field.number({ integer: true, min: 1, ...whenType('CHANGE_PAGE') }),
    clipboard: field.text({ ...whenType('CLIPBOARD') }),
    dialog: field.select([], { allowCustom: true, dynamicSuggestions: 'dialogs', placeholder: true, ...whenType('SHOW_DIALOG') }),
    template: field.text({ placeholder: true, help: true, ...whenType('DYNAMIC_RUN_COMMAND') }),
    id: field.text({ format: 'resource', placeholder: true, ...whenType('CUSTOM', 'DYNAMIC_CUSTOM') }),
    payload: field.text({ ...whenType('CUSTOM'), ...JAR_ONLY }),
    additions: field.text({ ...whenType('DYNAMIC_CUSTOM'), ...JAR_ONLY }),
  },
  { help: true, docs: DOCS.actions },
);

/** The fields of a dialog button (`label`, `tooltip`, `width`, `action`) */
const BUTTON_FIELDS = {
  label: field.text({ format: 'minimessage', placeholder: true }),
  tooltip: field.text({ format: 'minimessage' }),
  width: field.number({ integer: true, min: 1, max: 1024 }),
  action: clickAction,
};

/** A button of the dialog; `key` names it (its label at `nexoDialogs.fields.dialog.fields.<key>.label`) */
const button = (key: string, only: ReturnType<typeof whenType>, docs: string): FieldSpec =>
  field.object(BUTTON_FIELDS, { scope: BUTTON_SCOPE, label: `nexoDialogs.fields.dialog.fields.${key}.label`, docs, ...only });

/** A body element: a MiniMessage text, or an item with its description */
const body = field.object({
  type: field.select(plainOptions(DIALOG_BODY_TYPES)),
  message: field.text({ format: 'minimessage', multiline: true, placeholder: true, ...whenType('MESSAGE') }),
  description: field.choice(
    {
      text: { field: field.text({ format: 'minimessage' }), matches: (value) => typeof value === 'string', newValue: () => '' },
      sized: {
        field: field.object({
          contents: field.text({ format: 'minimessage' }),
          width: field.number({ integer: true, min: 1, max: 1024 }),
        }),
        matches: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
        newValue: () => ({ contents: '', width: 200 }),
      },
    },
    whenType('ITEM'),
  ),
  nexoItem: field.text({ ...whenType('ITEM'), ...JAR_ONLY }),
  itemModel: field.text({ format: 'resource', ...whenType('ITEM'), ...JAR_ONLY }),
  lore: field.stringList({ format: 'minimessage', ...whenType('ITEM'), ...JAR_ONLY }),
  showDecorations: field.boolean({ ...whenType('ITEM') }),
  showTooltip: field.boolean({ ...whenType('ITEM') }),
  width: field.number({ integer: true, min: 1, max: 1024 }),
  height: field.number({ integer: true, min: 1, max: 256, ...whenType('ITEM') }),
});

/** An input control: text field, checkbox, slider or option button */
const input = field.object({
  type: field.select(plainOptions(DIALOG_INPUT_TYPES)),
  label: field.text({ format: 'minimessage', placeholder: true }),
  labelVisible: field.boolean({ ...whenType('TEXT', 'SINGLE') }),
  width: field.number({ integer: true, min: 1, max: 1024, ...whenType('TEXT', 'NUMBER', 'SINGLE') }),
  maxLength: field.number({ integer: true, min: 1, ...whenType('TEXT') }),
  // The initial value is a text, a checkbox state or a number, by the input's type
  initial: field.choice(
    {
      text: { field: field.text(), matches: (value) => typeof value === 'string', newValue: () => '' },
      state: { field: field.boolean(), matches: (value) => typeof value === 'boolean', newValue: () => false },
      number: { field: field.number(), matches: (value) => typeof value === 'number', newValue: () => 0 },
    },
    whenType('TEXT', 'BOOL', 'NUMBER'),
  ),
  multilineOptions: field.object(
    { maxLines: field.number({ integer: true, min: 1 }), height: field.number({ integer: true, min: 1, max: 512 }) },
    whenType('TEXT'),
  ),
  onTrue: field.text({ placeholder: true, ...whenType('BOOL') }),
  onFalse: field.text({ placeholder: true, ...whenType('BOOL') }),
  labelFormat: field.text({ placeholder: true, help: true, ...whenType('NUMBER') }),
  start: field.number({ ...whenType('NUMBER') }),
  end: field.number({ ...whenType('NUMBER') }),
  step: field.number({ min: 0, ...whenType('NUMBER') }),
  options: field.map(field.object({ display: field.text({ format: 'minimessage', placeholder: true }), initial: field.boolean() }), {
    keyPlaceholder: true,
    newValue: () => ({ display: '' }),
    ...whenType('SINGLE'),
  }),
});

const [dialogField] = resolveFields(
  {
    dialog: field.object(
      {
        type: field.select(plainOptions(DIALOG_TYPES), { help: true, docs: DOCS.types }),
        action: button('action', whenType('NOTICE'), DOCS.notice),
        yesButton: button('yesButton', whenType('CONFIRM'), DOCS.confirm),
        noButton: button('noButton', whenType('CONFIRM'), DOCS.confirm),
        // The actions share the button texts; the list has its own label
        actions: field.objectList(BUTTON_FIELDS, {
          scope: BUTTON_SCOPE,
          label: 'nexoDialogs.fields.dialog.fields.actions.label',
          newItem: () => ({ label: '' }),
          titleKey: 'label',
          docs: DOCS.multi,
          ...whenType('MULTI'),
        }),
        dialogs: field.stringList({ dynamicSuggestions: 'dialogs', placeholder: true, docs: DOCS.list, ...whenType('LIST') }),
        exitAction: button('exitAction', whenType('LIST', 'MULTI', 'LINK'), DOCS.types),
        columns: field.number({ integer: true, min: 0, ...whenType('LIST', 'MULTI', 'LINK') }),
        buttonWidth: field.number({ integer: true, min: 1, max: 1024, ...whenType('LIST', 'LINK') }),
        base: field.object(
          {
            title: field.text({ format: 'minimessage', placeholder: true }),
            externalTitle: field.text({ format: 'minimessage', help: true }),
            canCloseWithEscape: field.boolean(),
            pause: field.boolean({ ...JAR_ONLY }),
            afterAction: field.select(plainOptions(DIALOG_AFTER_ACTIONS), { help: true }),
            bodies: field.map(body, { keyPlaceholder: true, newValue: () => ({ type: 'MESSAGE', message: '' }), docs: DOCS.bodies }),
            inputs: field.map(input, { keyPlaceholder: true, newValue: () => ({ type: 'TEXT', label: '' }), docs: DOCS.inputs }),
          },
          { docs: DOCS.base },
        ),
      },
      { docs: DOCS.page },
    ),
  },
  'nexoDialogs',
);

/** A dialog file's content as the editor edits it (messages at `nexoDialogs.fields.dialog` of the schema namespace). */
export const NEXO_DIALOG_FIELD = dialogField as ObjectField;
