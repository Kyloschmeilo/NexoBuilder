/**
 * The CraftEngine sample project of the plugin check: blocks with several behaviors (crop, door, stairs, slab,
 * falling, lamp, sapling, storage) set up the way the editor sets them up, block settings and per-variant settings,
 * furniture with behaviors, hitboxes and seats, item behaviors, settings and data, the item updater, an item model
 * tree, recipes of every CraftEngine type, events with conditions and functions, loot, translations, categories, a
 * worldgen feature, an atlas, pack.yml values, templates, global variables and a script.
 */
import { applyBlockBehavior, newCraftEngineBlock, newCraftEngineFurniture } from '@resourcepackbuilder/core/craftEngine';
import {
  createGlyph,
  createProject,
  createRecipe,
  createSound,
  glyphFileFromDataUrl,
  type ConfigObject,
  type Item,
  type Project,
  type Recipe,
  type RecipeIngredient,
} from '@resourcepackbuilder/core/project';
import { compareVersions, createTexture } from '@resourcepackbuilder/minecraft';
import { blockModel, flatModel, folder, OGG, png, withoutUnsupported, yaml } from './shared';

const vanilla = (id: string, extra: Partial<RecipeIngredient> = {}): RecipeIngredient => ({ source: 'minecraft', id, ...extra });
const own = (id: string): RecipeIngredient => ({ source: 'nexo', id });

/** A recipe of `type` with `edit` applied. */
function recipe(type: Recipe['type'], id: string, edit: (recipe: Recipe) => void): Recipe {
  const created = createRecipe(type, id);
  edit(created);
  return created;
}

/** Gives the item a block with the behavior `type`, as the editor's behavior select does, then `extra` on top. */
function withBlock(item: Item, namespace: string, type: string | null, extra: ConfigObject = {}): void {
  const key = `${namespace}:${item.itemId}`;
  const block = applyBlockBehavior(newCraftEngineBlock(), type, key, { auto_state: 'solid' });
  item.config.block = { ...block, ...extra };
}

