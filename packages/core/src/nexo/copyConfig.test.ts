import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { createTextureModel } from '../model/textureModel';
import { createTexture } from '../model/textures';
import { makePngDataUrl } from '../test/png';
import { createRecipe } from './recipes';
import { COPY_CATEGORIES, copyItemConfig, pasteItemConfig, summarizeClipboard, type CopyCategory } from './copyConfig';
import type { Item, Project } from '../types';

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
  source.config.$armor = { set: 'ruby', layer1: '@asset:a1' };
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

describe('Eigenschaften kopieren', () => {
  it('überträgt die komplette Konfiguration außer Name, ID, Modell, Ordner und Modell-Daten', () => {
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
    // Ersetzen: Werte, die nur das Ziel hatte, sind weg (durability, Enchantments)
    expect(target.config.Components).toEqual({ max_stack_size: 1, food: { nutrition: 4 }, some_new_component: { x: 1 } });
    expect(target.config.Enchantments).toBeUndefined();
    // Modell-Daten bleiben beim Ziel
    expect(target.config.Pack).toEqual({ custom_model_data: 2002, model: 'test:item/eigenes', oversized_in_gui: true });
    expect(target.config.custom_root).toBe('x');
    expect(target.rawYaml).toBe('excludeFromInventory: true\n');
    expect(target.recipes).toEqual([]);
    // Rüstungs-Textur wird mitkopiert, nicht mehr benutzte Texturen fliegen raus
    expect(Object.keys(target.assets)).toEqual(['a1']);
  });

  it('vergibt für eigene Blöcke eine freie Variation', () => {
    const { project, source, target } = setup();
    pasteItemConfig(project, target, copyItemConfig(source, project.id), { categories: ALL, mode: 'replace' });
    expect((target.config.Mechanics as Record<string, Record<string, unknown>>).custom_block.custom_variation).toBe(1);
    expect((source.config.Mechanics as Record<string, Record<string, unknown>>).custom_block.custom_variation).toBe(3);
  });

  it('ergänzt im Modus „merge“ nur und lässt eigene Werte stehen', () => {
    const { project, source, target } = setup();
    pasteItemConfig(project, target, copyItemConfig(source, project.id), { categories: new Set(['components', 'attributes']), mode: 'merge' });
    expect(target.config.Enchantments).toEqual({ sharpness: 1 });
    expect(target.config.Components).toEqual({ durability: 10, max_stack_size: 1, food: { nutrition: 4 } });
    expect(target.config.material).toBe('PAPER');
    expect(target.config.lore).toBeUndefined();
  });

  it('kopiert Rezepte nur auf Wunsch und mit neuen IDs', () => {
    const { project, source, target } = setup();
    pasteItemConfig(project, target, copyItemConfig(source, project.id), { categories: new Set(['recipes']), mode: 'merge' });
    expect(target.recipes).toHaveLength(1);
    expect(target.recipes[0].id).not.toBe(source.recipes[0].id);
    expect(target.recipes[0].type).toBe('shaped');
  });

  it('ändert die Quelle selbst nicht und die Zwischenablage ist unabhängig vom Original', () => {
    const { project, source, target } = setup();
    const clip = copyItemConfig(source, project.id);
    source.config.lore = ['geändert'];
    pasteItemConfig(project, target, clip, { categories: new Set(['general']), mode: 'replace' });
    expect(target.config.lore).toEqual(['<gray>Scharf']);
    const before = JSON.stringify(source);
    pasteItemConfig(project, source, clip, { categories: ALL, mode: 'replace' });
    expect(JSON.stringify(source)).toBe(before);
  });

  it('fasst den Inhalt der Zwischenablage je Kategorie zusammen', () => {
    const { project, source } = setup();
    const summary = Object.fromEntries(summarizeClipboard(copyItemConfig(source, project.id)).map((s) => [s.id, s.entries]));
    expect(summary.material).toEqual(['DIAMOND_SWORD']);
    expect(summary.general.length).toBe(1);
    expect(summary.appearance.length).toBe(2); // oversized_in_gui + Rüstung, nicht custom_model_data
    expect(summary.other).toEqual(['custom_root', 'Components.some_new_component']);
    expect(summary.recipes).toEqual(['shaped']);
  });
});
