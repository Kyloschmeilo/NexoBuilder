import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parse } from 'yaml';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { createTextureModel } from '../model/textureModel';
import { convertBBModel } from '../model/bbmodel';
import { planExport } from './plan';
import { INSTALL_GUIDE_FILE } from './installGuide';
import { buildMultiExportZip } from './zip';
import { singleExport } from '../test/export';
import { createTexture } from '../model/textures';
import { makePngDataUrl } from '../test/png';
import type { Project } from '../project/types';

const PNG16 = makePngDataUrl(16, 16);
const PNG64x32 = makePngDataUrl(64, 32);

function sampleBBModel(): string {
  return JSON.stringify({
    meta: { format_version: '5.0', model_format: 'java_block', box_uv: false },
    name: 'table',
    resolution: { width: 16, height: 16 },
    elements: [
      {
        name: 'top',
        from: [0, 12, 0],
        to: [16, 14, 16],
        origin: [8, 8, 8],
        faces: {
          north: { uv: [0, 0, 16, 2], texture: 0 },
          east: { uv: [0, 0, 16, 2], texture: 0 },
          south: { uv: [0, 0, 16, 2], texture: 0 },
          west: { uv: [0, 0, 16, 2], texture: 0 },
          up: { uv: [0, 0, 16, 16], texture: 0 },
          down: { uv: [0, 0, 16, 16], texture: 1 },
        },
        type: 'cube',
        uuid: 'a',
      },
    ],
    outliner: ['a'],
    textures: [
      { id: '0', name: 'Oak Top.png', source: PNG16, uuid: 't0' },
      { id: '1', name: 'oak_bottom.png', source: PNG16, uuid: 't1' },
    ],
    display: { gui: { rotation: [30, 45, 0], scale: [0.6, 0.6, 0.6] } },
  });
}

function buildProject(): Project {
  const project = createProject('Mein Pack', 'meinpack', '1.21.11');
  const weapons = createFolder('Waffen', null);
  const furniture = createFolder('Möbel', null);
  const chairs = createFolder('Stühle', furniture.id);
  insertFolder(project, weapons);
  insertFolder(project, furniture);
  insertFolder(project, chairs);

  const sword = createItem({
    displayName: '<red>Rubin-Schwert',
    nexoId: 'ruby_sword',
    folderId: weapons.id,
    material: 'DIAMOND_SWORD',
    model: createTextureModel('handheld', { layer0: 'ruby_sword.png' }, [{ name: 'ruby_sword.png', dataUrl: PNG16 }]),
  });
  sword.config.lore = ['<gray>Scharf', '', 'yes'];
  sword.config.AttributeModifiers = [
    { attribute: 'ATTACK_DAMAGE', amount: 9, operation: 'ADD_NUMBER', slot: 'MAINHAND' },
    { attribute: 'ATTACK_SPEED', amount: -2.4, operation: 'ADD_NUMBER', slot: 'MAINHAND', display: { type: '' } },
  ];
  sword.config.Enchantments = { sharpness: 5 };
  sword.config.Components = { max_stack_size: 1, max_damage: 1500, food: { nutrition: '', saturation: undefined as never } };
  insertItem(project, sword);

  const table = createItem({
    displayName: 'Eichentisch',
    nexoId: 'oak_table',
    folderId: furniture.id,
    model: convertBBModel(sampleBBModel(), 'table.bbmodel'),
  });
  table.config.Mechanics = {
    furniture: {
      hitbox: { barriers: ['0,0,0', ''], interactions: [] },
      rotatable: true,
      properties: { display_transform: '', scale: '' },
      preview_placement: {},
      seats: ['0,0.5,0'],
    },
  };
  insertItem(project, table);

  const chair = createItem({ displayName: 'Stuhl', nexoId: 'chair', folderId: chairs.id, model: null });
  chair.config.Mechanics = { furniture: {} };
  chair.rawYaml = 'Mechanics:\n  furniture:\n    seat: 0,0.4,0\nexcludeFromInventory: true\n';
  insertItem(project, chair);

  return project;
}

