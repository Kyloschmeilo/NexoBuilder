/**
 * The form fields of the CraftEngine furniture and block entity renderer keys the hand-written editors show through
 * the generic field renderer: the display parameters of an element beyond its transform, a hitbox's flags, a
 * variant's extras, the furniture's settings and entity culling, and the list of furniture behaviors. Each field is
 * shown under its YAML key; its texts live in `ceSchema` under `furniture.*` (one scope for furniture and renderers).
 *
 * Keys and defaults come from the 26.9 plugin source (the furniture and block entity element configs, the hitbox
 * configs, AbstractFurnitureManager, FurnitureSettingsModifiers); the random `offset` of renderer elements only from
 * the wiki (newer than 26.9).
 */
import { field, type FieldSpecs, resolveFields } from '../form/build';
import type { Field, TypedListField } from '../form/fields';
import { plainOptions } from '../form/options';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CE_DOCS } from './form/schema/docs';
import { CE_FURNITURE_BEHAVIORS, hitboxFieldSpecs, soundFieldSpec, withKeyNames } from './logic';
import { conditionList } from './logic/shared';

/** Where an element is shown: in a furniture variant or in a block's entity renderer (they read a few keys apart). */
export type DisplayElementContext = 'furniture' | 'renderer';

/** The legacy color names an armor stand's `glow_color` takes (LegacyChatFormatter). */
export const CE_LEGACY_GLOW_COLORS = [
  'black',
  'dark_blue',
  'dark_green',
  'dark_aqua',
  'dark_red',
  'dark_purple',
  'gold',
  'gray',
  'dark_gray',
  'blue',
  'green',
  'aqua',
  'red',
  'light_purple',
  'yellow',
  'white',
] as const;

/** The alignments of a text display's lines. */
export const CE_TEXT_ALIGNMENTS = ['center', 'left', 'right'] as const;

/** The element types that are display entities (with brightness, glow, shadows and view range). */
const DISPLAYS = ['item_display', 'block_display', 'text_display'];
/** The element types that show an item (and can copy data from the furniture's item or tint it). */
const ITEMS = ['item_display', 'item', 'armor_stand'];
/** The element types with a yaw and a pitch of their own (all but dropped items). */
const TURNABLE = ['item_display', 'block_display', 'text_display', 'armor_stand', 'better_model', 'model_engine'];

const whenType = (types: readonly string[]) => ({ showIf: { key: 'type', values: [...types] } });
const isObject = (value: unknown) => isPlainObject(value);

