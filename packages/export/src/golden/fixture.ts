/** A fixed project for the golden export snapshot: it touches every part of the Nexo export. */
import {
  createFolder,
  createGlyph,
  createItem,
  createPainting,
  createProject,
  createRecipe,
  createSound,
  glyphFileFromDataUrl,
  insertFolder,
  insertItem,
  type Project,
} from '@resourcepackbuilder/core/project';
import { createTexture, createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';

const PNG16 = makePngDataUrl(16, 16);
const PNG64x32 = makePngDataUrl(64, 32);
const OGG = 'data:audio/ogg;base64,' + btoa('OggS' + '\0'.repeat(20));

const png = (name: string) => createTextureModel('handheld', { layer0: name }, [{ name, dataUrl: PNG16 }]);

/** The main fixture: two folders, a bow with variants, armor, a recipe, a glyph, a sound and a painting. */
export function goldenProject(options: { externalPackAsZip: boolean }): Project {
  const project = createProject('Golden Pack', 'golden', '1.21.11');
  project.settings.useItemModel = true;
  project.settings.externalPackAsZip = options.externalPackAsZip;

  const weapons = createFolder('Waffen', null);
  const gear = createFolder('Rüstung', null);
  insertFolder(project, weapons);
  insertFolder(project, gear);

  const sword = createItem({
    displayName: '<red>Rubin-Schwert',
    itemId: 'ruby_sword',
    folderId: weapons.id,
    material: 'DIAMOND_SWORD',
    model: png('ruby_sword.png'),
  });
  sword.config.lore = ['<gray>Scharf'];
  sword.config.Enchantments = { sharpness: 5 };
  const recipe = createRecipe('shaped', 'r1');
  recipe.grid = ['', 'A', '', '', 'A', '', '', 'B', ''];
  recipe.ingredients = { A: { source: 'minecraft', id: 'DIAMOND' }, B: { source: 'minecraft', id: 'STICK' } };
  sword.recipes = [recipe];
  insertItem(project, sword);

  const bow = createItem({ displayName: 'Langbogen', itemId: 'longbow', folderId: weapons.id, material: 'BOW', model: png('bow.png') });
  bow.variants = { pulling_models: [png('bow_0.png'), png('bow_1.png'), png('bow_2.png')] };
  insertItem(project, bow);

  const helmet = createItem({ displayName: 'Rubin-Helm', itemId: 'ruby_helmet', folderId: gear.id, material: 'IRON_HELMET', model: null });
  helmet.assets = { tex: createTexture('tex', 'ruby_helmet.png', PNG64x32) };
  helmet.armor = { set: 'rubin', layer1: '@asset:tex', layer2: '@asset:tex' };
  insertItem(project, helmet);

  const heart = createGlyph('g1', 'heart', glyphFileFromDataUrl('heart.png', makePngDataUrl(8, 8)));
  heart.placeholders = ['<3'];
  project.glyphs = [heart];

  project.sounds = [createSound('s1', 'block.glocke.ding', [{ name: 'ding.ogg', dataUrl: OGG, size: 24 }])];

  const painting = createPainting('p1', 'sonne', { name: 'sonne.png', dataUrl: makePngDataUrl(32, 16), width: 32, height: 16 });
  painting.title = 'Sonne';
  project.paintings = [painting];

  return project;
}

/** A second, small project for the multi-project layout. */
export function goldenSecondProject(): Project {
  const project = createProject('Zweites Pack', 'zweit', '1.21.11');
  const folder = createFolder('Dinge', null);
  insertFolder(project, folder);
  insertItem(
    project,
    createItem({ displayName: 'Ding', itemId: 'thing', folderId: folder.id, material: 'PAPER', model: png('thing.png') }),
  );
  return project;
}

/**
 * A CraftEngine project: a sword with a model, properties and a value without a property, a bow with pulling
 * variants whose raw YAML overrides data.item_name and adds unknown keys, and an item without a model in a second
 * folder. Its glyph is not exported for CraftEngine yet.
 */
export function goldenCraftEngineProject(): Project {
  const project = createProject('Kristall Pack', 'kristall', '1.21.11', 'craftengine');
  const weapons = createFolder('Waffen', null);
  const misc = createFolder('Kram', null);
  insertFolder(project, weapons);
  insertFolder(project, misc);

  const sword = createItem({
    displayName: '<aqua>Kristall-Schwert',
    itemId: 'crystal_sword',
    folderId: weapons.id,
    material: 'DIAMOND_SWORD',
    model: png('crystal_sword.png'),
  });
  sword.config.data = { lore: ['<gray>Funkelt'], unbreakable: true };
  sword.config.settings = { fuel_time: 300 };
  sword.config.custom_extra = { keep: 'me' };
  const recipe = createRecipe('shaped', 'r1');
  recipe.grid = ['', 'A', '', '', 'A', '', '', 'B', ''];
  recipe.ingredients = { A: { source: 'minecraft', id: 'AMETHYST_SHARD' }, B: { source: 'minecraft', id: 'STICK' } };
  sword.recipes = [recipe];
  insertItem(project, sword);

  const bow = createItem({
    displayName: 'Kristallbogen',
    itemId: 'crystal_bow',
    folderId: weapons.id,
    material: 'BOW',
    model: png('cbow.png'),
  });
  bow.variants = { pulling_models: [png('cbow_0.png'), png('cbow_1.png'), png('cbow_2.png')] };
  bow.rawYaml = 'data:\n  item_name: "<gold>Bogen"\n  my_component: 1\nunknown_key: true';
  insertItem(project, bow);

  insertItem(project, createItem({ displayName: 'Stein', itemId: 'pebble', folderId: misc.id, material: 'PAPER', model: null }));

  const block = createItem({
    displayName: 'Kristallblock',
    itemId: 'crystal_block',
    folderId: misc.id,
    material: 'PAPER',
    model: createTextureModel('cube_all', { all: 'crystal_block.png' }, [{ name: 'crystal_block.png', dataUrl: PNG16 }]),
  });
  block.config.block = {
    state: { auto_state: 'solid' },
    settings: { hardness: 3, tags: ['minecraft:mineable/pickaxe'] },
    loot: { template: 'default:loot_table/self' },
  };
  insertItem(project, block);

  project.glyphs = [createGlyph('g1', 'gem', glyphFileFromDataUrl('gem.png', makePngDataUrl(8, 8)))];
  return project;
}