export function craftEngineSample(minecraftVersion: string): Project {
  const ns = 'verifyce';
  const project = createProject('Verify CE', ns, minecraftVersion, 'craftengine');
  // Minecraft 26.3 names a block state's block `id` (before: `Name`)
  const stateKey = compareVersions(minecraftVersion, '26.3') >= 0 ? 'id' : 'Name';

  /* ------------------------------------------------------------------ items: data, settings, behaviors */
  const gear = folder(project, 'Gear');

  gear('verify_blade', '<gradient:#55ffff:#5555ff>Verify blade', 'DIAMOND_SWORD', flatModel('verify_blade', 'handheld'), (item) => {
    item.translations = { de_de: 'Prüfklinge' };
    item.config = {
      ...item.config,
      ...yaml(`
data:
  lore:
    - <gray>Checks every key
  unbreakable: true
  max_damage: 900
  enchantment:
    minecraft:sharpness: 2
  attribute_modifiers:
    - type: attack_damage
      amount: 6
      operation: add_value
      slot: mainhand
  custom_model_data: 10001
  tooltip_style: minecraft:verify
  hide_tooltip: [minecraft:attribute_modifiers]
  pdc:
    verify: checked
settings:
  tags: [minecraft:swords]
  fuel_time: 300
  repairable:
    crafting_table: true
    anvil_repair: true
    anvil_combine: false
    grindstone_repair: true
  anvil_repair_item:
    - target: ['#minecraft:swords']
      amount: 20
  renameable: true
  enchantable: true
  invulnerable: [lava, fire]
  keep_on_death_chance: 0.5
  drop_display: true
  glow_color: aqua
category: [verifyce:tools]
updater:
  "1":
    - type: apply_data
      data:
        lore:
          - <gray>Updated
  "2":
    - type: reset
      keep_components: [minecraft:custom_name]
`),
    };
  });

  gear('verify_bread', 'Verify bread', 'BREAD', flatModel('verify_bread'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
data:
  food:
    nutrition: 6
    saturation: 7.2
  use_remainder:
    id: minecraft:bowl
  random_values:
    roll: 0~1
settings:
  food:
    nutrition: 4
    saturation: 2.4
  compost_probability: 0.65
  craft_remainder:
    type: fixed
    item: minecraft:bowl
    count: 1
behaviors:
  - type: compostable_item
    chance: 0.5
`),
    };
  });

  gear('verify_cap', 'Verify cap', 'LEATHER_HELMET', flatModel('verify_cap'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
data:
  dyed_color: 255,120,0
  equippable:
    slot: head
settings:
  dyeable: true
  dye_color: 255,120,0
  equipment_potion_effects:
    - slot: head
      type: minecraft:night_vision
`),
    };
  });

  gear('verify_book', 'Verify book', 'WRITTEN_BOOK', flatModel('verify_book'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
data:
  written_book_content:
    title: Verify
    author: Verify
    generation: 0
    pages:
      - <red>First page
      - Second page
  insert_lore:
    position: TAIL
    lore:
      - <gray>Inserted
events:
  - on: right_click
    conditions:
      - type: permission
        permission: verify.book
    functions:
      - type: message
        message: <green>Read the book
      - type: play_sound
        sound: minecraft:item.book.page_turn
      - type: potion_effect
        potion_effect: minecraft:speed
        duration: 100
        amplifier: 1
`),
    };
  });

  gear('verify_helmet', 'Verify helmet', 'IRON_HELMET', flatModel('verify_helmet'), (item) => {
    item.assets = { layer: createTexture('layer', 'verify_armor_layer.png', png(90, 64, 32)) };
    item.armor = { set: 'verify', layer1: '@asset:layer', layer2: '@asset:layer' };
  });

  gear('verify_trophy', 'Verify trophy', 'PAPER', flatModel('verify_trophy'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
data:
  custom_name: <gold>Trophy
  trim:
    pattern: eye
    material: iron
  components:
    minecraft:glider: {}
  remove_components: [minecraft:attribute_modifiers]
  block_state: minecraft:oak_log[axis=x]
settings:
  ingredient_substitute: [minecraft:paper]
  destroy_on_death_chance: 0.25
  projectile:
    display:
      item: verifyce:verify_trophy
    gravity: true
    velocity: 1.5
    damage: 2
`),
    };
  });

  gear('verify_wand', 'Verify wand', 'STICK', flatModel('verify_wand', 'handheld'), (item) => {
    item.itemModel = {
      model: {
        type: 'minecraft:condition',
        property: 'minecraft:using_item',
        on_true: { type: 'minecraft:model', model: '@model', tints: [{ type: 'minecraft:constant', value: -65536 }] },
        on_false: { type: 'minecraft:model', model: '@model' },
      },
      hand_animation_on_swap: false,
    };
    item.config = {
      ...item.config,
      ...yaml(`
behaviors:
  - type: range_mining_item
    range: 1
  - type: flint_and_steel_item
data:
  functions:
    - type: set_variable
      name: score
      value_type: int
      number: 1
`),
    };
  });

  /* ------------------------------------------------------------------ blocks */
  const blocks = folder(project, 'Blocks');

  blocks('verify_ore', 'Verify ore', 'PAPER', blockModel('verify_ore', 'cube_all', ['all']), (item) => {
    item.translations = { de_de: 'Prüferz' };
    withBlock(item, ns, null);
    Object.assign(
      (item.config.block as ConfigObject) ?? {},
      yaml(`
settings:
  hardness: 3
  resistance: 3
  tags: [minecraft:mineable/pickaxe]
  require_correct_tools: true
  correct_tools: ['#minecraft:pickaxes']
  luminance: 4
  map_color: 11
  instrument: basedrum
  sounds:
    break: minecraft:block.stone.break
    step: minecraft:block.stone.step
    place:
      id: minecraft:block.stone.place
      volume: 1
      pitch: 0.8
    hit: minecraft:block.stone.hit
    fall: minecraft:block.stone.fall
events:
  - on: break
    functions:
      - type: drop_loot
        loot:
          template: default:loot_table/self
loot:
  pools:
    - rolls: 1
      entries:
        - type: item
          item: verifyce:verify_ore
`),
    );
  });

  blocks('verify_crop', 'Verify crop', 'PAPER', blockModel('verify_crop', 'cross', ['cross']), (item) => {
    withBlock(item, ns, 'crop_block');
  });
  blocks('verify_door', 'Verify door', 'PAPER', flatModel('verify_door'), (item) => {
    withBlock(item, ns, 'door_block');
  });
  blocks('verify_stairs', 'Verify stairs', 'PAPER', blockModel('verify_stairs', 'cube_all', ['all']), (item) => {
    withBlock(item, ns, 'stairs_block');
  });
  blocks('verify_slab', 'Verify slab', 'PAPER', blockModel('verify_slab', 'cube_all', ['all']), (item) => {
    withBlock(item, ns, 'slab_block');
  });
  blocks('verify_sand', 'Verify sand', 'PAPER', blockModel('verify_sand', 'cube_all', ['all']), (item) => {
    withBlock(item, ns, 'falling_block');
  });
  blocks('verify_lamp', 'Verify lamp', 'PAPER', blockModel('verify_lamp', 'cube_all', ['all']), (item) => {
    withBlock(item, ns, 'lamp_block');
  });
  blocks('verify_sapling', 'Verify sapling', 'PAPER', blockModel('verify_sapling', 'cross', ['cross']), (item) => {
    withBlock(item, ns, 'sapling_block');
    const block = item.config.block as ConfigObject;
    block.behavior = { ...(block.behavior as ConfigObject), feature: 'minecraft:birch' };
  });
  blocks('verify_crate', 'Verify crate', 'PAPER', blockModel('verify_crate', 'cube_column', ['end', 'side']), (item) => {
    withBlock(item, ns, 'simple_storage_block', {});
    const block = item.config.block as ConfigObject;
    block.behavior = { ...(block.behavior as ConfigObject), title: '<gray>Crate', rows: 2 };
  });

  /* ------------------------------------------------------------------ furniture */
  const furniture = folder(project, 'Furniture');

  furniture('verify_chair', 'Verify chair', 'PAPER', flatModel('verify_chair'), (item) => {
    item.config.furniture = {
      ...newCraftEngineFurniture(),
      ...yaml(`
rules:
  ground:
    rotation: four
    alignment: center
settings:
  hit_times: 3
  sounds:
    break: minecraft:block.wood.break
    place: minecraft:block.wood.place
variants:
  ground:
    loot_spawn_offset: 0,0.4,0
    elements:
      - type: item_display
        display_transform: none
        billboard: fixed
        translation: 0,0.5,0
        shadow_radius: 0.4
        shadow_strength: 0.5
      - type: text_display
        text: <yellow>Chair
        translation: 0,1.2,0
        billboard: center
    hitboxes:
      - position: 0,0,0
        type: interaction
        blocks_building: true
        invisible: true
        width: 0.7
        height: 1.2
        interactive: true
        seats: ['0,0,-0.1 0 true']
events:
  - on: right_click
    functions:
      - type: message
        message: Sit down
`),
    };
  });

  furniture('verify_shelf', 'Verify shelf', 'PAPER', flatModel('verify_shelf'), (item) => {
    item.config.furniture = {
      ...newCraftEngineFurniture(),
      ...yaml(`
variants:
  ground:
    elements:
      - type: item_display
        display_transform: none
        translation: 0,0.5,0
    hitboxes:
      - position: 0,0,0
        type: shulker
        direction: up
        peek: 0
        blocks_building: true
        interactive: true
behaviors:
  - type: simple_storage_furniture
    title: <gray>Shelf
    rows: 1
  - type: glowing_furniture
    lights:
      - position: 0,1,0
        level: 12
`),
    };
  });

  /* ------------------------------------------------------------------ recipes of every CraftEngine type */
  const materials = folder(project, 'Materials');
  materials('verify_ingot', 'Verify ingot', 'IRON_INGOT', flatModel('verify_ingot'), (item) => {
    item.recipes = [
      recipe('shaped', 'r_shaped', (r) => {
        r.grid = ['A', 'A', '', 'A', 'B', '', '', '', ''];
        r.ingredients = {
          A: vanilla('IRON_INGOT', { alternatives: [{ source: 'minecraft', id: 'COPPER_INGOT' }] }),
          B: vanilla('GOLD_INGOT'),
        };
        r.options = { group: 'verify', category: 'misc', unlock_on_ingredient_obtained: true };
      }),
      recipe('shapeless', 'r_shapeless', (r) => {
        r.ingredients = { A: vanilla('IRON_NUGGET'), B: { source: 'tag', id: 'minecraft:planks' } };
        r.resultAmount = 2;
      }),
      recipe('furnace', 'r_furnace', (r) => (r.input = vanilla('RAW_IRON'))),
      recipe('blasting', 'r_blasting', (r) => (r.input = vanilla('IRON_ORE'))),
      recipe('smoking', 'r_smoking', (r) => (r.input = vanilla('ROTTEN_FLESH'))),
      recipe('campfire', 'r_campfire', (r) => (r.input = vanilla('KELP'))),
      recipe('stonecutting', 'r_stonecutting', (r) => (r.input = vanilla('IRON_BLOCK'))),
      recipe('brewing', 'r_brewing', (r) => {
        r.input = vanilla('POTION');
        r.slots = { reagent: vanilla('IRON_NUGGET') };
      }),
      recipe('smithing_transform', 'r_smithing', (r) => {
        r.slots = {
          template: vanilla('NETHERITE_UPGRADE_SMITHING_TEMPLATE'),
          base: vanilla('IRON_INGOT'),
          addition: vanilla('NETHERITE_INGOT'),
        };
        r.options = { merge_components: true };
      }),
    ];
  });
  materials('verify_gem', 'Verify gem', 'EMERALD', flatModel('verify_gem'), (item) => {
    item.recipes = [
      recipe('shaped_transform', 'r_shaped_transform', (r) => {
        r.grid = ['', 'A', '', 'A', 'B', 'A', '', 'A', ''];
        r.ingredients = { A: vanilla('EMERALD'), B: { ...own('verify_ingot'), options: { source: true } } };
      }),
      recipe('shapeless_transform', 'r_shapeless_transform', (r) => {
        r.ingredients = { A: { ...own('verify_ingot'), options: { source: true } }, B: vanilla('DIAMOND') };
      }),
    ];
  });
  materials('verify_dye', 'Verify dye', 'LEATHER_CHESTPLATE', flatModel('verify_dye'), (item) => {
    item.config = { ...item.config, ...yaml(`settings:\n  dyeable: true\n`) };
    // CraftEngine reads dye recipes from Minecraft 26.1 on
    if (compareVersions(minecraftVersion, '26.1') < 0) return;
    item.recipes = [
      recipe('dye', 'r_dye', (r) => {
        r.input = own('verify_dye');
        r.slots = { dye: { source: 'tag', id: 'minecraft:dyes' } };
      }),
    ];
  });
  materials('verify_trim', 'Verify trim template', 'COAST_ARMOR_TRIM_SMITHING_TEMPLATE', flatModel('verify_trim'), (item) => {
    item.recipes = [
      recipe('smithing_trim', 'r_trim', (r) => {
        r.slots = { template: own('verify_trim'), base: { source: 'tag', id: 'minecraft:trimmable_armor' }, addition: vanilla('DIAMOND') };
        r.options = { pattern: 'minecraft:coast' };
      }),
    ];
  });

  /* ------------------------------------------------------------------ media and project-wide data */
  const heart = createGlyph('g1', 'verify_heart', glyphFileFromDataUrl('verify_heart.png', png(200, 8, 8)));
  heart.placeholders = [':heart:'];
  heart.isEmoji = true;
  heart.emojiContent = '<white><image></white>';
  project.glyphs = [heart];
  const chime = createSound('s1', 'block.verify.chime', [{ name: 'chime.ogg', dataUrl: OGG, size: 64 }]);
  chime.volume = 0.8;
  chime.subtitle = 'subtitles.verify.chime';
  project.sounds = [chime];

  project.craftEngine = {
    lang: { en_us: { 'verify.greeting': 'Hello' }, de_de: { 'verify.greeting': 'Hallo' } },
    translations: { en: { 'verify.message': 'Checked' }, de: { 'verify.message': 'Geprüft' } },
    globalVariables: { verify_tag: '<gold>[Verify]' },
    templates: [
      {
        id: 'verify_stone_settings',
        arguments: [{ name: 'hardness', default: '2' }],
        body: { template: ['default:sound/stone'], overrides: { hardness: '${hardness}' } },
      },
    ],
    categories: [
      {
        id: 'tools',
        name: '<!i>Verify tools',
        icon: 'verifyce:verify_blade',
        priority: 1,
        hidden: false,
        source: [{ type: 'list', list: ['verifyce:verify_blade', 'verifyce:verify_wand'] }],
      },
    ],
    configuredFeatures: [
      yaml(`
id: verify_ore_vein
type: minecraft:ore
config:
  size: 6
  discard_chance_on_air_exposure: 0
  targets:
    - target:
        predicate_type: minecraft:tag_match
        tag: minecraft:stone_ore_replaceables
      state:
        ${stateKey}: minecraft:diamond_ore
`),
    ],
    placedFeatures: [
      yaml(`
id: verify_ore_vein_placed
feature: verifyce:verify_ore_vein
placement:
  - type: minecraft:count
    count: 4
  - type: minecraft:in_square
  - type: minecraft:height_range
    height:
      type: minecraft:uniform
      min_inclusive:
        absolute: -32
      max_inclusive:
        absolute: 32
  - type: minecraft:biome
biome: ['#minecraft:is_overworld']
`),
    ],
    atlases: [{ id: 'minecraft:blocks', sources: [{ type: 'directory', source: 'verify', prefix: 'verify/' }] }],
    pack: { author: 'Verify', version: '1.0', enable: true },
    scripts: [{ path: 'verify', source: 'function onVerify(context) {\n  return true;\n}\n' }],
    lootSources: [
      yaml(`
id: zombie_bonus
type: entity_death
target: [minecraft:zombie]
conditions:
  - type: random
    value: 0.1
loot:
  pools:
    - rolls: 1
      entries:
        - type: item
          item: verifyce:verify_gem
`),
    ],
    configFactories: [
      {
        id: 'verify_tiles',
        blueprint: { items: { 'verifyce:${color}_verify_tile': { material: 'paper', data: { item_name: '${color} tile' } } } },
        instances: [{ color: 'white' }, { color: 'red' }],
      },
    ],
  };

  return withoutUnsupported(project);
}
