/**
 * Links into the Nexo documentation (a GitBook site): the page or section of every item property, of the furniture
 * and custom block options, of the model variants, the armor layers, the media pages and the recipe types. Every
 * anchor is a heading id of the published page; a feature without a heading of its own links to its page.
 */
import type { MediaKind } from '../../../project/media/kinds';
import type { ArmorLayerDef } from '../../../project/armor';
import type { RecipeType } from '../../../project/recipes/model';
import type { VariantSlot } from '../../../project/variants';

/** The documentation's base URL; every Nexo docs link starts with it. */
export const NEXO_DOCS_URL = 'https://docs.nexomc.com/';

const DOCS = NEXO_DOCS_URL.slice(0, -1);
const ITEMS = `${DOCS}/configuration/items`;
const APPEARANCE = `${ITEMS}/item-appearance`;
const ARMOR = `${DOCS}/configuration/custom-armors`;
const MOB_ARMOR = `${DOCS}/configuration/custom-mob-armor-1.21.2+`;
const PAINTINGS = `${DOCS}/configuration/custom-paintings`;
const MUSIC_DISCS = `${DOCS}/configuration/custom-music-discs`;
const ELYTRAS = `${DOCS}/configuration/custom-elytras-1.21.2+`;
const FURNITURE = `${DOCS}/mechanics/furniture-mechanic`;
const BLOCKS = `${DOCS}/mechanics/custom-block-mechanics`;
const NOTEBLOCK = `${BLOCKS}/noteblock-mechanic`;
const STRINGBLOCK = `${BLOCKS}/stringblock-mechanic`;
const ALL_MECHANICS = `${DOCS}/mechanics/all-mechanics`;
const CLICK_ACTIONS = `${DOCS}/mechanics/clickaction-mechanic`;
const FAQ = `${DOCS}/general-usage/faq`;
const GLYPHS = `${DOCS}/configuration/glyphs`;
const RECIPES = `${DOCS}/general-usage/recipes`;

