import { describe, expect, it } from 'vitest';
import type { DroppedFile } from '@resourcepackbuilder/core/model/textures';
import { initialNewItemState, newItemReducer, sourceKey, type NewItemAction, type NewItemState } from './newItemState';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const png = (name: string): DroppedFile => ({ name, dataUrl: PIXEL });

function run(...actions: NewItemAction[]): NewItemState {
  return actions.reduce(newItemReducer, initialNewItemState(false));
}

describe('newItemReducer', () => {
  it('lets the ID follow the display name until it is edited', () => {
    let state = run({ type: 'withoutModelChanged', isWithoutModel: true }, { type: 'metaChanged', sourceKey: null, patch: { displayName: '<red>Ruby Sword' } });
    expect(state.plainMeta.nexoId).toBe('ruby_sword');
    state = newItemReducer(state, { type: 'metaChanged', sourceKey: null, patch: { nexoId: 'gem_blade' } });
    state = newItemReducer(state, { type: 'metaChanged', sourceKey: null, patch: { displayName: 'Other' } });
    expect(state.plainMeta).toMatchObject({ displayName: 'Other', nexoId: 'gem_blade', isIdEdited: true });
  });

  it('keeps entered values when more files are added', () => {
    let state = run({ type: 'readStarted' }, { type: 'filesRead', files: [png('ruby.png')] });
    const [draft] = state.drafts;
    state = newItemReducer(state, { type: 'metaChanged', sourceKey: sourceKey(draft), patch: { displayName: 'Ruby' } });
    state = newItemReducer(state, { type: 'readStarted' });
    state = newItemReducer(state, { type: 'filesRead', files: [png('emerald.png')] });
    expect(state.metaBySource[sourceKey(draft)]?.displayName).toBe('Ruby');
    expect(state.pendingReads).toBe(0);
  });

  it('drops a removed draft together with its own files', () => {
    let state = run(
      { type: 'readStarted' },
      { type: 'filesRead', files: [png('ruby.png'), png('emerald.png')] },
      { type: 'pngModeChanged', pngMode: 'separate' },
    );
    expect(state.drafts).toHaveLength(2);
    const removed = state.drafts[0];
    state = newItemReducer(state, { type: 'draftRemoved', draftKey: removed.key });
    expect(state.drafts).toHaveLength(1);
    expect(state.files.map((f) => f.name)).not.toContain(removed.files[0].name);
    expect(state.metaBySource[sourceKey(removed)]).toBeUndefined();
  });
});
