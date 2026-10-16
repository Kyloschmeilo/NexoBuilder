import { describe, expect, it } from 'vitest';
import { createTextureModel } from '../model/textureModel';
import { createTexture } from '../model/textures';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import type { Item, Project } from '../project/types';
import { makePngDataUrl } from '../../test-utils/png';
import { COPY_CATEGORIES, copyItemConfig, pasteItemConfig, summarizeClipboard, type CopyCategory } from './copyConfig';
import { createRecipe } from './recipes/model';

const PNG16 = makePngDataUrl(16, 16);
const ALL = new Set<CopyCategory>(COPY_CATEGORIES.map((c) => c.id));

function setup(): { project: Project; source: Item; target: Item } {
  const project = createProject('Test', 'test');
  const folder = createFolder('Waffen', null);
  insertFolder(project, folder);
  const model = createTextureModel('handheld', { layer0: 'a.png' }, [{ name: 'a.png', dataUrl: PNG16 }]);
  const source = createItem({ displayName: '<red>Rubin', nexoId: 'ruby', folderId: folder.id, material: 'DIAMOND_SWORD', model });
  source.config.lore = ['<gray>Scharf'];
  source.config.Components = { max_stack_size: 1, food: { nutrition: 4 }, some_new_component: { x: 1 } };
  source.config.Mechanics = { custom_block: { type: 'NOTEBLOCK', custom_variation: 3, model: '@model' } };
  source.config.Pack = { custom_model_data: 1001, oversized_in_gui: true, texture: 'test:item/a' };
  source.armor = { set: 'ruby', layer1: '@asset:a1' };
  source.config.custom_root = 'x';
  source.assets = { a1: createTexture('a1', 'layer1.png', makePngDataUrl(64, 32)) };
  source.rawYaml = 'excludeFromInventory: true\n';
  source.recipes = [createRecipe('shaped', 'r1')];
  source.variants = { pulling_models: [] };
  insertItem(project, source);

  const target = createItem({ displayName: 'Saphir', nexoId: 'sapphire', folderId: folder.id, model: null });
  target.config.Enchantments = { sharpness: 1 };
  target.config.Components = { durability: 10 } as never;
  target.config.Pack = { custom_model_data: 2002, model: 'test:item/eigenes' };
  target.assets = { old: createTexture('old', 'old.png', PNG16) };
  insertItem(project, target);
  return { project, source, target };
}

describe('copy properties', () => {
  it('transfers the complete config except name, ID, model, folder and model data', () => {
    const { project, source, target } = setup();
    const clip = copyItemConfig(source, project.id);
    const folderBefore = target.folderId;
    pasteItemConfig(project, target, clip, { categories: new Set([...ALL].filter((c) => c !== 'recipes')), mode: 'replace' });

    expect(target.displayName).toBe('Saphir');
    expect(target.nexoId).toBe('sapphire');
    expect(target.model).toBeNull();
    expect(target.variants).toBeUndefined();
    expect(target.folderId).toBe(folderBefore);
    expect(target.config.material).toBe('DIAMOND_SWORD');
    expect(target.config.lore).toEqual(['<gray>Scharf']);
    // Replace: values only the target had are gone (durability, Enchantments)
    expect(target.config.Components).toEqual({ max_stack_size: 1, food: { nutrition: 4 }, some_new_component: { x: 1 } });
    expect(target.config.Enchantments).toBeUndefined();
    // Model data stays with the target
    expect(target.config.Pack).toEqual({ custom_model_data: 2002, model: 'test:item/eigenes', oversized_in_gui: true });
    expect(target.config.custom_root).toBe('x');
    expect(target.rawYaml).toBe('excludeFromInventory: true\n');
    expect(target.recipes).toEqual([]);
    // Armor settings and their texture are copied along, unused textures are dropped
    expect(target.armor).toEqual({ set: 'ruby', layer1: '@asset:a1' });
    expect(Object.keys(target.assets)).toEqual(['a1']);
  });

  it('assigns a free variation to custom blocks', () => {
    const { project, source, target } = setup();
    pasteItemConfig(project, target, copyItemConfig(source, project.id), { categories: ALL, mode: 'replace' });
    expect((target.config.Mechanics as Record<string, Record<string, unknown>>).custom_block.custom_variation).toBe(1);
    expect((source.config.Mechanics as Record<string, Record<string, unknown>>).custom_block.custom_variation).toBe(3);
  });

  it('only adds in "merge" mode and keeps existing values', () => {
    const { project, source, target } = setup();
    pasteItemConfig(project, target, copyItemConfig(source, project.id), {
      categories: new Set(['components', 'attributes']),
      mode: 'merge',
    });
    expect(target.config.Enchantments).toEqual({ sharpness: 1 });
    expect(target.config.Components).toEqual({ durability: 10, max_stack_size: 1, food: { nutrition: 4 } });
    expect(target.config.material).toBe('PAPER');
    expect(target.config.lore).toBeUndefined();
  });

  it('copies recipes only on request and with new IDs', () => {
    const { project, source, target } = setup();
    pasteItemConfig(project, target, copyItemConfig(source, project.id), { categories: new Set(['recipes']), mode: 'merge' });
    expect(target.recipes).toHaveLength(1);
    expect(target.recipes[0].id).not.toBe(source.recipes[0].id);
    expect(target.recipes[0].type).toBe('shaped');
  });

  it('does not change the source itself and the clipboard is independent of the original', () => {
    const { project, source, target } = setup();
    const clip = copyItemConfig(source, project.id);
    source.config.lore = ['geändert'];
    pasteItemConfig(project, target, clip, { categories: new Set(['general']), mode: 'replace' });
    expect(target.config.lore).toEqual(['<gray>Scharf']);
    const before = JSON.stringify(source);
    pasteItemConfig(project, source, clip, { categories: ALL, mode: 'replace' });
    expect(JSON.stringify(source)).toBe(before);
  });

  it('summarizes the clipboard contents per category', () => {
    const { project, source } = setup();
    const summary = Object.fromEntries(summarizeClipboard(copyItemConfig(source, project.id)).map((s) => [s.id, s.entries]));
    expect(summary.material).toEqual([{ text: 'DIAMOND_SWORD' }]);
    expect(summary.general.length).toBe(1);
    expect(summary.appearance.length).toBe(2); // oversized_in_gui + armor, not custom_model_data
    expect(summary.other).toEqual([{ text: 'custom_root' }, { text: 'Components.some_new_component' }]);
    expect(summary.recipes).toEqual([{ key: 'recipes.types.shaped.label' }]);
  });
});
