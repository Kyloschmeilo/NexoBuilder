/** Small shared helpers: text, identifiers, versions, MiniMessage, folder tree. */
import { describe, expect, it } from 'vitest';
import { validateItemIds } from './export/validate/project';
import { gradientColorAt, parseMiniMessage } from './miniMessage';
import { itemIdSyntaxError, namespaceError, sanitizeId } from './minecraft/resourceLocation';
import { compareVersions, versionSupport } from './minecraft/versions';
import { referencedAssetIds } from './project/assets';
import { createFolder, createItem, createProject, insertFolder, insertItem } from './project/factory';
import { uniqueId, uniqueNexoId, validateItemId } from './project/ids';
import { itemLabel } from './project/labels';
import { getDescendantFolderIds, getItemsInTreeOrder } from './project/tree';
import { prettyNameFromFile, slugify, stripFormatting } from './text';

describe('text', () => {
  it('slugifies names into identifiers', () => {
    expect(slugify('<red>Größtes Schwert!')).toBe('groesstes_schwert');
    expect(slugify('***', 'folder')).toBe('folder');
    expect(stripFormatting('&a<bold>Hi</bold> ')).toBe('Hi');
    expect(prettyNameFromFile('ruby_sword-2.bbmodel')).toBe('Ruby Sword 2');
  });
});

describe('identifiers', () => {
  it('sanitizes namespace-style IDs', () => {
    expect(sanitizeId('Block.Ruby Place!', 'sound')).toBe('block.ruby_place');
    expect(sanitizeId('!!', 'sound')).toBe('sound');
  });

  it('classifies namespaces and item IDs', () => {
    expect(namespaceError('mein-pack')).toBeNull();
    expect(namespaceError('Mein Pack')).toBe('invalid');
    expect(namespaceError('minecraft')).toBe('minecraft');
    expect(namespaceError('nexo')).toBe('nexo');
    expect(itemIdSyntaxError('')).toBe('missing');
    expect(itemIdSyntaxError('Ruby')).toBe('invalid');
    expect(itemIdSyntaxError('ruby_2')).toBeNull();
  });

  it('finds free and duplicate item IDs', () => {
    const project = createProject('Test');
    const folder = createFolder('A', null);
    insertFolder(project, folder);
    const sword = createItem({ displayName: '<red>Schwert', nexoId: 'sword', folderId: folder.id, model: null });
    insertItem(project, sword);
    expect(uniqueId('a', new Set(['a', 'a_2']))).toBe('a_3');
    expect(uniqueNexoId(project, 'Sword')).toBe('sword_2');
    expect(uniqueNexoId(project, 'Sword', sword.id)).toBe('sword');
    expect(validateItemId(project, 'sword')).toEqual({ kind: 'duplicate', other: sword });
    expect(validateItemId(project, 'sword', sword.id)).toBeNull();
    expect(validateItemId(project, '')).toEqual({ kind: 'missing' });
    expect(itemLabel(sword)).toBe('Schwert');
  });

  it('reports an empty item ID only as missing, not also as duplicate', () => {
    const project = createProject('Test');
    const folder = createFolder('A', null);
    insertFolder(project, folder);
    insertItem(project, createItem({ displayName: 'A', nexoId: '', folderId: folder.id, model: null }));
    insertItem(project, createItem({ displayName: 'B', nexoId: '', folderId: folder.id, model: null }));
    expect(validateItemIds(getItemsInTreeOrder(project)).map((i) => i.code)).toEqual(['plan.itemIdMissing', 'plan.itemIdMissing']);
  });
});

describe('versions', () => {
  it('compares versions and checks support ranges', () => {
    expect(compareVersions('1.21.11', '1.21.4')).toBe(1);
    expect(compareVersions('26.1', '26.1.0')).toBe(0);
    expect(versionSupport('1.21.4', { minVersion: '1.21.5' })).toBe('tooOld');
    expect(versionSupport('26.3', { maxVersion: '1.21.11' })).toBe('removed');
    expect(versionSupport('1.21.11', { minVersion: '1.21.4', maxVersion: '26.3' })).toBe('supported');
  });
});

describe('MiniMessage', () => {
  it('parses colors, decorations, legacy codes and closing tags', () => {
    expect(parseMiniMessage('<red>Rot<bold>Fett</bold></red>&aGrün')).toEqual([
      { text: 'Rot', style: { color: '#FF5555', gradient: undefined, rainbow: false } },
      { text: 'Fett', style: { color: '#FF5555', gradient: undefined, rainbow: false, bold: true } },
      { text: 'Grün', style: { color: '#55FF55', gradient: undefined, rainbow: false } },
    ]);
    expect(parseMiniMessage('<glyph:herz>x')).toEqual([{ text: 'x', style: {} }]);
    expect(gradientColorAt(['#000000', '#ffffff'], 0.5)).toBe('#808080');
  });
});

describe('folder tree', () => {
  it('survives folder cycles', () => {
    const project = createProject('Kreis');
    const a = createFolder('A', null);
    const b = createFolder('B', a.id);
    insertFolder(project, a);
    insertFolder(project, b);
    project.folders[b.id].folderIds.push(a.id);
    insertItem(project, createItem({ displayName: 'x', nexoId: 'x', folderId: b.id, model: null }));
    expect(getDescendantFolderIds(project, a.id)).toEqual([a.id, b.id]);
    expect(getItemsInTreeOrder(project).map((i) => i.nexoId)).toEqual(['x']);
  });

  it('collects asset references from config and armor', () => {
    const item = createItem({ displayName: 'x', nexoId: 'x', folderId: 'f', model: null });
    item.config.Pack = { texture: '@asset:t1' };
    item.armor = { set: 'x', layer1: '@asset:t2' };
    expect([...referencedAssetIds(item)].sort()).toEqual(['t1', 't2']);
  });
});
