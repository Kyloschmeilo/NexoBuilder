import { describe, expect, it } from 'vitest';
import { createProject } from '../project/factory';
import { fieldMessageKeys } from '../form/messageKeys';
import { multipackFile, multipackTemplateIds, NEXO_MULTIPACK_FIELD, validateMultipack } from './multipack';

function project() {
  return createProject('Test', 'pack');
}

describe('multipack.yml', () => {
  it('is not written without templates or menu', () => {
    const p = project();
    expect(multipackFile(p)).toBeNull();
    p.settings.multipack = { templates: {}, menu: { title: '' } };
    expect(multipackFile(p)).toBeNull();
  });

  it('writes the templates and the menu, a single conflict as a string', () => {
    const p = project();
    p.settings.multipack = {
      templates: {
        '2d_tools': { required: false, default: true, conflicts_with: ['3d_tools'], path: '' },
        '3d_tools': { required: false, default: false, conflicts_with: ['2d_tools'] },
      },
      menu: {
        title: '<gold>Packs',
        rows: 3,
        slots: { tools: { offset: '5,2', action: { type: 'CYCLING', targets: ['2d_tools', '3d_tools'] } } },
      },
    };
    expect(multipackTemplateIds(p)).toEqual(['2d_tools', '3d_tools']);
    expect(multipackFile(p)).toBe(
      [
        'templates:',
        '  2d_tools:',
        '    required: false',
        '    default: true',
        '    conflicts_with: 3d_tools',
        '  3d_tools:',
        '    required: false',
        '    default: false',
        '    conflicts_with: 2d_tools',
        'menu:',
        '  title: "<gold>Packs"',
        '  rows: 3',
        '  slots:',
        '    tools:',
        '      offset: 5,2',
        '      action:',
        '        type: CYCLING',
        '        targets:',
        '          - 2d_tools',
        '          - 3d_tools',
        '',
      ].join('\n'),
    );
    expect(validateMultipack(p)).toEqual([]);
  });

  it('warns about unknown templates and slots outside the menu', () => {
    const p = project();
    p.settings.multipack = {
      templates: { music: { conflicts_with: 'loud' } },
      menu: {
        rows: 2,
        slots: {
          toggle: { offset: '3,3', action: { type: 'TOGGLE', target: 'musik' } },
          cycle: { offset: '1,1', action: { type: 'CYCLING', targets: [{ id: 'music' }, { id: 'quiet' }] } },
        },
      },
    };
    expect(validateMultipack(p).map((issue) => [issue.code, issue.args])).toEqual([
      ['multipack.unknownTemplate', { template: 'loud' }],
      ['multipack.unknownTemplate', { template: 'musik' }],
      ['multipack.slotOutside', { slot: 'toggle', rows: 2 }],
      ['multipack.unknownTemplate', { template: 'quiet' }],
    ]);
  });

  it('names every field of the editor with a well-formed message key', () => {
    const keys = fieldMessageKeys(NEXO_MULTIPACK_FIELD);
    expect(keys.filter((key) => !/^nexoMultipack(\.[A-Za-z0-9]+)+$/.test(key))).toEqual([]);
  });
});
