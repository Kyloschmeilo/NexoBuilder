/**
 * Central data types of ResourcepackBuilder.
 *
 * A project contains folders (become subfolders in plugins/Nexo/items) and items.
 * Each item optionally has an imported model that is written into the
 * resource pack (pack/external_packs/<name>) on export.
 */

import type { Recipe } from './nexo/recipes';
import type { VariantSlot } from './nexo/variants';
import type { Glyph } from './nexo/glyphs';
import type { Sound } from './nexo/sounds';
import type { Painting } from './nexo/paintings';

export type DataUrl = string;

/** Minecraft Java block model (assets/<ns>/models/...json) */
export interface JavaModelJson {
  parent?: string;
  ambientocclusion?: boolean;
  gui_light?: 'front' | 'side';
  texture_size?: [number, number];
  textures?: Record<string, string>;
  elements?: JavaModelElement[];
  display?: Record<string, JavaDisplayTransform>;
  [key: string]: unknown;
}

export interface JavaDisplayTransform {
  rotation?: number[];
  translation?: number[];
  scale?: number[];
  [key: string]: unknown;
}

export type FaceName = 'north' | 'east' | 'south' | 'west' | 'up' | 'down';

export interface JavaModelFace {
  uv?: [number, number, number, number];
  texture: string;
  rotation?: number;
  cullface?: string;
  tintindex?: number;
  [key: string]: unknown;
}

export interface JavaElementRotation {
  origin: [number, number, number];
  /** classic single-axis rotation */
  angle?: number;
  axis?: 'x' | 'y' | 'z';
  /** free rotation (Minecraft 1.21.11+) */
  x?: number;
  y?: number;
  z?: number;
  rescale?: boolean;
}

export interface JavaModelElement {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: JavaElementRotation;
  shade?: boolean;
  light_emission?: number;
  shade_direction_override?: string;
  faces: Partial<Record<FaceName, JavaModelFace>>;
  [key: string]: unknown;
}

/** Animation data of a texture (.png.mcmeta) */
export interface TextureAnimation {
  frametime: number;
  interpolate?: boolean;
  frames?: Array<number | { index: number; time: number }>;
}

export interface ModelTexture {
  /** Internal, stable ID within the item, e.g. "t0" */
  id: string;
  /** Original name (without extension) – used for the file name in the pack */
  name: string;
  dataUrl: DataUrl;
  width: number;
  height: number;
  /** Full content of a .png.mcmeta – null if none is needed */
  mcmeta: Record<string, unknown> | null;
}

export type ModelSource = 'bbmodel' | 'json' | 'png';

export type IssueLevel = 'error' | 'warning' | 'info';

export interface Issue {
  level: IssueLevel;
  message: string;
}

/**
 * An imported model. Texture references to imported textures are stored in
 * `json.textures` as placeholders "$tex:<textureId>" and only replaced on
 * export by the final path (which depends on namespace/folder/ID).
 */
export interface ImportedModel {
  source: ModelSource;
  fileName: string;
  json: JavaModelJson;
  textures: ModelTexture[];
  /** Notes from the conversion */
  issues: Issue[];
  /** Minimum Minecraft version the model requires (e.g. because of free rotation) */
  requiresVersion?: string;
}

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