/** The Nexo documentation pages and sections the editor links to */
export const NEXO_DOCS = {
  /** Item root keys (configuration/items) */
  items: {
    page: ITEMS,
    itemName: `${ITEMS}#item-name`,
    material: `${ITEMS}#material`,
    lore: `${ITEMS}#lore`,
    unbreakable: `${ITEMS}#unbreakable`,
    excludeFromInventory: `${ITEMS}#excludefrominventory`,
    template: `${ITEMS}#itemtemplate`,
    itemFlags: `${ITEMS}#itemflags`,
    persistentData: `${ITEMS}#persistentdata`,
    color: `${ITEMS}#color`,
    customModelData: `${ITEMS}#how-do-i-set-a-specific-custommodeldata`,
    attributeModifiers: `${ITEMS}#attributemodifiers`,
    enchantments: `${ITEMS}#enchantments`,
    disableEnchanting: `${ITEMS}#disable-enchanting`,
    /** `injectId: false` keeps helper items out of Nexo's item registry (shown with Carpentry doors) */
    injectId: `${DOCS}/addons/carpentry#custom-doors`,
    trims: `${DOCS}/configuration/trims`,
  },
  appearance: {
    page: APPEARANCE,
    oversizedInGui: `${APPEARANCE}#oversized-items-in-gui-1.21.6`,
    invisibleItem: `${APPEARANCE}#invisible-item`,
  },
  components: `${ITEMS}/components`,
  playerHeads: `${ITEMS}/2d-player-heads`,
  armor: {
    page: ARMOR,
    equippable: `${ARMOR}#the-equippable-component`,
    equipmentModels: `${ARMOR}#custom-equipmentmodels`,
    elytras: ELYTRAS,
    mobArmor: MOB_ARMOR,
    harness: `${MOB_ARMOR}/custom-harness-1.21.6+`,
    saddles: `${MOB_ARMOR}/custom-saddles-1.21.5+`,
  },
  musicDiscs: MUSIC_DISCS,
  paintings: { page: PAINTINGS, item: `${PAINTINGS}#nexoitem`, animated: `${PAINTINGS}#animated-paintings` },
  furniture: {
    page: FURNITURE,
    hitbox: `${FURNITURE}/hitbox`,
    barriers: `${FURNITURE}/hitbox/barrier-hitbox`,
    interactions: `${FURNITURE}/hitbox/interaction-hitbox`,
    shulkers: `${FURNITURE}/hitbox/shulker-hitbox`,
    ghasts: `${FURNITURE}/hitbox/ghast-hitbox`,
    properties: `${FURNITURE}#furniture-properties`,
    displayTransform: `${FURNITURE}#display-transform`,
    trackingRotation: `${FURNITURE}#tracking-rotation-billboard`,
    translation: `${FURNITURE}#translation`,
    brightness: `${FURNITURE}#brightness`,
    scale: `${FURNITURE}#scale`,
    rotation: `${FURNITURE}#rotation`,
    offsetAgainstBlocks: `${FURNITURE}#offset-against-blocks`,
    otherProperties: `${FURNITURE}#other-properties`,
    culling: `${FURNITURE}/furniture-culling#per-furniture-properties`,
    rotatable: `${FURNITURE}#rotatable`,
    restrictedRotation: `${FURNITURE}#restrict-rotation`,
    waterloggable: `${FURNITURE}#waterloggable`,
    seats: `${FURNITURE}/seat-mechanic`,
    beds: `${FURNITURE}/bed-mechanic`,
    lights: `${FURNITURE}/light-mechanic`,
    connectable: `${FURNITURE}/connectable-furniture`,
    states: `${FURNITURE}/furniture-states`,
    textEntities: `${FURNITURE}/text-entities`,
    blockSounds: `${FURNITURE}#custom-sounds`,
    drop: `${FURNITURE}#custom-drops`,
    limitedPlacing: `${FURNITURE}#limited-placing`,
    storage: `${FURNITURE}#storage`,
    jukebox: `${FURNITURE}#jukebox`,
    door: `${FURNITURE}/door-mechanic`,
    evolution: `${FURNITURE}/farming-mechanic`,
    previewPlacement: `${FURNITURE}#placement-preview`,
    blocklocker: `${FURNITURE}#blocklocker`,
    modelengine: `${FURNITURE}#modelengine-furniture`,
    placements: `${FURNITURE}/furniture-placements`,
  },
  customBlock: {
    page: BLOCKS,
    noteblock: NOTEBLOCK,
    stringblock: STRINGBLOCK,
    chorusblock: `${BLOCKS}/chorusblock-mechanic`,
    configuration: `${NOTEBLOCK}#customblock-mechanic-configuration`,
    hardness: `${NOTEBLOCK}#customize-the-breaking-speed`,
    blastResistant: `${NOTEBLOCK}#blast-resistant`,
    isFalling: `${NOTEBLOCK}#falling-blocks`,
    beaconBase: `${NOTEBLOCK}#beacon-base`,
    placeableOnWater: `${STRINGBLOCK}#placeable-on-water`,
    requiresSupporting: `${STRINGBLOCK}#requires-supporting`,
    isTall: `${STRINGBLOCK}#tall-plants`,
    randomPlace: `${STRINGBLOCK}#random-place`,
    sapling: `${STRINGBLOCK}#sapling`,
    stackable: `${STRINGBLOCK}#stackable`,
    directional: `${NOTEBLOCK}/directional-mechanic`,
    logStrip: `${NOTEBLOCK}/stripped-log-mechanic`,
    blockSounds: `${NOTEBLOCK}#custom-sounds`,
    drop: `${NOTEBLOCK}#custom-drops`,
    limitedPlacing: `${NOTEBLOCK}#limited-placing`,
    storage: `${NOTEBLOCK}#storage`,
    blocklocker: `${NOTEBLOCK}#blocklocker`,
  },
  mechanics: {
    page: ALL_MECHANICS,
    backpack: `${ALL_MECHANICS}#backpack`,
    commands: `${ALL_MECHANICS}#commands`,
    armorEffects: `${ALL_MECHANICS}#armor-effects`,
    misc: `${ALL_MECHANICS}#misc-mechanic`,
    soulbound: `${ALL_MECHANICS}#soulbound`,
    harvesting: `${ALL_MECHANICS}#harvesting`,
    smelting: `${ALL_MECHANICS}#smelting`,
    itemtype: `${ALL_MECHANICS}#itemtype`,
    custom: `${DOCS}/mechanics/custom-mechanic`,
    customEvents: `${DOCS}/mechanics/custom-mechanic#available-events`,
    trident: `${DOCS}/mechanics/custom-trident`,
    tridentSounds: `${DOCS}/mechanics/custom-trident#trident-sounds`,
    clickActions: CLICK_ACTIONS,
  },
  /** How a config refers to a file of the resource pack (`Pack.model`, textures, namespaces) */
  resourceReference: `${FAQ}#how-do-i-reference-a-resourcepack-file-in-a-config`,
  /** The `useItemModel` project setting: Components.item_model instead of custom_model_data */
  itemModels: `${FAQ}/itemmodels-vs.-custommodeldata`,
  /** The duration format (`10s`, `5t`) */
  duration: `${FAQ}#what-is-a-duration-and-how-do-i-use-it`,
  /** The layout of the pack the export writes */
  resourcepack: `${DOCS}/configuration/resourcepack#resourcepack-structure`,
  /** The pack server setting the test server patches */
  packServer: `${DOCS}/configuration/resourcepack#packserver`,
  glyphs: {
    page: GLYPHS,
    configuring: `${GLYPHS}#configuring-a-glyph`,
    usage: `${GLYPHS}#how-to-use-the-glyph`,
    emojis: `${GLYPHS}#emoji-list`,
    tabcomplete: `${GLYPHS}#how-to-make-glyphs-tabcomplete`,
    bitmap: `${GLYPHS}/multi-bitmap-glyph`,
    reference: `${GLYPHS}/reference-glyph`,
    animated: `${GLYPHS}/animated-glyphs`,
  },
  sounds: `${DOCS}/configuration/sounds`,
  recipes: { page: RECIPES, amount: `${RECIPES}/predicate-recipes#amount-predicate` },
};

