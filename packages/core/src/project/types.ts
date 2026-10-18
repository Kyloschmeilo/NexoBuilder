/**
 * The project model of ResourcepackBuilder.
 *
 * A project contains folders (become subfolders in plugins/Nexo/items) and items.
 * Each item optionally has an imported model that is written into the
 * resource pack (pack/external_packs/<name>) on export.
 */
import type { DataUrl, ImportedModel, ModelTexture } from '@resourcepackbuilder/minecraft';
import type { PackTargetId } from './target';
import type { ArmorSettings } from './armor';
import type { Glyph } from './media/glyph';
import type { Painting } from './media/painting';
import type { Recipe } from './recipes/model';
import type { Sound } from './media/sound';
import type { VariantSlot } from './variants';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  /** Order of the subfolders */
  folderIds: string[];
  /** Order of the items */
  itemIds: string[];
}

export type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };
export type ConfigObject = { [key: string]: ConfigValue };

export interface Item {
  id: string;
  /** Item ID (YAML key), e.g. "ruby_sword" */
  itemId: string;
  /** Display name (MiniMessage) → itemname */
  displayName: string;
  folderId: string;
  model: ImportedModel | null;
  /** Structured Nexo configuration (mirrors the YAML structure) */
  config: ConfigObject;
  /** Additional YAML that is applied over the configuration last */
  rawYaml: string;
  /** Additionally uploaded textures (e.g. armor layers), referenced as "@asset:<id>" */
  assets: Record<string, ModelTexture>;
  /** Crafting recipes whose result is this item */
  recipes: Recipe[];
  /** Additional models for states (Pack.pulling_models, Pack.blocking_model …) */
  variants?: Partial<Record<VariantSlot, ImportedModel[]>>;
  /** Worn textures (equipment model); absent = the item is no armor */
  armor?: ArmorSettings;
  /** Display name per Minecraft locale ("de_de" → name); only the CraftEngine export writes them (as lang files) */
  translations?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSettings {
  /** Target Minecraft version of the server, e.g. "1.21.11" */
  minecraftVersion: string;
  /** Automatically set Components.item_model to nexo:<id> */
  useItemModel: boolean;
  /** Name of the folder in pack/external_packs */
  packName: string;
  packDescription: string;
  /** Optional pack.png (128x128) */
  packIcon: DataUrl | null;
  /** Export the external pack as .zip instead of a folder */
  externalPackAsZip: boolean;
  /** Additionally put items into a project folder under items/ */
  itemsInProjectFolder: boolean;
  /** One YAML file per folder (folder) or per item (item) */
  yamlFileMode: 'folder' | 'item';
  /** CraftEngine: write categories.yml with one category per folder (the item browser of /ce) */
  ceCategoriesFromFolders: boolean;
  /** Nexo: vanilla recipe keys (`minecraft:…`) Nexo disables, written to recipes/disabled_recipes.yml; absent when none */
  disabledRecipes?: string[];
}

/** Project-wide CraftEngine configuration, written to the pack's configuration folder */
export interface CraftEngineProjectData {
  /** The loot sources (`loot_sources`), each a config with its `id` (core/craftEngine/loot.ts) */
  lootSources?: ConfigObject[];
  /** The project's templates (`templates`), each with its `id`, declared `arguments` and `body` (core/craftEngine/templates.ts) */
  templates?: ConfigObject[];
  /** The global variables (`global_variables`): name → MiniMessage text, used as `<global:name>` */
  globalVariables?: Record<string, string>;
  /** The attribute system (experimental): its definitions, operations, equipment sets and damage rules */
  attributes?: CraftEngineAttributeData;
}

/**
 * The project's part of CraftEngine's attribute system (core/craftEngine/attributes.ts). Each list entry is a config
 * with its `id`; a damage rule has its `damage_type` instead.
 */
export interface CraftEngineAttributeData {
  /** Custom attributes (`attributes`) */
  definitions?: ConfigObject[];
  /** Custom operations (`attribute_operations`) */
  operations?: ConfigObject[];
  /** Equipment sets (`equipment_sets`) */
  equipmentSets?: ConfigObject[];
  /** Damage rules (`damage_rules`), grouped by their `damage_type` on export */
  damageRules?: ConfigObject[];
}

export interface Project {
  /** Version of the data format for future migrations */
  formatVersion: 1;
  id: string;
  name: string;
  /** Server plugin the pack is built for */
  target: PackTargetId;
  namespace: string;
  settings: ProjectSettings;
  folders: Record<string, Folder>;
  items: Record<string, Item>;
  rootFolderIds: string[];
  /** Glyphs (plugins/Nexo/glyphs) */
  glyphs: Glyph[];
  /** Custom sounds (plugins/Nexo/sounds.yml + OGG in the pack) */
  sounds: Sound[];
  /** Custom paintings (plugins/Nexo/paintings.yml + texture in the pack) */
  paintings: Painting[];
  /** Project-wide CraftEngine configuration; only CraftEngine projects have it */
  craftEngine?: CraftEngineProjectData;
  createdAt: number;
  updatedAt: number;
}
