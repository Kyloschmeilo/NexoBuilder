/**
 * The Nexo sample project of the plugin check: items with many components, attributes and root keys, the mechanics
 * (custom blocks of all three types with directional faces, furniture with every hitbox kind, seats and lights,
 * storage, backpack, commands, custom events …), recipes of every Nexo type, glyphs, sounds, a painting, armor, an
 * item model tree, dialogs and multipack.yml. Values follow what the editor writes for each property.
 */
import {
  createDialog,
  createGlyph,
  createPainting,
  createProject,
  createRecipe,
  createSound,
  glyphFileFromDataUrl,
  type Project,
  type Recipe,
  type RecipeIngredient,
} from '@resourcepackbuilder/core/project';
import { createTexture } from '@resourcepackbuilder/minecraft';
import { blockModel, flatModel, folder, OGG, png, withoutUnsupported, yaml } from './shared';

const vanilla = (id: string, extra: Partial<RecipeIngredient> = {}): RecipeIngredient => ({ source: 'minecraft', id, ...extra });
const own = (id: string): RecipeIngredient => ({ source: 'nexo', id });

/** A recipe of `type` with `edit` applied. */
function recipe(type: Recipe['type'], id: string, edit: (recipe: Recipe) => void): Recipe {
  const created = createRecipe(type, id);
  edit(created);
  return created;
}