/** The display element keys of a context, each with the wiki section that describes it. */
function elementSpecs(context: DisplayElementContext): FieldSpecs {
  const page = context === 'furniture' ? CE_DOCS.furnitureVariants : CE_DOCS.entityRenderer;
  const at = (anchor: string) => ({ docs: `${page}#${anchor}` });
  const display = at('display-parameters');
  const text = at(context === 'furniture' ? 'text-display' : 'text_display');
  const armorStand = at(context === 'furniture' ? 'armor-stand' : 'armor_stand');
  const betterModel = at(context === 'furniture' ? 'bettermodel' : 'better_model-bettermodel');
  return {
    yaw: field.number({ ...whenType(TURNABLE), ...display }),
    pitch: field.number({ ...whenType(TURNABLE), ...display }),
    glow_color: field.text({ format: 'color', placeholder: true, ...whenType(DISPLAYS), ...display }),
    brightness: field.object(
      {
        block_light: field.number({ integer: true, min: 0, max: 15 }),
        sky_light: field.number({ integer: true, min: 0, max: 15 }),
      },
      { ...whenType(DISPLAYS), ...display },
    ),
    view_range: field.number({ min: 0, placeholder: true, advanced: true, ...whenType(DISPLAYS), ...display }),
    shadow_radius: field.number({ min: 0, placeholder: true, advanced: true, ...whenType(DISPLAYS), ...display }),
    shadow_strength: field.number({ min: 0, placeholder: true, advanced: true, ...whenType(DISPLAYS), ...display }),
    line_width: field.number({ integer: true, min: 0, placeholder: true, ...whenType(['text_display']), ...text }),
    background_color: field.text({ placeholder: true, help: true, ...whenType(['text_display']), ...text }),
    text_opacity: field.number({ integer: true, min: -1, max: 255, placeholder: true, ...whenType(['text_display']), ...text }),
    has_shadow: field.boolean({ defaultHint: false, ...whenType(['text_display']), ...text }),
    is_see_through: field.boolean({ defaultHint: false, ...whenType(['text_display']), ...text }),
    use_default_background_color: field.boolean({ defaultHint: false, ...whenType(['text_display']), ...text }),
    alignment: field.select(plainOptions(CE_TEXT_ALIGNMENTS), { ...whenType(['text_display']), ...text }),
    small: field.boolean({ defaultHint: false, ...whenType(['armor_stand']), ...armorStand }),
    sight_trace: field.boolean({ defaultHint: true, ...whenType(['better_model']), ...betterModel }),
    ...(context === 'furniture'
      ? {
          tints: field.objectList(
            {
              source: field.text({ format: 'resource', placeholder: true }),
              bones: field.stringList(),
              children: field.boolean({ defaultHint: true }),
            },
            { advanced: true, ...whenType(['better_model']), ...betterModel },
          ),
          copy_data: field.stringList({
            format: 'resource',
            help: true,
            suggestions: plainOptions(['minecraft:dyed_color', 'minecraft:firework_explosion', 'minecraft:profile']),
            advanced: true,
            ...whenType(ITEMS),
            ...at('item-display'),
          }),
        }
      : {
          tint_source: field.choice(
            {
              components: {
                field: field.stringList({ format: 'resource', singleAsString: true }),
                matches: (value) => typeof value === 'string' || Array.isArray(value),
                newValue: () => 'minecraft:dyed_color',
              },
              detailed: {
                field: field.object({
                  components: field.stringList({ format: 'resource' }),
                  index: field.number({ integer: true, min: 0 }),
                }),
                matches: isObject,
                newValue: () => ({ components: ['minecraft:dyed_color'] }),
              },
            },
            { help: true, advanced: true, ...whenType(ITEMS), ...at('tint-source') },
          ),
          offset: field.object(
            {
              type: field.select(plainOptions(['xz', 'xyz'])),
              horizontal: field.number({ min: 0 }),
              vertical: field.number({ min: 0, showIf: { key: 'type', values: ['xyz'] } }),
            },
            { help: true, advanced: true, ...at('random-offset') },
          ),
        }),
    conditions: { ...conditionList(), help: true, advanced: true, ...at('conditions') },
  };
}

/** The keys an armor stand reads differently: `glow_color` is a color name, `scale` a single number. */
function armorStandSpecs(context: DisplayElementContext): FieldSpecs {
  const docs = context === 'furniture' ? `${CE_DOCS.furnitureVariants}#armor-stand` : `${CE_DOCS.entityRenderer}#armor_stand`;
  return {
    scale: field.number({ min: 0, placeholder: true, ...whenType(['armor_stand']), docs }),
    glow_color: field.select(plainOptions(CE_LEGACY_GLOW_COLORS), { ...whenType(['armor_stand']), docs }),
  };
}

const named = (specs: FieldSpecs, scope: string): Field[] => withKeyNames(resolveFields(specs, scope));

/**
 * The keys of a display element beyond its type, item, position and transform, each shown (`showIf`) for the
 * element types that read it. The editor passes the element with its type written out as the siblings.
 */
export function displayElementFields(context: DisplayElementContext): Field[] {
  return [...named(armorStandSpecs(context), 'furniture.armorStand'), ...named(elementSpecs(context), 'furniture.element')];
}

