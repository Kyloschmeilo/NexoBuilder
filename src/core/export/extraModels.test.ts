import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { createTextureModel } from '../model/textureModel';
import { makePngDataUrl } from '../../test/png';
import { planExport } from './plan';
import type { ImportedModel, Project } from '../types';

const PNG16 = makePngDataUrl(16, 16);
const model = (name: string): ImportedModel => createTextureModel('generated', { layer0: `${name}.png` }, [{ name: `${name}.png`, dataUrl: PNG16 }]);

function furnitureProject(): Project {
  const project = createProject('Möbel', 'moebel', '1.21.11');
  const folder = createFolder('Sofas', null);
  insertFolder(project, folder);
  const sofa = createItem({ displayName: 'Sofa', nexoId: 'sofa', folderId: folder.id, model: model('sofa') });
  sofa.config.Mechanics = { furniture: { hitbox: { barriers: ['0,0,0'] }, states: { an: {}, kaputt: { type: 'CUSTOM_MODEL_DATA', value: '5' } } } };
  sofa.variants = {
    connect_straight: [model('straight')],
    connect_left: [model('left')],
    connect_right: [model('right')],
    connect_inner: [model('inner')],
    connect_outer: [model('outer')],
    placement_wall: [model('wall')],
    light_on: [model('licht')],
    'state:an': [model('an')],
    'state:kaputt': [model('kaputt')],
    gui_model: [model('icon')],
  };
  insertItem(project, sofa);
  return project;
}

const readJson = (plan: ReturnType<typeof planExport>, path: string) => JSON.parse(plan.packFiles.get(path) as string);

describe('Zusätzliche Modelle', () => {
  it('erzeugt ein ItemModel für verbindbare Möbel mit Inventar-Symbol', () => {
    const plan = planExport(furnitureProject());
    const def = readJson(plan, 'assets/moebel/items/sofas/sofa.json');
    expect(def.model.type).toBe('minecraft:select');
    expect(def.model.property).toBe('minecraft:display_context');
    expect(def.model.cases[0]).toEqual({ when: 'gui', model: { type: 'minecraft:model', model: 'moebel:item/sofas/sofa-gui' } });
    const connect = def.model.fallback;
    expect(connect).toMatchObject({ type: 'minecraft:select', property: 'minecraft:block_state', block_state_property: 'connectable' });
    expect(connect.cases.map((c: { when: string }) => c.when)).toEqual(['straight', 'left', 'right', 'inner', 'outer']);
    expect(connect.cases[1].model.model).toBe('moebel:item/sofas/sofa-left');
    expect(connect.fallback).toEqual({ type: 'minecraft:model', model: 'moebel:item/sofas/sofa' });
    expect(plan.packFiles.has('assets/moebel/models/item/sofas/sofa-outer.json')).toBe(true);
    expect(plan.packFiles.has('assets/moebel/textures/item/sofas/sofa-outer/outer.png')).toBe(true);

    const yaml = parse(plan.itemFiles.get('items/sofas/sofas.yml')!).sofa;
    expect(yaml.Components.item_model).toBe('moebel:sofas/sofa');
    expect(yaml.Pack.model).toBe('moebel:item/sofas/sofa');
    expect(yaml.Mechanics.furniture.connectable).toEqual({ type: 'ITEM_MODEL' });
    expect(yaml.Mechanics.furniture.placements).toEqual({ wall: { item_model: 'moebel:sofas/sofa-placement_wall' } });
    expect(yaml.Mechanics.furniture.lights).toEqual({ toggled_item_model: 'moebel:sofas/sofa-light_on', toggleable: true });
    expect(yaml.Mechanics.furniture.states.an).toEqual({ type: 'ITEM_MODEL', item_model: 'moebel:sofas/sofa-state_an' });
    // Zustand mit anderem Typ behält seine Werte, das Modell wird nicht verwendet
    expect(yaml.Mechanics.furniture.states.kaputt).toEqual({ type: 'CUSTOM_MODEL_DATA', value: '5' });
    expect(plan.packFiles.has('assets/moebel/items/sofas/sofa-state_kaputt.json')).toBe(false);
    expect(plan.issues.some((i) => i.message.includes('kaputt') && i.level === 'warning')).toBe(true);
    expect(readJson(plan, 'assets/moebel/items/sofas/sofa-placement_wall.json')).toEqual({
      model: { type: 'minecraft:model', model: 'moebel:item/sofas/sofa-placement_wall' },
    });
    expect(plan.issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('lässt eigene Werte des Nutzers stehen', () => {
    const project = furnitureProject();
    const sofa = Object.values(project.items)[0];
    (sofa.config.Mechanics as Record<string, Record<string, unknown>>).furniture.placements = { wall: { item_model: 'eigenes:modell', properties: { translation: '0,0.3,-0.3' } } };
    const yaml = parse(planExport(project).itemFiles.get('items/sofas/sofas.yml')!).sofa;
    expect(yaml.Mechanics.furniture.placements.wall).toEqual({ item_model: 'eigenes:modell', properties: { translation: '0,0.3,-0.3' } });
  });

  it('meldet Möbel-Modelle ohne Möbel-Mechanik und zu alte Versionen', () => {
    const project = furnitureProject();
    project.settings.minecraftVersion = '1.21.1';
    const sofa = Object.values(project.items)[0];
    sofa.config.Mechanics = {};
    const plan = planExport(project);
    expect(plan.issues.some((i) => i.message.includes('Mechanic „Furniture“ fehlt'))).toBe(true);
    expect(plan.issues.some((i) => i.level === 'error' && i.message.includes('1.21.4'))).toBe(true);
    expect(plan.packFiles.has('assets/moebel/models/item/sofas/sofa-left.json')).toBe(false);
  });

  it('schreibt Stapel-Stufen für StringBlocks', () => {
    const project = createProject('Blöcke', 'bl', '1.21.11');
    const folder = createFolder('Pflanzen', null);
    insertFolder(project, folder);
    const flower = createItem({ displayName: 'Blume', nexoId: 'blume', folderId: folder.id, model: model('blume') });
    flower.config.Mechanics = { custom_block: { type: 'STRINGBLOCK', model: '@model' } };
    flower.variants = { stack_models: [model('s1'), model('s2')] };
    insertItem(project, flower);
    const plan = planExport(project);
    const yaml = parse(plan.itemFiles.get('items/pflanzen/pflanzen.yml')!).blume;
    expect(yaml.Mechanics.custom_block.stackable).toEqual([{ model: 'bl:block/pflanzen/blume-stack_1' }, { model: 'bl:block/pflanzen/blume-stack_2' }]);
    expect(plan.packFiles.has('assets/bl/models/block/pflanzen/blume-stack_2.json')).toBe(true);
  });

  it('gibt dem Dreizack ein Wurf-Modell über Pack.throwing_model', () => {
    const project = createProject('Waffen', 'wf', '1.21.11');
    const folder = createFolder('Dreizacke', null);
    insertFolder(project, folder);
    const trident = createItem({ displayName: 'Dreizack', nexoId: 'dreizack', folderId: folder.id, material: 'TRIDENT', model: model('d') });
    trident.variants = { throwing_model: [model('wurf')] };
    insertItem(project, trident);
    const yaml = parse(planExport(project).itemFiles.get('items/dreizacke/dreizacke.yml')!).dreizack;
    expect(yaml.Pack.throwing_model).toBe('wf:item/dreizacke/dreizack-throwing');
  });
});
