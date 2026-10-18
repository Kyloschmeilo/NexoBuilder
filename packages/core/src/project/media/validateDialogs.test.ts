import { describe, expect, it } from 'vitest';
import { createProject } from '../factory';
import { migrateProject } from '../migrate';
import { createDialog, dialogKey } from './dialog';
import { addMediaEntry } from './operations';
import { validateDialogs } from './validateDialogs';

function project(version = '1.21.11') {
  const p = createProject('Test', 'pack');
  p.settings.minecraftVersion = version;
  return p;
}

const codes = (p: ReturnType<typeof project>) => validateDialogs(p).map((issue) => issue.code);

describe('validateDialogs', () => {
  it('accepts a new dialog', () => {
    const p = project();
    addMediaEntry(p, 'dialog', 'Welcome', createDialog);
    expect(validateDialogs(p)).toEqual([]);
  });

  it('warns once when the version has no dialogs yet', () => {
    const p = project('1.21.4');
    addMediaEntry(p, 'dialog', 'a', createDialog);
    addMediaEntry(p, 'dialog', 'b', createDialog);
    expect(codes(p)).toEqual(['dialog.needsVersion']);
  });

  it('reports bad and duplicate IDs with the dialog as target', () => {
    const p = project();
    p.dialogs.push({ ...createDialog('d_1', 'Bad Id'), dialogId: 'Bad Id' }, createDialog('d_2', 'menu'), createDialog('d_3', 'menu'));
    const issues = validateDialogs(p);
    expect(issues.map((i) => i.code)).toEqual(['dialog.idInvalid', 'dialog.idDuplicate']);
    expect(issues[0].target).toEqual({ kind: 'dialog', id: 'd_1' });
  });

  it('checks the type, the actions of a multi action dialog and the inputs', () => {
    const p = project();
    const dialog = addMediaEntry(p, 'dialog', 'menu', createDialog);
    dialog.config = {
      type: 'MULTI',
      actions: [],
      base: {
        inputs: {
          amount: { type: 'NUMBER', start: 5, end: 1 },
          choice: { type: 'SINGLE' },
        },
      },
    };
    expect(codes(p)).toEqual(['dialog.actionsMissing', 'dialog.numberRange', 'dialog.optionsMissing']);
    dialog.config = { type: 'POPUP' };
    expect(codes(p)).toEqual(['dialog.typeInvalid']);
  });

  it('warns about links to dialogs Nexo does not know', () => {
    const p = project();
    const other = addMediaEntry(p, 'dialog', 'other', createDialog);
    const dialog = addMediaEntry(p, 'dialog', 'list', createDialog);
    dialog.config = {
      type: 'LIST',
      dialogs: [dialogKey(other.dialogId), 'nexo:missing', 'minecraft:server_links'],
      exitAction: { label: 'Back', action: { type: 'SHOW_DIALOG', dialog: 'nexo:gone' } },
    };
    const issues = validateDialogs(p);
    expect(issues.map((i) => [i.code, i.args])).toEqual([
      ['dialog.unknownDialog', { dialog: 'nexo:missing' }],
      ['dialog.unknownDialog', { dialog: 'nexo:gone' }],
    ]);
  });

  it('warns that a button cannot open another Nexo dialog, which Nexo 1.30 builds before it registers them', () => {
    const p = project();
    const other = addMediaEntry(p, 'dialog', 'other', createDialog);
    const dialog = addMediaEntry(p, 'dialog', 'menu', createDialog);
    dialog.config = {
      type: 'MULTI',
      actions: [
        { label: 'Other', action: { type: 'SHOW_DIALOG', dialog: dialogKey(other.dialogId) } },
        { label: 'Links', action: { type: 'SHOW_DIALOG', dialog: 'minecraft:server_links' } },
      ],
      exitAction: { label: 'Back', action: { type: 'SHOW_DIALOG', dialog: 'nexo:gone' } },
    };
    const issues = validateDialogs(p);
    expect(issues.map((i) => [i.code, i.level, i.args])).toEqual([
      ['dialog.showDialogNexo', 'warning', { dialog: 'nexo:other' }],
      ['dialog.unknownDialog', 'warning', { dialog: 'nexo:gone' }],
    ]);
  });
});

describe('stored dialogs and Nexo settings', () => {
  const roundTrip = (p: ReturnType<typeof project>) => migrateProject(JSON.parse(JSON.stringify(p)));

  it('read back unchanged, and projects without them keep their shape', () => {
    const p = project();
    const plain = roundTrip(p);
    expect(plain.dialogs).toEqual([]);
    expect(plain.settings).not.toHaveProperty('carpentryAddon');
    expect(plain.settings).not.toHaveProperty('multipack');
    addMediaEntry(p, 'dialog', 'Welcome', createDialog);
    p.settings.carpentryAddon = true;
    p.settings.multipack = { templates: { music: { default: true } } };
    const stored = roundTrip(p);
    expect(stored.dialogs).toEqual(p.dialogs);
    expect(stored.settings.carpentryAddon).toBe(true);
    expect(stored.settings.multipack).toEqual(p.settings.multipack);
  });

  it('drop damaged values without losing the rest', () => {
    const damaged = {
      ...project(),
      dialogs: [{ id: 'd_1', dialogId: 'ok', config: 'not a map' }, { id: 'd_2' }],
      settings: { ...project().settings, carpentryAddon: 'yes', multipack: 3 },
    };
    const stored = migrateProject(JSON.parse(JSON.stringify(damaged)));
    expect(stored.dialogs).toEqual([{ id: 'd_1', dialogId: 'ok', config: {} }]);
    expect(stored.settings).not.toHaveProperty('carpentryAddon');
    expect(stored.settings).not.toHaveProperty('multipack');
    expect(stored.settings.minecraftVersion).toBe('1.21.11');
  });
});
