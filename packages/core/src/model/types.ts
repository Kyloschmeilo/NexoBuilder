/** Imported models and the Minecraft Java model format. */
import type { DataUrl } from '../binary/dataUrl';
import type { Issue } from '../issues';

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