/** The documentation page of each media kind */
export const NEXO_MEDIA_DOCS: Record<MediaKind, string> = {
  glyph: NEXO_DOCS.glyphs.page,
  sound: NEXO_DOCS.sounds,
  painting: NEXO_DOCS.paintings.page,
};

/** The documentation section of each recipe type */
export const NEXO_RECIPE_DOCS: Record<RecipeType, string> = {
  shaped: `${RECIPES}#shaped-recipes`,
  shapeless: `${RECIPES}#shapeless-recipes`,
  furnace: `${RECIPES}#furnace-blasting-and-smoking-recipes`,
  blasting: `${RECIPES}#furnace-blasting-and-smoking-recipes`,
  smoking: `${RECIPES}#furnace-blasting-and-smoking-recipes`,
  campfire: `${RECIPES}#campfire-recipes`,
  stonecutting: `${RECIPES}#stonecutter-recipes`,
};

/** Variant slots by the start of their name, for the families of slots (`connect_left`, `state:open`) */
const VARIANT_DOCS: Array<[prefix: string, docs: string]> = [
  ['pulling_models', `${APPEARANCE}#pulling-models-bows-crossbow`],
  ['charged_model', `${APPEARANCE}#charged-model-crossbow`],
  ['firework_model', `${APPEARANCE}#charged-model-crossbow`],
  ['blocking_model', `${APPEARANCE}#blocking-model-shields`],
  ['cast_model', `${APPEARANCE}#cast-model-fishing-rods`],
  ['throwing_model', NEXO_DOCS.mechanics.trident],
  ['damaged_models', `${APPEARANCE}#damaged-model-based-on-durability`],
  ['dyeable_model', `${APPEARANCE}#dyeable-items`],
  ['composite_models', `${APPEARANCE}#composite-models`],
  ['gui_model', `${APPEARANCE}#use-a-different-model-for-inventory-icon-vs-equipped-in-hand`],
  ['connect_', NEXO_DOCS.furniture.connectable],
  ['placement_', NEXO_DOCS.furniture.placements],
  ['light_on', NEXO_DOCS.furniture.lights],
  ['state:', NEXO_DOCS.furniture.states],
  ['stack_models', NEXO_DOCS.customBlock.stackable],
  ['broken_model', `${ITEMS}/itemmodel-builder/condition-itemmodel`],
  ['dir_', NEXO_DOCS.customBlock.directional],
];

/** The documentation section of a model variant slot. */
export function nexoVariantDocs(slot: VariantSlot): string {
  return VARIANT_DOCS.find(([prefix]) => slot.startsWith(prefix))?.[1] ?? APPEARANCE;
}

/** The documentation page of an armor layer: player armor, elytra wings, mob armor, the harness or a saddle. */
export function nexoArmorLayerDocs(layer: Pick<ArmorLayerDef, 'group' | 'key'>): string {
  if (layer.key === 'harness') return NEXO_DOCS.armor.harness;
  const pages = { player: ARMOR, elytra: ELYTRAS, mob: MOB_ARMOR, saddle: NEXO_DOCS.armor.saddles };
  return pages[layer.group];
}

/** The ItemModel builder's page of a node type: its own sub-page, or the builder's page for a type without one. */
export function nexoItemModelDocs(type: string): string {
  const builder = `${ITEMS}/itemmodel-builder`;
  const pages: Record<string, string> = {
    model: 'reference-itemmodel',
    composite: 'composite-itemmodel',
    condition: 'condition-itemmodel',
    select: 'select-itemmodel',
    range_dispatch: 'rangedispatch-itemmodel',
    empty: 'empty-itemmodel',
  };
  const page = pages[type.replace(/^minecraft:/, '')];
  return page ? `${builder}/${page}` : builder;
}
