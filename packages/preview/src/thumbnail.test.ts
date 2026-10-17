import { describe, expect, it } from 'vitest';
import type { ImportedModel, ModelTexture } from '@resourcepackbuilder/minecraft';
import { cachedThumbnail, renderThumbnail } from './thumbnail';

const texture: ModelTexture = { id: 't0', name: 'ruby', dataUrl: 'data:image/png;base64,AAAA', width: 16, height: 16, mcmeta: null };

describe('renderThumbnail', () => {
  it('does not cache "nothing to show" for a model it could not render for want of WebGL', async () => {
    // The test environment has no WebGL, so no renderer can be created
    const model: ImportedModel = {
      source: 'json',
      fileName: 'm.json',
      json: { parent: 'block/cube_all', textures: { all: '$tex:t0' } },
      textures: [texture],
      issues: [],
    };
    expect(await renderThumbnail(model)).toBeNull();
    expect(cachedThumbnail(model)).toBeUndefined();
  });

  it('caches the thumbnail of a model that has nothing to show', async () => {
    const model: ImportedModel = {
      source: 'json',
      fileName: 'e.json',
      json: { textures: { a: '$tex:t0' } },
      textures: [texture],
      issues: [],
    };
    expect(await renderThumbnail(model)).toBeNull();
    expect(cachedThumbnail(model)).toBeNull();
  });
});
