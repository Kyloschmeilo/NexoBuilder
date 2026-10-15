/**
 * The project model of ResourcepackBuilder.
 *
 * A project contains folders (become subfolders in plugins/Nexo/items) and items.
 * Each item optionally has an imported model that is written into the
 * resource pack (pack/external_packs/<name>) on export.
 */
import type { DataUrl } from '../binary/dataUrl';
import type { ImportedModel, ModelTexture } from '../model/types';
import type { ArmorSettings } from '../nexo/armor';
import type { Glyph } from '../nexo/glyphs/model';
import type { Painting } from '../nexo/paintings/model';
import type { Recipe } from '../nexo/recipes/model';
import type { Sound } from '../nexo/sounds/model';
import type { VariantSlot } from '../nexo/variants';

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
  /** Nexo item ID (YAML key), e.g. "ruby_sword" */
  nexoId: string;
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
}

export interface Project {
  /** Version of the data format for future migrations */
  formatVersion: 1;
  id: string;
  name: string;
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
  createdAt: number;
  updatedAt: number;
}
