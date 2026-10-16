import { describe, expect, it } from 'vitest';
import type { ImportedModel, JavaModelJson, ModelTexture } from '@resourcepackbuilder/minecraft';
import { buildPreviewModel } from './modelGeometry';

const texture: ModelTexture = { id: 't0', name: 'ruby', dataUrl: 'data:image/png;base64,AAAA', width: 16, height: 16, mcmeta: null };

function model(json: JavaModelJson): ImportedModel {
  return { source: 'json', fileName: 'm.json', json, textures: [texture], issues: [] };
}

describe('buildPreviewModel', () => {
  it('draws generated items as one plane per layer', () => {
    const preview = buildPreviewModel(model({ parent: 'minecraft:item/handheld', textures: { layer0: '$tex:t0', layer1: 'item/stick' } }));
    expect(preview.kind).toBe('generated');
    expect(preview.elements).toHaveLength(2);
    expect(preview.elements[0].faces[0]).toMatchObject({ texture, unresolved: null, doubleSided: true });
    expect(preview.elements[1].faces[0]).toMatchObject({ texture: null, unresolved: 'item/stick' });
  });

  it('builds the elements of known vanilla block parents', () => {
    const preview = buildPreviewModel(model({ parent: 'block/cube_column', textures: { end: '$tex:t0', side: '#end' } }));
    expect(preview.kind).toBe('elements');
    expect(preview.elements).toHaveLength(1);
    expect(preview.elements[0].faces).toHaveLength(6);
    expect(preview.elements[0].faces.every((f) => f.texture === texture)).toBe(true);
  });

  it('explains why nothing can be shown', () => {
    expect(buildPreviewModel(model({ parent: 'minecraft:block/stairs' })).note).toEqual({
      code: 'vanillaParent',
      args: { parent: 'minecraft:block/stairs' },
    });
    expect(buildPreviewModel(model({ textures: { a: '$tex:t0' } })).note).toEqual({ code: 'noElements' });
    expect(buildPreviewModel(model({ parent: 'item/generated' })).note).toEqual({ code: 'noLayer0' });
  });

  it('reports cyclic and undefined texture references as unresolved', () => {
    const preview = buildPreviewModel(
      model({
        textures: { a: '#b', b: '#a' },
        elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces: { north: { texture: '#a' }, south: { texture: '#none' } } }],
      }),
    );
    const unresolved = preview.elements[0].faces.map((f) => f.unresolved);
    expect(unresolved).toEqual(['#none', '#a']);
  });
});