export function nexoSample(minecraftVersion: string): Project {
  const project = createProject('Verify Nexo', 'verifynexo', minecraftVersion, 'nexo');
  project.settings.disabledRecipes = ['minecraft:bread'];
  project.settings.multipack = yaml(`
templates:
  dark_ui:
    default: true
  hd_textures:
    required: false
    conflicts_with: dark_ui
`);

  /* ------------------------------------------------------------------ gear: components and root keys */
  const gear = folder(project, 'Gear');

  gear('verify_blade', '<gradient:#ff5555:#ffaa00>Verify blade', 'DIAMOND_SWORD', flatModel('verify_blade', 'handheld'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
lore:
  - <gray>A blade that checks every component
unbreakable: false
ItemFlags: [HIDE_ATTRIBUTES, HIDE_ENCHANTS]
PersistentData:
  - type: STRING
    key: verify:origin
    value: sample
customname: <aqua>Checked blade
no_auto_update: true
Enchantments:
  sharpness: 3
  unbreaking: 2
AttributeModifiers:
  - attribute: ATTACK_DAMAGE
    amount: 6
    operation: ADD_NUMBER
    slot: MAINHAND
  - attribute: ATTACK_SPEED
    amount: -2.4
    operation: ADD_NUMBER
    slot: MAINHAND
Components:
  max_damage: 900
  enchantable: 15
  repairable: [minecraft:diamond]
  rarity: EPIC
  tool:
    default_mining_speed: 1.0
    damage_per_block: 2
    rules:
      - speed: 8.0
        correct_for_drops: true
        tags: [minecraft:mineable/axe]
  weapon:
    damage_per_attack: 1
    disable_blocking_for_seconds: 2
  use_cooldown:
    duration: 2s
    group: verifynexo:blades
  damage_resistant: is_fire
  custom_model_data:
    float: [1.0, 2.5]
    flag: [true]
    string: [checked]
    color: ['#ff8800']
  tooltip_display: [minecraft:attribute_modifiers]
  break_sound: entity.item.break
  can_break:
    block: [minecraft:oak_log, '#minecraft:leaves']
  custom_data:
    verify:checked: 'true'
  attack_range:
    min_reach: 0
    max_reach: 3.5
    hitbox_margin: 0.3
  minimum_attack_charge: 0.8
  damage_type: minecraft:player_attack
  attack_animation:
    type: WHACK
    duration: 6t
  swing_animation:
    type: WHACK
    duration: 6t
  use_effects:
    speed_multiplier: 0.5
`),
    };
  });

  gear('verify_shield', 'Verify shield', 'SHIELD', flatModel('verify_shield'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Components:
  blocks_attacks:
    block_delay: 0.25s
    disable_cooldown_scale: 1
    block_sound: item.shield.block
    disable_sound: item.shield.break
    item_damage:
      threshold: 3
      base: 1
      factor: 1
    damage_reductions:
      - base: 0
        factor: 0.5
        horizontal_blocking: 90
`),
    };
  });

  gear('verify_spear', 'Verify spear', 'TRIDENT', flatModel('verify_spear', 'handheld'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Components:
  max_damage: 250
  kinetic_weapon:
    contact_cooldown: 10t
    delay: 0t
    damage_multiplier: 1.5
    knockback_conditions:
      max_duration: 2s
      min_speed: 0.5
  piercing_weapon:
    deals_knockback: true
    dismounts: false
  interact_animation:
    type: STAB
    duration: 8t
Mechanics:
  trident: {}
`),
    };
  });

  gear('verify_snack', 'Verify snack', 'COOKED_BEEF', flatModel('verify_snack'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Components:
  max_stack_size: 16
  food:
    nutrition: 6
    saturation: 7.5
    can_always_eat: true
  consumable:
    consume_duration: 2s
    animation: EAT
    sound: entity.generic.eat
    consume_particles: true
    effects:
      APPLY_EFFECTS:
        speed:
          duration: 10s
          amplifier: 1
          probability: 0.8
      REMOVE_EFFECTS: [poison]
      PLAY_SOUND:
        sound: entity.player.burp
  use_remainder:
    minecraft_type: BOWL
    amount: 1
  cooking_fuel:
    burn_time: 10s
  compostable:
    layers: 2
  brewing_fuel:
    uses: 2
`),
    };
  });

  gear('verify_wings', 'Verify wings', 'ELYTRA', flatModel('verify_wings'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Components:
  glider: true
  equippable:
    slot: CHEST
    damage_on_hurt: true
    swappable: true
    equip_on_interact: true
  death_protection:
    death_effects:
      CLEAR_ALL_EFFECTS: {}
      TELEPORT_RANDOMLY:
        diameter: 16
  enchantment_glint_override: true
  fire_resistant: true
`),
    };
  });

  gear('verify_horn', 'Verify horn', 'GOAT_HORN', flatModel('verify_horn'), (item) => {
    item.config = { ...item.config, ...yaml(`Components:\n  instrument: minecraft:sing_goat_horn\n  tooltip_style: minecraft:verify\n`) };
  });

  gear('verify_head', 'Verify head', 'PLAYER_HEAD', null, (item) => {
    item.config = { ...item.config, ...yaml(`Components:\n  profile:\n    name: Notch\n  hide_tooltip: false\n`) };
  });

  gear('verify_dye', 'Verify dye', 'LEATHER_HORSE_ARMOR', flatModel('verify_dye'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
color: 120, 40, 200
trim_pattern: minecraft:coast
trim_material: minecraft:gold
StoredEnchantments:
  mending: 1
PotionEffects:
  - type: speed
    duration: 30s
    amplifier: 0
Components:
  unset_components: [minecraft:attribute_modifiers]
  can_place_on:
    block: minecraft:stone
`),
    };
  });

  const bow = gear('verify_bow', 'Verify bow', 'BOW', flatModel('verify_bow'), (item) => {
    item.variants = { pulling_models: [flatModel('verify_bow_0'), flatModel('verify_bow_1'), flatModel('verify_bow_2')] };
  });
  bow.config.Pack = { oversized_in_gui: true, hand_swap_animation: false };

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
  });

  gear('verify_helmet', 'Verify helmet', 'IRON_HELMET', flatModel('verify_helmet'), (item) => {
    item.assets = { layer: createTexture('layer', 'verify_armor_layer.png', png(90, 64, 32)) };
    item.armor = { set: 'verify', layer1: '@asset:layer', layer2: '@asset:layer' };
  });
  gear('verify_chestplate', 'Verify chestplate', 'IRON_CHESTPLATE', flatModel('verify_chestplate'), (item) => {
    item.assets = { layer: createTexture('layer', 'verify_armor_layer.png', png(90, 64, 32)) };
    item.armor = { set: 'verify', layer1: '@asset:layer', layer2: '@asset:layer' };
  });

  /* ------------------------------------------------------------------ mechanics */
  const tools = folder(project, 'Mechanics');

  tools('verify_pickaxe', 'Verify pickaxe', 'DIAMOND_PICKAXE', flatModel('verify_pickaxe', 'handheld'), (item) => {
    item.rawYaml = 'Mechanics:\n  durability:\n    value: 2000\n';
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  harvesting:
    radius: 2
    height: 1
    cooldown: 1000
  smelting:
    play_sound: true
  repair:
    ratio: 0.25
  misc:
    prevent_renaming: true
    burns_in_fire: false
  soulbound:
    lose_chance: 0.1
`),
    };
  });

  tools('verify_backpack', 'Verify backpack', 'PAPER', flatModel('verify_backpack'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  backpack:
    rows: 3
    title: <gray>Backpack
  commands:
    console: ['say %p% opened a backpack']
    cooldown: 1000
`),
    };
  });

  tools('verify_scroll', 'Verify scroll', 'PAPER', flatModel('verify_scroll'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  custom:
    rightclick:
      event: CLICK:right:all
      one_usage: false
      actions:
        - '[message] <green>Hello <player>!'
  itemtype:
    value: verify scroll
`),
    };
  });

  tools('verify_goggles', 'Verify goggles', 'LEATHER_HELMET', flatModel('verify_goggles'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Components:
  equippable:
    slot: HEAD
Mechanics:
  armor_effects:
    night_vision:
      duration: 10t
      amplifier: 0
      ambient: true
      particles: false
      icon: true
`),
    };
  });

  /* ------------------------------------------------------------------ custom blocks */
  const blocks = folder(project, 'Blocks');

  blocks('verify_ore', 'Verify ore', 'PAPER', blockModel('verify_ore', 'cube_all', ['all']), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  custom_block:
    type: NOTEBLOCK
    custom_variation: 1
    model: '@model'
    hardness: 3
    blast_resistant: true
    instrument: block.note_block.bell
    can_ignite: false
    block_sounds:
      place_sound: block.stone.place
      break_sound: block.stone.break
    drop:
      silktouch: true
      fortune: true
      loots:
        - nexo_item: verify_blade
          probability: 0.1
    limited_placing:
      type: ALLOW
      floor: true
      roof: false
      wall: true
      block_types: [STONE, DIRT]
`),
    };
  });

  blocks('verify_log', 'Verify log', 'PAPER', blockModel('verify_log', 'cube_column', ['end', 'side']), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  custom_block:
    type: NOTEBLOCK
    custom_variation: 2
    model: '@model'
    hardness: 2
    directional:
      type: LOG
      y_variation: 2
      x_variation: 3
      z_variation: 4
    log_strip:
      stripped_log: verify_ore
      decrease_axe_durability: true
`),
    };
  });

  blocks('verify_crate', 'Verify crate', 'PAPER', blockModel('verify_crate', 'cube_bottom_top', ['top', 'bottom', 'side']), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  custom_block:
    type: NOTEBLOCK
    custom_variation: 5
    model: '@model'
    hardness: 1
    storage:
      type: STORAGE
      rows: 3
      title: <gray>Crate
      open_sound: block.barrel.open
      close_sound: block.barrel.close
`),
    };
  });

  blocks('verify_grass', 'Verify grass', 'PAPER', blockModel('verify_grass', 'cross', ['cross']), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  custom_block:
    type: STRINGBLOCK
    custom_variation: 1
    model: '@model'
    hardness: 0
    placeable_on_water: false
    is_tall: false
    random_place: [verify_grass]
`),
    };
  });

  blocks('verify_crystal', 'Verify crystal', 'PAPER', blockModel('verify_crystal', 'cube_all', ['all']), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  custom_block:
    type: CHORUSBLOCK
    custom_variation: 1
    model: '@model'
    hardness: 2
    is_falling: true
`),
    };
  });

  /* ------------------------------------------------------------------ furniture */
  const furniture = folder(project, 'Furniture');

  furniture('verify_chair', 'Verify chair', 'PAPER', flatModel('verify_chair'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  furniture:
    properties:
      display_transform: FIXED
      scale: 1,1,1
      translation: 0,0.5,0
      tracking_rotation: FIXED
      brightness:
        block_light: 15
        sky_light: 15
    hitbox:
      barriers: ['0,0,0']
      interactions: ['0,1,0 1,1']
      shulkers: ['1,0,0 1 1 UP true']
      ghasts: ['0,2,0 0.25 90 true']
    seats: ['0,0.5,0']
    rotatable:
      rotatable: true
      on_sneak: true
    restricted_rotation: STRICT
    waterloggable: true
    hardness: 2
    drop:
      silktouch: false
      loots:
        - nexo_item: verify_chair
          probability: 1
`),
    };
  });

  furniture('verify_lamp', 'Verify lamp', 'PAPER', flatModel('verify_lamp'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  furniture:
    hitbox:
      barriers: ['0,0,0']
    lights:
      lights: ['0,1,0 15', '1,0,0 10']
      toggleable: true
    rotatable: true
`),
    };
  });

  furniture('verify_cabinet', 'Verify cabinet', 'PAPER', flatModel('verify_cabinet'), (item) => {
    item.config = {
      ...item.config,
      ...yaml(`
Mechanics:
  furniture:
    hitbox:
      barriers: ['0..1,0,0']
    storage:
      type: STORAGE
      rows: 2
      title: <gray>Cabinet
    beds: ['0,0,0 true false']
    preview_placement:
      enabled: true
`),
    };
  });

  /* ------------------------------------------------------------------ recipes of every Nexo type */
  const materials = folder(project, 'Materials');
  materials('verify_ingot', 'Verify ingot', 'IRON_INGOT', flatModel('verify_ingot'), (item) => {
    item.recipes = [
      recipe('shaped', 'r_shaped', (r) => {
        r.grid = ['A', 'A', '', 'A', 'B', '', '', '', ''];
        r.ingredients = { A: vanilla('IRON_INGOT'), B: vanilla('GOLD_INGOT', { amount: 2 }) };
        r.options = { group: 'verify', category: 'MISC', permission: 'verify.craft' };
      }),
      recipe('shapeless', 'r_shapeless', (r) => {
        r.ingredients = { A: vanilla('IRON_NUGGET'), B: { source: 'tag', id: 'minecraft:planks' } };
        r.resultAmount = 2;
      }),
      recipe('furnace', 'r_furnace', (r) => {
        r.input = vanilla('RAW_IRON');
        r.options = { category: 'MISC' };
      }),
      recipe('blasting', 'r_blasting', (r) => (r.input = vanilla('IRON_ORE'))),
      recipe('smoking', 'r_smoking', (r) => (r.input = vanilla('ROTTEN_FLESH'))),
      recipe('campfire', 'r_campfire', (r) => (r.input = vanilla('KELP'))),
      recipe('stonecutting', 'r_stonecutting', (r) => (r.input = vanilla('IRON_BLOCK'))),
      recipe('crafter', 'r_crafter', (r) => {
        r.grid = ['A', '', '', '', 'A', '', '', '', 'A'];
        r.ingredients = { A: vanilla('COPPER_INGOT') };
      }),
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
        r.options = { copy_components: true };
      }),
      recipe('transmute', 'r_transmute', (r) => {
        r.input = vanilla('IRON_INGOT');
        r.slots = { material: vanilla('REDSTONE') };
        r.options = { preserve: ['minecraft:custom_name'] };
      }),
      recipe('anvil', 'r_anvil', (r) => {
        r.input = own('verify_blade');
        r.slots = { material: vanilla('DIAMOND') };
        r.options = { cost: 3, repair: 100 };
      }),
    ];
  });
  materials('verify_trim_template', 'Verify trim template', 'COAST_ARMOR_TRIM_SMITHING_TEMPLATE', flatModel('verify_trim'), (item) => {
    item.recipes = [
      recipe('smithing_trim', 'r_trim', (r) => {
        r.slots = {
          template: own('verify_trim_template'),
          base: { source: 'tag', id: 'minecraft:trimmable_armor' },
          addition: vanilla('DIAMOND'),
        };
        r.options = { trim_pattern: 'minecraft:coast' };
      }),
    ];
  });

  /* ------------------------------------------------------------------ media */
  const heart = createGlyph('g1', 'verify_heart', glyphFileFromDataUrl('verify_heart.png', png(200, 8, 8)));
  heart.placeholders = ['<3'];
  heart.char = '';
  heart.shadow = '#80000000';
  heart.tabcomplete = true;
  const banner = createGlyph('g2', 'verify_banner', glyphFileFromDataUrl('verify_banner.png', png(201, 64, 16)));
  banner.permission = 'verify.banner';
  project.glyphs = [heart, banner];

  const chime = createSound('s1', 'block.verify.chime', [{ name: 'chime.ogg', dataUrl: OGG, size: 64 }]);
  chime.volume = 0.8;
  chime.preload = true;
  chime.subtitle = 'subtitles.verify.chime';
  const song = createSound('s2', 'music.verify', [{ name: 'song.ogg', dataUrl: OGG, size: 64 }]);
  song.stream = true;
  song.jukebox = { duration: '30s', description: 'Verify song', comparatorOutput: 7, range: 64 };
  const echo = createSound('s3', 'block.verify.echo', []);
  echo.reference = 'verifynexo:block.verify.chime';
  const silence = createSound('s4', 'block.note_block.harp', []);
  silence.replace = true;
  project.sounds = [chime, song, echo, silence];

  const sunset = createPainting('p1', 'verify_sunset', { name: 'verify_sunset.png', dataUrl: png(220, 32, 16), width: 32, height: 16 });
  sunset.title = 'Sunset';
  sunset.author = 'Verify';
  project.paintings = [sunset];

  const notice = createDialog('d1', 'verify_notice');
  const confirm = createDialog('d2', 'verify_confirm');
  confirm.config = yaml(`
type: CONFIRM
yesButton:
  label: <green>Yes
  tooltip: Accept
  action:
    type: RUN_COMMAND
    command: say yes
noButton:
  label: <red>No
base:
  title: Confirm
  canCloseWithEscape: true
  afterAction: CLOSE
  bodies:
    text:
      type: MESSAGE
      message: <gray>Do you agree?
`);
  const form = createDialog('d3', 'verify_form');
  form.config = yaml(`
type: MULTI
columns: 2
actions:
  - label: Submit
    action:
      type: DYNAMIC_RUN_COMMAND
      template: say $(name) $(age)
  - label: Help
    action:
      type: RUN_COMMAND
      command: dialog show @s nexo:verify_notice
exitAction:
  label: Close
base:
  title: Form
  inputs:
    name:
      type: TEXT
      label: Name
      maxLength: 16
    age:
      type: NUMBER
      label: Age
      start: 1
      end: 99
      step: 1
    agree:
      type: BOOL
      label: Agree
    color:
      type: SINGLE
      label: Colour
      options:
        red:
          display: Red
          initial: true
        blue:
          display: Blue
`);
  const list = createDialog('d4', 'verify_list');
  list.config = yaml(`
type: LIST
dialogs: [nexo:verify_notice, nexo:verify_confirm]
buttonWidth: 150
base:
  title: All dialogs
`);
  project.dialogs = [notice, confirm, form, list];

  return withoutUnsupported(project);
}
