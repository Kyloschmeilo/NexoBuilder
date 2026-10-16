import { describe, expect, it } from 'vitest';
import {
  type ArmorSettings,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  migrateProject,
  type Project,
} from '@resourcepackbuilder/core/project';
import { createTexture } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG = makePngDataUrl(64, 32);
const CONFIG = 'resources/ruestung/configuration';

/** A CraftEngine project with the folder "Teile"; `add` puts an item into a folder (default "Teile"). */
function ceProject() {
  const project = createProject('Rüstung', 'aus', '1.21.11', 'craftengine');
  const parts = createFolder('Teile', null);
  insertFolder(project, parts);
  const add = (itemId: string, material: string, edit: (item: Item) => void = () => {}, folderId = parts.id) => {
    const item = createItem({ displayName: itemId, itemId, folderId, material, model: null });
    edit(item);
    insertItem(project, item);
    return item;
  };
  return { project, parts, add };
}

const withArmor = (armor: ArmorSettings) => (item: Item) => {
  item.assets = { tex: createTexture('tex', `${item.itemId}.png`, PNG) };
  item.armor = armor;
};

const itemsFile = (project: Project) => pluginText(planExport(project), `${CONFIG}/items/teile/teile.yml`);

describe('CraftEngine equipments', () => {
  it('writes one component equipment per armor set and points settings.equipment at it', () => {
    const { project, add } = ceProject();
    add('ruby_helmet', 'CHAINMAIL_HELMET', withArmor({ set: 'ruby', layer1: '@asset:tex', layer2: '@asset:tex' }));
    add('ruby_boots', 'CHAINMAIL_BOOTS', withArmor({ set: 'ruby' }));
    add('wings', 'PAPER', withArmor({ set: 'fire', elytra: '@asset:tex' }));
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/equipments.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – armor sets of "Rüstung"',
        'equipments:',
        '  aus:ruby:',
        '    type: component',
        '    humanoid: aus:ruby',
        '    humanoid_leggings: aus:ruby',
        '  aus:fire:',
        '    type: component',
        '    wings: aus:fire',
        '',
      ].join('\n'),
    );
    // The shared export still writes the same equipment model and textures, which CraftEngine merges with its own
    expect(JSON.parse(plan.packFiles.get('assets/aus/equipment/ruby.json') as string)).toEqual({
      layers: { humanoid: [{ texture: 'aus:ruby' }], humanoid_leggings: [{ texture: 'aus:ruby' }] },
    });
    expect(itemsFile(project)).toBe(
      [
        '# Created with ResourcepackBuilder – project "Rüstung"',
        'items:',
        '  aus:ruby_helmet:',
        '    material: chainmail_helmet',
        '    data:',
        '      item_name: ruby_helmet',
        '    settings:',
        '      equipment:',
        '        asset_id: aus:ruby',
        '  aus:ruby_boots:',
        '    material: chainmail_boots',
        '    data:',
        '      item_name: ruby_boots',
        '    settings:',
        '      equipment:',
        '        asset_id: aus:ruby',
        '  aus:wings:',
        '    material: paper',
        '    data:',
        '      item_name: wings',
        '      components:',
        '        minecraft:glider: {}',
        '    settings:',
        '      equipment:',
        '        asset_id: aus:fire',
        '        slot: chest',
        '',
      ].join('\n'),
    );
  });

  it("keeps what the item's settings.equipment sets", () => {
    const { project, add } = ceProject();
    add('horse_armor', 'PAPER', withArmor({ set: 'pferd', mob: { horse_armor: '@asset:tex' } })).config.settings = {
      equipment: { asset_id: '', slot: 'chest', damage_on_hurt: false },
    };
    expect(itemsFile(project)).toContain(
      ['    settings:', '      equipment:', '        asset_id: aus:pferd', '        slot: chest', '        damage_on_hurt: false'].join(
        '\n',
      ),
    );
  });

  it('reads a namespaced raw YAML material: minecraft:elytra needs no glider and no slot', () => {
    const { project, add } = ceProject();
    add('wings', 'PAPER', (item) => {
      withArmor({ set: 'fire', elytra: '@asset:tex' })(item);
      item.rawYaml = 'material: minecraft:elytra';
    });
    const file = itemsFile(project);
    expect(file).not.toContain('minecraft:glider');
    expect(file).not.toContain('slot:');
    expect(file).toContain('        asset_id: aus:fire');
  });

  it('writes no equipments.yml without armor', () => {
    const { project, add } = ceProject();
    add('stone', 'PAPER');
    expect(planExport(project).pluginFiles.has(`${CONFIG}/equipments.yml`)).toBe(false);
  });
});

