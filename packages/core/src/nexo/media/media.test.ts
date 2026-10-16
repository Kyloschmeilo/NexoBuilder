import { describe, expect, it } from 'vitest';
import { createProject } from '../../project/factory';
import { insertNewItem } from '../../project/operations';
import { createGlyph } from '../glyphs/model';
import { createPainting } from '../paintings/model';
import { createSound, setSoundJukebox } from '../sounds/model';
import { makePngDataUrl } from '../../../test-utils/png';
import { pngMediaFile } from './entry';
import { musicDiscItem, paintingItem } from './items';
import { addMediaEntry, deleteMediaEntry, findMediaEntry } from './operations';

describe('media operations', () => {
  it('adds entries with unique IDs derived from the name', () => {
    const project = createProject('Test');
    const first = addMediaEntry(project, 'glyph', 'Happy Face', (id, glyphId) => createGlyph(id, glyphId, null));
    const second = addMediaEntry(project, 'glyph', 'happy face', (id, glyphId) => createGlyph(id, glyphId, null));
    expect([first.glyphId, second.glyphId]).toEqual(['happy_face', 'happy_face_2']);
    expect(first.id).toMatch(/^g_/);
    expect(project.glyphs).toHaveLength(2);
  });

  it('keeps dots and dashes in sound IDs', () => {
    const project = createProject('Test');
    const sound = addMediaEntry(project, 'sound', 'Block.Ruby-Place', (id, soundId) => createSound(id, soundId, []));
    expect(sound.soundId).toBe('block.ruby-place');
  });

  it('finds and deletes entries by internal ID', () => {
    const project = createProject('Test');
    const painting = addMediaEntry(project, 'painting', 'Sunset', (id, paintingId) => createPainting(id, paintingId, null));
    expect(findMediaEntry(project, 'painting', painting.id)).toBe(painting);
    deleteMediaEntry(project, 'painting', painting.id);
    expect(project.paintings).toEqual([]);
    expect(findMediaEntry(project, 'painting', painting.id)).toBeUndefined();
  });
});

describe('media items', () => {
  it('creates a painting item that hangs the painting', () => {
    const project = createProject('Test', 'pack');
    const painting = { ...createPainting('p_1', 'sunset', null), title: 'Sunset' };
    const input = paintingItem(project, painting);
    expect(input).toMatchObject({ displayName: 'Sunset', nexoId: 'sunset', material: 'PAINTING' });
    const folderId = 'f';
    project.folders[folderId] = { id: folderId, name: 'F', parentId: null, folderIds: [], itemIds: [] };
    const item = insertNewItem(project, { ...input, folderId, model: null }, input.configure);
    expect(item.config.Components).toEqual({ painting_variant: 'pack:sunset' });
  });

  it('creates a music disc that plays the sound', () => {
    const project = createProject('Test', 'pack');
    const sound = createSound('s_1', 'music.theme', []);
    setSoundJukebox(sound, true);
    expect(sound.stream).toBe(true);
    const input = musicDiscItem(project, sound);
    expect(input.nexoId).toBe('music_theme_disc');
    expect(input.displayName).toBe('music.theme');
    const item = insertNewItem(project, { ...input, folderId: 'none', model: null }, input.configure);
    expect(item.config.Components).toEqual({ max_stack_size: 1, jukebox_playable: { song_key: 'pack:music.theme' } });
    setSoundJukebox(sound, false);
    expect(sound.jukebox).toBeNull();
  });
});

describe('media files', () => {
  it('reads the size of a PNG and rejects other data', () => {
    expect(pngMediaFile('a.png', makePngDataUrl(32, 16))).toMatchObject({ name: 'a.png', width: 32, height: 16 });
    expect(pngMediaFile('a.png', 'data:image/png;base64,AAAA')).toBeNull();
  });
});
