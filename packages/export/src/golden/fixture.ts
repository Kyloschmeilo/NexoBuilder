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
    nexoId: 'ruby_sword',
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

  const bow = createItem({ displayName: 'Langbogen', nexoId: 'longbow', folderId: weapons.id, material: 'BOW', model: png('bow.png') });
  bow.variants = { pulling_models: [png('bow_0.png'), png('bow_1.png'), png('bow_2.png')] };
  insertItem(project, bow);

  const helmet = createItem({ displayName: 'Rubin-Helm', nexoId: 'ruby_helmet', folderId: gear.id, material: 'IRON_HELMET', model: null });
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
  insertItem(project, createItem({ displayName: 'Ding', nexoId: 'thing', folderId: folder.id, material: 'PAPER', model: png('thing.png') }));
  return project;
}
