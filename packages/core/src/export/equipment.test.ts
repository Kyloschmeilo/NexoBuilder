import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { createTexture } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from './plan';
import type { ArmorSettings } from '../project/armor';
import type { Project } from '../project/types';

const PNG = makePngDataUrl(64, 32);

function project(version = '1.21.11'): { project: Project; add: (id: string, material: string, armor: ArmorSettings) => void } {
  const p = createProject('Ausrüstung', 'aus', version);
  const folder = createFolder('Teile', null);
  insertFolder(p, folder);
  const add = (id: string, material: string, armor: ArmorSettings) => {
    const item = createItem({ displayName: id, nexoId: id, folderId: folder.id, material, model: null });
    item.assets = { tex: createTexture('tex', `${id}.png`, PNG) };
    item.armor = armor;
    insertItem(p, item);
  };
  return { project: p, add };
}

const yamlOf = (p: Project) => parse(planExport(p).itemFiles.get('items/teile/teile.yml')!);

describe('Worn textures', () => {
  it('creates elytra wings with slot CHEST and glider component', () => {
    const { project: p, add } = project();
    add('fluegel', 'PAPER', { set: 'feuer_elytra', elytra: '@asset:tex' });
    const plan = planExport(p);
    expect(JSON.parse(plan.packFiles.get('assets/aus/equipment/feuer_elytra.json') as string)).toEqual({
      layers: { wings: [{ texture: 'aus:feuer_elytra' }] },
    });
    expect(plan.packFiles.has('assets/aus/textures/entity/equipment/wings/feuer_elytra.png')).toBe(true);
    const item = yamlOf(p).fluegel;
    expect(item.Components.equippable).toEqual({ slot: 'CHEST', asset_id: 'aus:feuer_elytra' });
    expect(item.Components.glider).toBe(true);
  });

  it('sets slot BODY and the allowed animals for animal armor', () => {
    const { project: p, add } = project();
    add('teppich', 'PAPER', { set: 'bunt', mob: { llama_armor: '@asset:tex' } });
    add('wolfspanzer', 'WOLF_ARMOR', { set: 'wolf', mob: { wolf_armor: '@asset:tex' } });
    const plan = planExport(p);
    expect(plan.packFiles.has('assets/aus/textures/entity/equipment/llama_body/bunt.png')).toBe(true);
    const yaml = yamlOf(p);
    expect(yaml.teppich.Components.equippable).toEqual({
      slot: 'BODY',
      asset_id: 'aus:bunt',
      allowed_entity_types: ['LLAMA', 'TRADER_LLAMA'],
    });
    expect(yaml.wolfspanzer.Components.equippable).toEqual({ slot: 'BODY', asset_id: 'aus:wolf', allowed_entity_types: ['WOLF'] });
    expect(yaml.teppich.Components.glider).toBeUndefined();
  });

  it('creates saddles for multiple animals', () => {
    const { project: p, add } = project();
    add('sattel', 'SADDLE', { set: 'leder', saddles: { pig_saddle: '@asset:tex', horse_saddle: '@asset:tex' } });
    const plan = planExport(p);
    const equipment = JSON.parse(plan.packFiles.get('assets/aus/equipment/leder.json') as string);
    expect(Object.keys(equipment.layers).sort()).toEqual(['horse_saddle', 'pig_saddle']);
    expect(yamlOf(p).sattel.Components.equippable).toEqual({
      slot: 'SADDLE',
      asset_id: 'aus:leder',
      allowed_entity_types: ['PIG', 'HORSE'],
    });
  });

  it('reports layers that do not exist yet in the target version', () => {
    const { project: p, add } = project('1.21.4');
    add('geschirr', 'PAPER', { set: 'ghast', mob: { harness: '@asset:tex' } });
    expect(
      planExport(p).issues.some((i) => i.level === 'error' && i.code === 'plan.armorLayerNeedsVersion' && i.args?.version === '1.21.6'),
    ).toBe(true);
  });

  it('leaves player armor as before', () => {
    const { project: p, add } = project();
    add('helm', 'IRON_HELMET', { set: 'rubin', layer1: '@asset:tex', layer2: '@asset:tex' });
    const plan = planExport(p);
    expect(JSON.parse(plan.packFiles.get('assets/aus/equipment/rubin.json') as string)).toEqual({
      layers: { humanoid: [{ texture: 'aus:rubin' }], humanoid_leggings: [{ texture: 'aus:rubin' }] },
    });
    expect(yamlOf(p).helm.Components.equippable).toEqual({ slot: 'HEAD', asset_id: 'aus:rubin' });
  });
});
