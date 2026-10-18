/**
 * The function (action) types of events (`CommonFunctions`, checked against the plugin's registry; 50 built in, with
 * `alternatives` registered as a second name of `if_else`) plus the five CraftEngine registers for other plugins
 * (`take_money`/`give_money` with Vault, `mythic_mobs_skill`/`cast_mythic_skill`/`spawn_mythic_mob` with MythicMobs).
 * Every function takes `conditions`; those acting on players take a `target`. No function is Premium only.
 */
import { field, type FieldSpecs } from '../../form/build';
import { plainOptions } from '../../form/options';
import { categorized, logicCatalog, type LogicTypeSpec } from './catalog';
import { particleFields } from './particles';
import { equipmentSlot, functionList, gate, hand, lootTable, numberProvider, placement, playerTarget, position, resource } from './shared';

const text = () => field.text({ format: 'minimessage' });
const add = () => field.boolean({ defaultHint: false, help: true, scope: 'logic.shared.add' });
const flags = () => numberProvider();
const branches = () => field.objectList({ conditions: gate(), functions: functionList() });

/** A function type: its own keys, then `target` (when it acts on players) and `conditions` */
function fn(type: string, fields: FieldSpecs = {}, players = false): LogicTypeSpec {
  return { type, fields: { ...fields, ...(players && { target: playerTarget() }), conditions: gate() } };
}

/** The catalog categories (`logic.categories.functions.<category>`) and the functions listed under each */
const CATEGORIES = {
  messages: ['message', 'actionbar', 'title', 'toast', 'open_window', 'close_inventory', 'merchant_trade'],
  player: [
    'potion_effect',
    'remove_potion_effect',
    'damage',
    'heal',
    'set_food',
    'set_saturation',
    'set_exp',
    'set_level',
    'leveler_exp',
    'teleport',
    'transfer',
    'set_cooldown',
    'remove_cooldown',
    'discover_recipe',
    'swing_hand',
  ],
  effects: ['play_sound', 'particle', 'play_totem_animation'],
  item: ['set_item_cooldown', 'set_count', 'damage_item', 'clear_item', 'drop_loot'],
  world: [
    'place_block',
    'break_block',
    'update_block_property',
    'transform_block',
    'cycle_block_property',
    'update_interaction_tick',
    'remove_entity',
  ],
  furniture: ['spawn_furniture', 'replace_furniture', 'remove_furniture', 'rotate_furniture', 'set_furniture_variant'],
  flow: ['command', 'run', 'if_else', 'alternatives', 'when', 'set_variable', 'cancel_event', 'js'],
  plugins: ['take_money', 'give_money', 'mythic_mobs_skill', 'cast_mythic_skill', 'spawn_mythic_mob'],
};

