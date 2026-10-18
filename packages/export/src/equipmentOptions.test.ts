/** Equipment layer options of armor sets (overlays, dyeable, player texture, baby layer) and CraftEngine's equipment types. */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  armorColorInt,
  type ArmorSettings,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type PackTargetId,
  type Project,
  toArmorSettings,
} from '@resourcepackbuilder/core/project';
import { createTexture } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from './plan';
import { pluginText } from '../test-utils/export';

const PNG = makePngDataUrl(64, 32);
const OVERLAY = makePngDataUrl(64, 32, [255, 0, 0, 255]);
const CE_EQUIPMENTS = 'resources/ruestung/configuration/equipments.yml';
/** The leather color as CraftEngine's wiki writes it */
const LEATHER = -6265536;

function project(target: PackTargetId, version = '1.21.11') {
  const p: Project = createProject('Rüstung', 'aus', version, target);
  const folder = createFolder('Teile', null);
  insertFolder(p, folder);
  const add = (itemId: string, material: string, armor: ArmorSettings) => {
    const item = createItem({ displayName: itemId, itemId, folderId: folder.id, material, model: null });
    item.assets = { tex: createTexture('tex', `${itemId}.png`, PNG), over: createTexture('over', `${itemId}_over.png`, OVERLAY) };
    item.armor = armor;
    insertItem(p, item);
  };
  return { project: p, add };
}

const model = (p: Project, set: string) => JSON.parse(planExport(p).packFiles.get(`assets/aus/equipment/${set}.json`) as string);
const codes = (p: Project) => planExport(p).issues.map((i) => i.code);

const DYED_RUBY: ArmorSettings = {
  set: 'ruby',
  layer1: '@asset:tex',
  layer2: '@asset:tex',
  overlays: { layer1: '@asset:over' },
  dyeable: true,
  color_when_undyed: '160, 101, 64',
};

describe('equipment layer options', () => {
  it('reads "R, G, B" colors as the signed ARGB integer of equipment models', () => {
    expect(armorColorInt('160, 101, 64')).toBe(LEATHER);
    expect(armorColorInt('0,0,0')).toBe(-16777216);
    expect(armorColorInt('300, 0, 0')).toBeNull();
    expect(armorColorInt('red')).toBeNull();
  });

  it('keeps the options when reading stored armor settings', () => {
    expect(toArmorSettings({ ...DYED_RUBY, use_player_texture: true, type: 'trim', humanoid_baby: '@asset:tex', junk: 1 })).toEqual({
      ...DYED_RUBY,
      use_player_texture: true,
      type: 'trim',
      humanoid_baby: '@asset:tex',
    });
  });

  it('writes dyeable layers with their undyed color and an undyed overlay texture', () => {
    const { project: p, add } = project('nexo');
    add('helm', 'CHAINMAIL_HELMET', DYED_RUBY);
    const plan = planExport(p);
    expect(plan.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(model(p, 'ruby')).toEqual({
      layers: {
        humanoid: [{ texture: 'aus:ruby', dyeable: { color_when_undyed: LEATHER } }, { texture: 'aus:ruby_overlay' }],
        humanoid_leggings: [{ texture: 'aus:ruby', dyeable: { color_when_undyed: LEATHER } }],
      },
    });
    expect(plan.packFiles.has('assets/aus/textures/entity/equipment/humanoid/ruby_overlay.png')).toBe(true);
  });

  it('writes dyeable layers without a color and wings with the player texture', () => {
    const { project: p, add } = project('nexo');
    add('helm', 'CHAINMAIL_HELMET', { set: 'blank', layer1: '@asset:tex', dyeable: true });
    add('wings', 'PAPER', { set: 'cape', elytra: '@asset:tex', use_player_texture: true });
    expect(model(p, 'blank')).toEqual({ layers: { humanoid: [{ texture: 'aus:blank', dyeable: {} }] } });
    expect(model(p, 'cape')).toEqual({ layers: { wings: [{ texture: 'aus:cape', use_player_texture: true }] } });
  });

  it('writes the baby layer from Minecraft 26.1 on', () => {
    const old = project('nexo');
    old.add('helm', 'CHAINMAIL_HELMET', { set: 'ruby', layer1: '@asset:tex', humanoid_baby: '@asset:tex' });
    expect(codes(old.project)).toContain('plan.armorLayerNeedsVersion');
    const current = project('nexo', '26.1');
    current.add('helm', 'CHAINMAIL_HELMET', { set: 'ruby', layer1: '@asset:tex', humanoid_baby: '@asset:tex' });
    expect(codes(current.project)).not.toContain('plan.armorLayerNeedsVersion');
    expect(Object.keys(model(current.project, 'ruby').layers)).toEqual(['humanoid', 'humanoid_baby']);
  });
});

describe('CraftEngine equipments with layer options', () => {
  it('writes the layer options and overlays into equipments.yml', () => {
    const { project: p, add } = project('craftengine');
    add('helm', 'CHAINMAIL_HELMET', DYED_RUBY);
    const yaml = parse(pluginText(planExport(p), CE_EQUIPMENTS));
    expect(yaml.equipments['aus:ruby']).toEqual({
      type: 'component',
      humanoid: [{ texture: 'aus:ruby', dyeable: { color_when_undyed: LEATHER } }, { texture: 'aus:ruby_overlay' }],
      humanoid_leggings: { texture: 'aus:ruby', dyeable: { color_when_undyed: LEATHER } },
    });
  });

  it('writes trim-based equipment with the player armor textures only', () => {
    const { project: p, add } = project('craftengine');
    add('helm', 'CHAINMAIL_HELMET', { ...DYED_RUBY, set: 'topaz', type: 'trim', mob: { wolf_armor: '@asset:tex' } });
    const plan = planExport(p);
    expect(plan.issues.map((i) => i.code)).toContain('ce.armorTrimLayers');
    expect(parse(pluginText(plan, CE_EQUIPMENTS)).equipments['aus:topaz']).toEqual({
      type: 'trim',
      humanoid: 'aus:entity/equipment/humanoid/topaz',
      humanoid_leggings: 'aus:entity/equipment/humanoid_leggings/topaz',
    });
  });

  it('leaves out the layers CraftEngine does not know', () => {
    const { project: p, add } = project('craftengine');
    add('sattel', 'SADDLE', { set: 'leder', saddles: { pig_saddle: '@asset:tex', nautilus_saddle: '@asset:tex' } });
    const plan = planExport(p);
    expect(plan.issues.map((i) => i.code)).toContain('ce.armorLayerUnsupported');
    expect(parse(pluginText(plan, CE_EQUIPMENTS)).equipments['aus:leder']).toEqual({ type: 'component', pig_saddle: 'aus:leder' });
  });
});