async function unzip(data: Uint8Array): Promise<Map<string, Uint8Array>> {
  const zip = await JSZip.loadAsync(data);
  const files = new Map<string, Uint8Array>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!entry.dir) files.set(path, await entry.async('uint8array'));
  }
  return files;
}

const text = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);

describe('planExport', () => {
  it('creates the item YAMLs per folder with correct values', () => {
    const plan = planExport(buildProject());
    expect([...plan.itemFiles.keys()].sort()).toEqual([
      'items/moebel/moebel.yml',
      'items/moebel/stuehle/stuehle.yml',
      'items/waffen/waffen.yml',
    ]);
    const weapons = parse(plan.itemFiles.get('items/waffen/waffen.yml')!, { version: '1.1' });
    expect(weapons).toEqual({
      ruby_sword: {
        itemname: '<red>Rubin-Schwert',
        material: 'DIAMOND_SWORD',
        lore: ['<gray>Scharf', '', 'yes'],
        Pack: { model: 'meinpack:item/waffen/ruby_sword' },
        Components: { item_model: 'nexo:ruby_sword', max_stack_size: 1, max_damage: 1500 },
        AttributeModifiers: [
          { attribute: 'ATTACK_DAMAGE', amount: 9, operation: 'ADD_NUMBER', slot: 'MAINHAND' },
          { attribute: 'ATTACK_SPEED', amount: -2.4, operation: 'ADD_NUMBER', slot: 'MAINHAND' },
        ],
        Enchantments: { sharpness: 5 },
      },
    });
    // "yes" must be quoted for SnakeYAML
    expect(plan.itemFiles.get('items/waffen/waffen.yml')).toContain('- "yes"');
    expect(plan.itemFiles.get('items/waffen/waffen.yml')).toContain('itemname: "<red>Rubin-Schwert"');
  });

  it('keeps empty mechanics and applies additional YAML', () => {
    const plan = planExport(buildProject());
    const furniture = parse(plan.itemFiles.get('items/moebel/moebel.yml')!, { version: '1.1' });
    expect(furniture.oak_table.Mechanics.furniture).toEqual({
      hitbox: { barriers: ['0,0,0'] },
      rotatable: true,
      preview_placement: true,
      seats: ['0,0.5,0'],
    });
    const chairs = parse(plan.itemFiles.get('items/moebel/stuehle/stuehle.yml')!, { version: '1.1' });
    expect(chairs).toEqual({
      chair: {
        itemname: 'Stuhl',
        material: 'PAPER',
        Mechanics: { furniture: { seat: '0,0.4,0' } },
        excludeFromInventory: true,
      },
    });
  });

  it('writes models and textures to the correct paths', () => {
    const plan = planExport(buildProject());
    const files = [...plan.packFiles.keys()].sort();
    expect(files).toEqual([
      'assets/meinpack/models/item/moebel/oak_table.json',
      'assets/meinpack/models/item/waffen/ruby_sword.json',
      'assets/meinpack/textures/item/moebel/oak_table/oak_bottom.png',
      'assets/meinpack/textures/item/moebel/oak_table/oak_top.png',
      'assets/meinpack/textures/item/waffen/ruby_sword/ruby_sword.png',
      'pack.mcmeta',
    ]);
    const table = JSON.parse(plan.packFiles.get('assets/meinpack/models/item/moebel/oak_table.json') as string);
    expect(table.textures).toEqual({
      '0': 'meinpack:item/moebel/oak_table/oak_top',
      '1': 'meinpack:item/moebel/oak_table/oak_bottom',
      particle: 'meinpack:item/moebel/oak_table/oak_top',
    });
    expect(table.elements[0].faces.down.texture).toBe('#1');
    const sword = JSON.parse(plan.packFiles.get('assets/meinpack/models/item/waffen/ruby_sword.json') as string);
    expect(sword).toEqual({
      parent: 'minecraft:item/handheld',
      textures: { layer0: 'meinpack:item/waffen/ruby_sword/ruby_sword' },
    });
    const mcmeta = JSON.parse(plan.packFiles.get('pack.mcmeta') as string);
    expect(mcmeta).toEqual({
      pack: { description: 'Mein Pack – made with ResourcepackBuilder', pack_format: 75, min_format: 75, max_format: 999 },
    });
  });

  it('reports errors for duplicate IDs, invalid values and conflicts', () => {
    const project = buildProject();
    const folderId = project.rootFolderIds[0];
    const dup = createItem({ displayName: 'Kopie', nexoId: 'ruby_sword', folderId, model: null });
    dup.config.Mechanics = { furniture: {}, custom_block: { type: 'NOTEBLOCK', custom_variation: 5000 } };
    dup.config.Components = { use_cooldown: { duration: 'zwei Sekunden' } };
    dup.rawYaml = 'foo: [';
    insertItem(project, dup);
    const plan = planExport(project);
    const errors = plan.issues.filter((i) => i.level === 'error' && i.target?.id === dup.id);
    expect(errors.some((i) => i.code === 'plan.itemIdDuplicate' && i.args?.other === 'Rubin-Schwert')).toBe(true);
    expect(errors.some((i) => i.code === 'plan.propertyConflict')).toBe(true);
    expect(errors.some((i) => i.code === 'plan.blockVariationRange' && i.args?.max === 1149)).toBe(true);
    expect(errors.some((i) => i.code === 'plan.rawYamlError')).toBe(true);
    expect(errors.every((i) => i.context?.[0].args?.item === 'Kopie')).toBe(true);
    const warnings = plan.issues.filter((i) => i.level === 'warning' && i.target?.id === dup.id);
    expect(warnings.some((i) => i.code === 'plan.fieldFormat' && i.args?.value === 'zwei Sekunden' && i.args?.error)).toBe(true);
  });

  it('exports the material in upper case and rejects invalid names', () => {
    const project = buildProject();
    const folderId = project.rootFolderIds[0];
    const lower = createItem({ displayName: 'Lower', nexoId: 'lower', folderId, material: ' diamond_axe ', model: null });
    const broken = createItem({ displayName: 'Broken', nexoId: 'broken', folderId, model: null });
    broken.rawYaml = 'material: diamond axe';
    insertItem(project, lower);
    insertItem(project, broken);
    const plan = planExport(project);
    expect(plan.items.find((p) => p.item.id === lower.id)?.config.material).toBe('DIAMOND_AXE');
    const invalid = plan.issues.filter((i) => i.code === 'plan.materialInvalid').map((i) => i.target?.id);
    expect(invalid).toEqual([broken.id]);
  });

  it('uses the model for custom blocks and places block textures under textures/block', () => {
    const project = createProject('Blöcke', 'bloecke', '26.3');
    const folder = createFolder('Erze', null);
    insertFolder(project, folder);
    const ore = createItem({
      displayName: 'Rubinerz',
      nexoId: 'ruby_ore',
      folderId: folder.id,
      model: createTextureModel('cube_all', { all: 'ruby_ore.png' }, [{ name: 'ruby_ore.png', dataUrl: PNG16 }]),
    });
    ore.config.Mechanics = { custom_block: { type: 'NOTEBLOCK', model: '@model', custom_variation: 12, hardness: 3 } };
    insertItem(project, ore);
    const plan = planExport(project);
    expect(plan.packFiles.has('assets/bloecke/textures/block/erze/ruby_ore/ruby_ore.png')).toBe(true);
    const yaml = parse(plan.itemFiles.get('items/erze/erze.yml')!, { version: '1.1' });
    expect(yaml.ruby_ore.Pack.model).toBe('bloecke:block/erze/ruby_ore');
    expect(yaml.ruby_ore.Mechanics.custom_block).toEqual({
      type: 'NOTEBLOCK',
      model: 'bloecke:block/erze/ruby_ore',
      custom_variation: 12,
      hardness: 3,
    });
    // "@model" must not be reported as an invalid key
    expect(plan.issues.filter((i) => i.level !== 'info')).toEqual([]);
  });

  it('creates equipment models for armor textures', () => {
    const project = createProject('Rüstung', 'ruestung', '1.21.4');
    const folder = createFolder('Rüstung', null);
    insertFolder(project, folder);
    const helmet = createItem({
      displayName: 'Rubinhelm',
      nexoId: 'ruby_helmet',
      folderId: folder.id,
      material: 'IRON_HELMET',
      model: null,
    });
    helmet.assets = { a1: createTexture('a1', 'layer_1', PNG64x32), a2: createTexture('a2', 'layer_2', PNG64x32) };
    helmet.armor = { set: 'ruby', layer1: '@asset:a1', layer2: '@asset:a2' };
    const boots = createItem({ displayName: 'Rubinschuhe', nexoId: 'ruby_boots', folderId: folder.id, material: 'PAPER', model: null });
    boots.armor = { set: 'ruby' };
    boots.config.Components = { equippable: { slot: 'FEET' } };
    insertItem(project, helmet);
    insertItem(project, boots);
    const plan = planExport(project);
    expect(JSON.parse(plan.packFiles.get('assets/ruestung/equipment/ruby.json') as string)).toEqual({
      layers: { humanoid: [{ texture: 'ruestung:ruby' }], humanoid_leggings: [{ texture: 'ruestung:ruby' }] },
    });
    expect(plan.packFiles.has('assets/ruestung/textures/entity/equipment/humanoid/ruby.png')).toBe(true);
    expect(plan.packFiles.has('assets/ruestung/textures/entity/equipment/humanoid_leggings/ruby.png')).toBe(true);
    const yaml = parse(plan.itemFiles.get('items/ruestung/ruestung.yml')!, { version: '1.1' });
    expect(yaml.ruby_helmet.Components).toEqual({ equippable: { slot: 'HEAD', asset_id: 'ruestung:ruby' } });
    expect(yaml.ruby_boots.Components).toEqual({ equippable: { slot: 'FEET', asset_id: 'ruestung:ruby' } });
    expect(yaml.ruby_helmet.$armor).toBeUndefined();
    const mcmeta = JSON.parse(plan.packFiles.get('pack.mcmeta') as string);
    expect(mcmeta.pack).toMatchObject({ pack_format: 46, supported_formats: [46, 999], min_format: 46, max_format: 999 });
  });
});