export const CE_FUNCTIONS = logicCatalog(
  'functions',
  categorized(
    [
      fn('command', { command: field.stringList({ singleAsString: true }), as_player: add(), as_op: add(), as_event: add() }, true),
      fn('message', { message: field.stringList({ format: 'minimessage', singleAsString: true }), overlay: field.boolean() }, true),
      fn('actionbar', { actionbar: text() }, true),
      fn('title', { title: text(), subtitle: text(), fade_in: numberProvider(), stay: numberProvider(), fade_out: numberProvider() }, true),
      fn('toast', { toast: text(), item: resource(), advancement_type: field.select(plainOptions(['task', 'challenge', 'goal'])) }, true),
      fn(
        'open_window',
        {
          gui_type: field.select(plainOptions(['anvil', 'cartography', 'enchantment', 'grindstone', 'loom', 'smithing', 'crafting'])),
          title: text(),
        },
        true,
      ),
      fn('close_inventory', {}, true),
      fn('merchant_trade', { title: text(), offers: field.yaml({ help: true }) }, true),
      fn(
        'play_sound',
        {
          sound: resource(),
          volume: numberProvider(),
          pitch: numberProvider(),
          source: field.select(
            plainOptions(['master', 'music', 'record', 'weather', 'block', 'hostile', 'neutral', 'player', 'ambient', 'voice', 'ui']),
          ),
          ...position(),
        },
        true,
      ),
      fn('particle', particleFields()),
      fn(
        'potion_effect',
        {
          potion_effect: resource(),
          duration: numberProvider(),
          amplifier: numberProvider(),
          ambient: field.boolean(),
          particles: field.boolean(),
          show_icon: field.boolean(),
        },
        true,
      ),
      fn('remove_potion_effect', { potion_effect: resource(), all: field.boolean() }, true),
      fn('damage', { amount: numberProvider(), damage_type: resource() }, true),
      fn('heal', { amount: numberProvider() }, true),
      fn('set_food', { food: numberProvider(), add: add() }, true),
      fn('set_saturation', { saturation: numberProvider(), add: add() }, true),
      fn('set_exp', { exp: numberProvider(), add: add() }, true),
      fn('set_level', { level: numberProvider(), add: add() }, true),
      fn('leveler_exp', { plugin: field.text(), leveler: field.text(), count: numberProvider() }, true),
      fn('teleport', { world: field.text(), ...placement() }, true),
      fn('transfer', { host: field.text(), port: field.number({ integer: true, min: 1, max: 65535 }), server: field.text() }),
      fn('set_cooldown', { id: field.text(), time: field.text({ format: 'duration' }), add: add() }, true),
      fn('remove_cooldown', { id: field.text(), all: field.boolean() }, true),
      fn('set_item_cooldown', { id: resource(), time: field.text({ format: 'duration' }), add: add() }, true),
      fn('discover_recipe', { recipe: resource() }, true),
      fn(
        'play_totem_animation',
        { item: resource(), sound: resource(), volume: numberProvider(), pitch: numberProvider(), silent: field.boolean() },
        true,
      ),
      fn('swing_hand', { hand: hand() }),
      fn('set_count', { count: numberProvider(), add: add() }),
      fn('damage_item', { amount: numberProvider(), slot: equipmentSlot() }),
      fn('clear_item', { item: resource(), count: numberProvider() }),
      fn('drop_loot', { loot: lootTable(), to_inventory: field.boolean(), ...position() }),
      fn('cancel_event'),
      fn('run', { functions: functionList(), delay: numberProvider() }),
      fn('if_else', { rules: branches() }),
      fn('alternatives', { rules: branches() }),
      fn('when', {
        source: field.text({ placeholder: true }),
        cases: field.objectList({ when: field.stringList({ singleAsString: true }), functions: functionList() }),
        fallback: functionList(),
      }),
      fn('set_variable', {
        name: field.text(),
        value_type: field.select(plainOptions(['int', 'double', 'string'])),
        number: numberProvider(),
        text: field.text(),
      }),
      fn('place_block', { block_state: field.text({ placeholder: true }), ...position(), update_flags: flags() }),
      fn('break_block', position()),
      fn('update_block_property', { properties: field.map(field.text(), { keyPlaceholder: true }), ...position(), update_flags: flags() }),
      fn('transform_block', {
        block: resource(),
        properties: field.map(field.text(), { keyPlaceholder: true }),
        ...position(),
        update_flags: flags(),
      }),
      fn('cycle_block_property', {
        property: field.text(),
        inverse: numberProvider(),
        rules: field.map(field.text(), { keyPlaceholder: true }),
        ...position(),
        update_flags: flags(),
      }),
      fn('update_interaction_tick'),
      fn('spawn_furniture', { furniture_id: resource(), variant: field.text(), ...placement(), play_sound: field.boolean() }),
      fn('replace_furniture', {
        furniture_id: resource(),
        variant: field.text(),
        ...placement(),
        drop_loot: field.boolean(),
        play_sound: field.boolean(),
      }),
      fn('remove_furniture', { drop_loot: field.boolean(), play_sound: field.boolean() }),
      fn('rotate_furniture', { degree: numberProvider(), on_success: functionList(), on_failure: functionList() }),
      fn('set_furniture_variant', { variant: field.text(), force: field.boolean() }),
      fn('remove_entity'),
      fn('js', { script: field.text({ multiline: true }), function: field.text({ placeholder: true }), args: field.yaml() }),
      fn('take_money', { amount: numberProvider() }, true),
      fn('give_money', { amount: numberProvider() }, true),
      fn('mythic_mobs_skill', { skill: field.text(), power: numberProvider(), parameters: field.yaml(), variables: field.yaml() }),
      fn('cast_mythic_skill', { skill: field.text(), power: numberProvider(), parameters: field.yaml(), variables: field.yaml() }),
      fn('spawn_mythic_mob', { mob: field.text(), level: numberProvider(), world: field.text(), ...placement() }),
    ],
    CATEGORIES,
  ),
);
