import { describe, expect, it } from 'vitest';
import { ENTITY_DIRS, isShareFilePath, readProjectInfo } from './format';

describe('shared folder files', () => {
  it.each(['project.json', 'README.txt', 'items/i_abc.json', 'paintings/p-1.json', ...ENTITY_DIRS.map((dir) => `${dir}/x.json`)])(
    'accepts %s',
    (path) => {
      expect(isShareFilePath(path)).toBe(true);
    },
  );

  it.each(['../project.json', 'items/a b.json', 'items/x (1).json', 'other/x.json', 'items/x.json/y', 'readme.txt'])(
    'refuses %s',
    (path) => {
      expect(isShareFilePath(path)).toBe(false);
    },
  );

  it('reads id and name from project.json', () => {
    const text = JSON.stringify({ format: 'resourcepackbuilder-share', version: 1, kind: 'project', data: { id: 'p1', name: 'Pack' } });
    expect(readProjectInfo(text)).toEqual({ id: 'p1', name: 'Pack' });
    expect(readProjectInfo(JSON.stringify({ format: 'resourcepackbuilder-share', data: { id: 'p1' } }))).toEqual({ id: 'p1', name: '' });
  });

  it('returns null for other files', () => {
    expect(readProjectInfo('{')).toBeNull();
    expect(readProjectInfo(JSON.stringify({ format: 'other', data: { id: 'p1' } }))).toBeNull();
    expect(readProjectInfo(JSON.stringify({ format: 'resourcepackbuilder-share', data: { id: 1 } }))).toBeNull();
  });
});