/** The display element fields of a furniture variant's elements. */
export const CE_FURNITURE_ELEMENT_FIELDS = displayElementFields('furniture');
/** The display element fields of a block entity renderer's elements. */
export const CE_RENDERER_ELEMENT_FIELDS = displayElementFields('renderer');

/** The hitbox keys the hitbox card shows below its own fields: the flags every type or only some types read. */
const HITBOX_FLAG_KEYS = ['can_use_item_on', 'can_be_hit_by_projectile', 'invisible', 'interaction_entity', 'hard_collision'];

/** The flags of a hitbox the hitbox card adds, each shown for the hitbox types that read it. */
export const CE_HITBOX_FLAG_FIELDS: Field[] = named(hitboxFieldSpecs(), 'furniture.hitbox')
  .filter((f) => HITBOX_FLAG_KEYS.includes(f.key))
  .map((f) => ({ ...f, docs: `${CE_DOCS.furnitureVariants}#hitboxes` }));

/** The keys of a variant besides its elements and hitboxes. */
export const CE_FURNITURE_VARIANT_FIELDS: Field[] = named(
  {
    loot_spawn_offset: field.text({ format: 'vector', placeholder: true, help: true, docs: `${CE_DOCS.furnitureVariants}#introduction` }),
    blueprint: field.text({ placeholder: true, help: true, advanced: true, docs: `${CE_DOCS.furnitureVariants}#external-models` }),
    entity_culling: field.choice(
      {
        toggle: { field: field.boolean(), matches: (value) => typeof value === 'boolean', newValue: () => false },
        custom: {
          field: field.object({
            aabb: field.text({ placeholder: true }),
            view_distance: field.number({ integer: true, min: -1 }),
            aabb_expansion: field.number({ min: 0, placeholder: true }),
            ray_tracing: field.boolean({ defaultHint: true }),
          }),
          matches: isObject,
          newValue: () => ({ ray_tracing: true }),
        },
      },
      { help: true, advanced: true, docs: `${CE_DOCS.furnitureVariants}#entity-culling` },
    ),
  },
  'furniture.variant',
);

const settingDocs = (anchor: string) => ({ docs: `${CE_DOCS.furnitureSettings}#${anchor}` });

/** The furniture settings besides `hit_times` and `item` (which the export fills in). */
export const CE_FURNITURE_SETTINGS_FIELDS: Field[] = named(
  {
    sounds: field.object({ break: soundFieldSpec(), place: soundFieldSpec(), hit: soundFieldSpec() }, settingDocs('sounds')),
    adventure_mode_breaking: field.boolean({ defaultHint: false, ...settingDocs('adventure_mode_breaking') }),
    correct_tools: field.stringList({
      format: 'resource',
      help: true,
      suggestions: plainOptions(['#minecraft:axes', '#minecraft:pickaxes', '#minecraft:shovels', '#minecraft:hoes']),
      ...settingDocs('correct_tools'),
    }),
  },
  'furniture.settings',
);

/** The furniture's behaviors (`behaviors`), a list over the furniture behavior catalog. */
export const CE_FURNITURE_BEHAVIOR_LIST: TypedListField = {
  type: 'typedList',
  key: 'behaviors',
  label: 'furniture.behaviors.label',
  help: 'furniture.behaviors.help',
  catalog: 'furnitureBehaviors',
  types: () => CE_FURNITURE_BEHAVIORS,
  docs: CE_DOCS.furnitureBehaviors,
};

/** Every field of the furniture and renderer editors (for the message and docs checks). */
export const CE_FURNITURE_EDITOR_FIELDS: Field[] = [
  ...CE_FURNITURE_ELEMENT_FIELDS,
  ...CE_RENDERER_ELEMENT_FIELDS,
  ...CE_HITBOX_FLAG_FIELDS,
  ...CE_FURNITURE_VARIANT_FIELDS,
  ...CE_FURNITURE_SETTINGS_FIELDS,
  CE_FURNITURE_BEHAVIOR_LIST,
];
