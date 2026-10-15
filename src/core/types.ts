/**
 * Zentrale Datentypen von NexoBuilder.
 *
 * Ein Projekt enthält Ordner (werden zu Unterordnern in plugins/Nexo/items) und Items.
 * Jedes Item besitzt optional ein importiertes Modell, das beim Export in den
 * Resourcepack (pack/external_packs/<name>) geschrieben wird.
 */

import type { Recipe } from './nexo/recipes';
import type { VariantSlot } from './nexo/variants';
import type { Glyph } from './nexo/glyphs';
import type { Sound } from './nexo/sounds';
import type { Painting } from './nexo/paintings';

export type DataUrl = string;

/** Minecraft-Java-Blockmodell (assets/<ns>/models/...json) */
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
  /** klassische Ein-Achsen-Rotation */
  angle?: number;
  axis?: 'x' | 'y' | 'z';
  /** freie Rotation (Minecraft 1.21.11+) */
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

/** Animationsdaten einer Textur (.png.mcmeta) */
export interface TextureAnimation {
  frametime: number;
  interpolate?: boolean;
  frames?: Array<number | { index: number; time: number }>;
}

export interface ModelTexture {
  /** Interne, stabile ID innerhalb des Items, z.B. "t0" */
  id: string;
  /** Ursprünglicher Name (ohne Endung) – wird für den Dateinamen im Pack genutzt */
  name: string;
  dataUrl: DataUrl;
  width: number;
  height: number;
  /** Vollständiger Inhalt einer .png.mcmeta – null wenn keine benötigt wird */
  mcmeta: Record<string, unknown> | null;
}

export type ModelSource = 'bbmodel' | 'json' | 'png';

export type IssueLevel = 'error' | 'warning' | 'info';

export interface Issue {
  level: IssueLevel;
  message: string;
}

/**
 * Ein importiertes Modell. Texturverweise auf importierte Texturen werden in
 * `json.textures` als Platzhalter "$tex:<textureId>" gespeichert und erst beim
 * Export durch den endgültigen Pfad ersetzt (der vom Namespace/Ordner/ID abhängt).
 */
export interface ImportedModel {
  source: ModelSource;
  fileName: string;
  json: JavaModelJson;
  textures: ModelTexture[];
  /** Hinweise aus der Konvertierung */
  issues: Issue[];
  /** Mindestversion von Minecraft, die das Modell benötigt (z.B. wegen freier Rotation) */
  requiresVersion?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  /** Reihenfolge der Unterordner */
  folderIds: string[];
  /** Reihenfolge der Items */
  itemIds: string[];
}

export type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };
export type ConfigObject = { [key: string]: ConfigValue };

export interface Item {
  id: string;
  /** Nexo-Item-ID (YAML-Schlüssel), z.B. "ruby_sword" */
  nexoId: string;
  /** Anzeigename (MiniMessage) → itemname */
  displayName: string;
  folderId: string;
  model: ImportedModel | null;
  /** Strukturierte Nexo-Konfiguration (spiegelt den YAML-Aufbau) */
  config: ConfigObject;
  /** Zusätzliches YAML, das zuletzt über die Konfiguration gelegt wird */
  rawYaml: string;
  /** Zusätzlich hochgeladene Texturen (z.B. Rüstungs-Layer), referenziert als "@asset:<id>" */
  assets: Record<string, ModelTexture>;
  /** Crafting-Rezepte, deren Ergebnis dieses Item ist */
  recipes: Recipe[];
  /** Zusätzliche Modelle für Zustände (Pack.pulling_models, Pack.blocking_model …) */
  variants?: Partial<Record<VariantSlot, ImportedModel[]>>;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSettings {
  /** Ziel-Minecraft-Version des Servers, z.B. "1.21.11" */
  minecraftVersion: string;
  /** Components.item_model automatisch auf nexo:<id> setzen */
  useItemModel: boolean;
  /** Name des Ordners in pack/external_packs */
  packName: string;
  packDescription: string;
  /** Optionales pack.png (128x128) */
  packIcon: DataUrl | null;
  /** external pack als .zip statt als Ordner exportieren */
  externalPackAsZip: boolean;
  /** Items zusätzlich in einen Projektordner unter items/ legen */
  itemsInProjectFolder: boolean;
  /** Eine YAML-Datei pro Ordner (folder) oder pro Item (item) */
  yamlFileMode: 'folder' | 'item';
}

export interface Project {
  /** Version des Datenformats für spätere Migrationen */
  formatVersion: 1;
  id: string;
  name: string;
  namespace: string;
  settings: ProjectSettings;
  folders: Record<string, Folder>;
  items: Record<string, Item>;
  rootFolderIds: string[];
  /** Glyphen (plugins/Nexo/glyphs) */
  glyphs: Glyph[];
  /** Eigene Sounds (plugins/Nexo/sounds.yml + OGG im Pack) */
  sounds: Sound[];
  /** Eigene Gemälde (plugins/Nexo/paintings.yml + Textur im Pack) */
  paintings: Painting[];
  createdAt: number;
  updatedAt: number;
}