describe('buildMultiExportZip (one project)', () => {
  it('places items and the external pack into the Nexo folder structure', async () => {
    const project = buildProject();
    const plan = planExport(project);
    const result = await buildMultiExportZip(singleExport(project, plan), 'full');
    const files = await unzip(result.data);
    const paths = [...files.keys()].sort();
    expect(paths).toContain('items/waffen/waffen.yml');
    expect(paths).toContain('pack/external_packs/mein_pack/pack.mcmeta');
    expect(paths).toContain('pack/external_packs/mein_pack/assets/meinpack/models/item/moebel/oak_table.json');
    expect(paths).toContain(INSTALL_GUIDE_FILE);
    expect(paths).toEqual(result.paths);
    expect(text(files.get('items/waffen/waffen.yml'))).toBe(plan.itemFiles.get('items/waffen/waffen.yml'));
    const png = files.get('pack/external_packs/mein_pack/assets/meinpack/textures/item/waffen/ruby_sword/ruby_sword.png')!;
    expect([...png.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('can pack the external pack as a separate ZIP', async () => {
    const project = buildProject();
    project.settings.externalPackAsZip = true;
    const plan = planExport(project);
    const files = await unzip((await buildMultiExportZip(singleExport(project, plan), 'full')).data);
    const inner = await unzip(files.get('pack/external_packs/mein_pack.zip')!);
    expect(inner.has('pack.mcmeta')).toBe(true);
    expect(inner.has('assets/meinpack/models/item/waffen/ruby_sword.json')).toBe(true);
  });

  it('exports only the resource pack', async () => {
    const project = buildProject();
    const plan = planExport(project);
    const files = await unzip((await buildMultiExportZip(singleExport(project, plan), 'pack')).data);
    expect([...files.keys()].every((p) => p === 'pack.mcmeta' || p.startsWith('assets/'))).toBe(true);
  });
});

describe('Variant models', () => {
  it('exports the pulling stages of a bow and sets Pack.pulling_models', () => {
    const project = createProject('Bögen', 'boegen', '26.3');
    const folder = createFolder('Fernkampf', null);
    insertFolder(project, folder);
    const png = (name: string) => createTextureModel('handheld', { layer0: name }, [{ name, dataUrl: PNG16 }]);
    const bow = createItem({ displayName: 'Langbogen', nexoId: 'longbow', folderId: folder.id, material: 'BOW', model: png('bow.png') });
    bow.variants = { pulling_models: [png('bow_0.png'), png('bow_1.png'), png('bow_2.png')] };
    insertItem(project, bow);
    const plan = planExport(project);
    const yaml = parse(plan.itemFiles.get('items/fernkampf/fernkampf.yml')!, { version: '1.1' });
    expect(yaml.longbow.Pack).toEqual({
      model: 'boegen:item/fernkampf/longbow',
      pulling_models: [
        'boegen:item/fernkampf/longbow-pulling_0',
        'boegen:item/fernkampf/longbow-pulling_1',
        'boegen:item/fernkampf/longbow-pulling_2',
      ],
    });
    expect(plan.packFiles.has('assets/boegen/models/item/fernkampf/longbow-pulling_2.json')).toBe(true);
    expect(plan.packFiles.has('assets/boegen/textures/item/fernkampf/longbow-pulling_1/bow_1.png')).toBe(true);
    const model = JSON.parse(plan.packFiles.get('assets/boegen/models/item/fernkampf/longbow-pulling_0.json') as string);
    expect(model.textures.layer0).toBe('boegen:item/fernkampf/longbow-pulling_0/bow_0');
    expect(plan.issues.filter((i) => i.level !== 'info')).toEqual([]);
  });

  it('warns about an unsuitable material and a missing main model', () => {
    const project = createProject('Test', 'test', '26.3');
    const folder = createFolder('A', null);
    insertFolder(project, folder);
    const model = createTextureModel('generated', { layer0: 'a.png' }, [{ name: 'a.png', dataUrl: PNG16 }]);
    const shield = createItem({ displayName: 'Schild', nexoId: 'shield', folderId: folder.id, material: 'PAPER', model });
    shield.variants = { blocking_model: [model] };
    const noModel = createItem({ displayName: 'Ohne', nexoId: 'ohne', folderId: folder.id, model: null });
    noModel.variants = { cast_model: [model] };
    insertItem(project, shield);
    insertItem(project, noModel);
    const plan = planExport(project);
    expect(
      plan.issues.some(
        (i) =>
          i.target?.id === shield.id &&
          i.level === 'warning' &&
          i.code === 'plan.variantWrongMaterial' &&
          String(i.args?.materials).includes('SHIELD'),
      ),
    ).toBe(true);
    expect(plan.issues.some((i) => i.target?.id === noModel.id && i.level === 'error' && i.code === 'plan.variantNeedsMainModel')).toBe(
      true,
    );
    const yaml = parse(plan.itemFiles.get('items/a/a.yml')!, { version: '1.1' });
    expect(yaml.shield.Pack.blocking_model).toBe('test:item/a/shield-blocking');
  });
});
