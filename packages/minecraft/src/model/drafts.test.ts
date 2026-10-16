import { describe, expect, it } from 'vitest';
import { CoreError } from '@resourcepackbuilder/utils';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { createDrafts, runDraft, unsupportedFiles } from './drafts';

const PNG = makePngDataUrl(16, 16);
const png = (name: string) => ({ name, dataUrl: PNG });
const json = (name: string, value: unknown) => ({ name, text: JSON.stringify(value) });

describe('import drafts', () => {
  it('makes one draft per .bbmodel and passes the PNGs along', () => {
    const bbmodel = { name: 'ruby_sword.bbmodel', text: JSON.stringify({ elements: [], textures: [{ name: 'ruby.png' }] }) };
    const drafts = createDrafts([bbmodel, png('ruby.png')]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ kind: 'bbmodel', name: 'Ruby Sword', error: null });
    expect(drafts[0].model?.textures).toHaveLength(0);
  });

  it('groups JSON models linked via parent and matches their textures', () => {
    const files = [
      json('chair.json', { parent: 'mypack:item/chair_base', textures: { seat: 'mypack:item/wood' } }),
      json('chair_base.json', { parent: 'item/generated' }),
      json('lamp.json', { parent: 'item/generated', textures: { layer0: 'mypack:item/lamp' } }),
      png('wood.png'),
      png('lamp.png'),
    ];
    const drafts = createDrafts(files);
    expect(drafts.map((d) => d.name)).toEqual(['Chair', 'Lamp']);
    expect(drafts[0].files.map((f) => f.name)).toEqual(['chair.json', 'chair_base.json', 'wood.png']);
    expect(drafts[1].files.map((f) => f.name)).toEqual(['lamp.json', 'lamp.png']);
  });

  it('combines PNGs with a common name into one block model', () => {
    const drafts = createDrafts([png('log_end.png'), png('log_side.png')]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      kind: 'png',
      name: 'Log',
      template: 'cube_column',
      assignment: { end: 'log_end.png', side: 'log_side.png' },
    });
  });

  it('keeps unrelated PNGs separate unless asked to combine them', () => {
    expect(createDrafts([png('apple.png'), png('sword.png')]).map((d) => d.name)).toEqual(['Apple', 'Sword']);
    expect(createDrafts([png('apple.png'), png('sword.png')], 'combined')).toHaveLength(1);
  });

  it('keeps a conversion error as CoreError', () => {
    const draft = runDraft({ kind: 'json', files: [json('broken.json', [])], name: 'Broken' });
    expect(draft.model).toBeNull();
    expect(draft.error).toBeInstanceOf(CoreError);
    expect(draft.error?.code).toBe('model.notMinecraftModel');
  });

  it('lists files no importer can use', () => {
    expect(
      unsupportedFiles([png('a.png'), { name: 'a.png.mcmeta', text: '{}' }, { name: 'notes.txt', text: '' }]).map((f) => f.name),
    ).toEqual(['notes.txt']);
  });
});
