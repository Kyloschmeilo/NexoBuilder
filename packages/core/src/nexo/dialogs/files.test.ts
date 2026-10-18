import { describe, expect, it } from 'vitest';
import { createProject } from '../../project/factory';
import { createDialog } from '../../project/media/dialog';
import { addMediaEntry } from '../../project/media/operations';
import { fieldMessageKeys } from '../../form/messageKeys';
import { buildDialogFiles, dialogFilePath, dialogToYaml } from './files';
import { NEXO_DIALOG_FIELD } from './form';

describe('dialog files', () => {
  it('writes one file per dialog under dialogs/', () => {
    const project = createProject('Test', 'pack');
    const welcome = addMediaEntry(project, 'dialog', 'Welcome', createDialog);
    addMediaEntry(project, 'dialog', 'Rules', createDialog);
    expect(dialogFilePath(welcome)).toBe('dialogs/welcome.yml');
    expect([...buildDialogFiles(project).keys()]).toEqual(['dialogs/welcome.yml', 'dialogs/rules.yml']);
    expect(buildDialogFiles(project).get('dialogs/welcome.yml')).toBe(
      ['type: NOTICE', 'action:', '  label: OK', 'base:', '  title: welcome', '  canCloseWithEscape: true', ''].join('\n'),
    );
  });

  it('writes the type first, drops empty values, quotes YAML 1.1 booleans and keeps unknown keys', () => {
    const dialog = createDialog('d_1', 'confirm');
    dialog.config = {
      base: {
        title: '<red>Sure?',
        externalTitle: '',
        inputs: {
          name: { type: 'TEXT', label: 'Name', initial: 'Steve', multilineOptions: {} },
          agree: { type: 'BOOL', label: 'Agree', initial: true },
        },
        future_key: 1,
      },
      noButton: { label: 'No', action: { type: 'RUN_COMMAND', command: '' } },
      yesButton: { label: 'Yes', action: { type: 'DYNAMIC_RUN_COMMAND', template: 'say $(name)' } },
      type: 'CONFIRM',
    };
    expect(dialogToYaml(dialog)).toBe(
      [
        'type: CONFIRM',
        'yesButton:',
        '  label: "Yes"',
        '  action:',
        '    type: DYNAMIC_RUN_COMMAND',
        '    template: say $(name)',
        'noButton:',
        '  label: "No"',
        '  action:',
        '    type: RUN_COMMAND',
        'base:',
        '  title: "<red>Sure?"',
        '  inputs:',
        '    name:',
        '      type: TEXT',
        '      label: Name',
        '      initial: Steve',
        '    agree:',
        '      type: BOOL',
        '      label: Agree',
        '      initial: true',
        '  future_key: 1',
        '',
      ].join('\n'),
    );
  });

  it('names every field of the editor with a well-formed message key', () => {
    const keys = fieldMessageKeys(NEXO_DIALOG_FIELD);
    expect(keys.filter((key) => !/^nexoDialogs(\.[A-Za-z0-9]+)+$/.test(key))).toEqual([]);
  });
});