describe('CraftEngine categories', () => {
  it('writes a category per folder, subfolders as hidden subcategories listed first', () => {
    const { project, parts, add } = ceProject();
    const weapons = createFolder('Waffen', null);
    const swords = createFolder('Schwerter', weapons.id);
    const empty = createFolder('Leer', weapons.id);
    for (const folder of [weapons, swords, empty]) insertFolder(project, folder);
    add('helmet', 'PAPER');
    add('sword', 'PAPER', undefined, swords.id);
    add('axe', 'PAPER', undefined, weapons.id);
    expect(parts.itemIds).toHaveLength(1);
    expect(pluginText(planExport(project), `${CONFIG}/categories.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – categories of "Rüstung"',
        'categories:',
        '  aus:teile:',
        '    name: "<!i>Teile"',
        '    priority: 1',
        '    icon: aus:helmet',
        '    list:',
        '      - aus:helmet',
        '  aus:waffen:',
        '    name: "<!i>Waffen"',
        '    priority: 2',
        '    icon: aus:axe',
        '    list:',
        '      - "#aus:waffen/schwerter"',
        '      - aus:axe',
        '  aus:waffen/schwerter:',
        '    name: "<!i>Schwerter"',
        '    hidden: true',
        '    icon: aus:sword',
        '    list:',
        '      - aus:sword',
        '',
      ].join('\n'),
    );
  });

  it('writes no categories when the project setting is off', () => {
    const { project, add } = ceProject();
    add('helmet', 'PAPER');
    project.settings.ceCategoriesFromFolders = false;
    expect(planExport(project).pluginFiles.has(`${CONFIG}/categories.yml`)).toBe(false);
  });

  it('is on by default, also for stored projects without the setting', () => {
    expect(createProject('Neu', 'neu', '1.21.11', 'craftengine').settings.ceCategoriesFromFolders).toBe(true);
    expect(migrateProject({ name: 'Alt', settings: { packName: 'alt' } }).settings.ceCategoriesFromFolders).toBe(true);
  });
});

describe('CraftEngine lang files', () => {
  it('writes a lang file per locale with the display name as en_us and sets item_name to the lang key', () => {
    const { project, add } = ceProject();
    add('ruby', 'PAPER', (item) => {
      item.displayName = '<red>Ruby';
      item.translations = { de_de: '<red>Rubin', fr_fr: ' ', 'De DE': 'x' };
    });
    add('plain', 'PAPER');
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/lang/en_us.yml`)).toBe(
      ['# Created with ResourcepackBuilder – translations of "Rüstung"', 'lang:', '  en_us:', '    item.aus.ruby: "<red>Ruby"', ''].join(
        '\n',
      ),
    );
    expect(pluginText(plan, `${CONFIG}/lang/de_de.yml`)).toContain('lang:\n  de_de:\n    item.aus.ruby: "<red>Rubin"\n');
    expect(plan.pluginFiles.has(`${CONFIG}/lang/fr_fr.yml`)).toBe(false);
    const items = pluginText(plan, `${CONFIG}/items/teile/teile.yml`);
    expect(items).toContain('      item_name: "<lang:item.aus.ruby>"');
    expect(items).toContain('      item_name: plain');
    expect(plan.issues.filter((i) => i.code === 'ce.translationLocaleInvalid').map((i) => i.args)).toEqual([{ locale: 'De DE' }]);
  });

  it('lets a translation set en_us itself', () => {
    const { project, add } = ceProject();
    add('ruby', 'PAPER', (item) => (item.translations = { en_us: 'Ruby Gem' }));
    expect(pluginText(planExport(project), `${CONFIG}/lang/en_us.yml`)).toContain('    item.aus.ruby: Ruby Gem\n');
  });
});
