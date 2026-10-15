/** The parts of the Blockbench project format (.bbmodel) the converter reads. */

export interface BBFace {
  uv?: number[];
  texture?: number | string | null | false;
  rotation?: number;
  cullface?: string;
  tint?: number;
  enabled?: boolean;
}

export interface BBElement {
  type?: string;
  uuid?: string;
  name?: string;
  from?: number[];
  to?: number[];
  origin?: number[];
  rotation?: number[];
  rotation_axis?: string;
  inflate?: number;
  rescale?: boolean;
  shade?: boolean;
  shade_direction_override?: string;
  light_emission?: number;
  export?: boolean;
  box_uv?: boolean;
  uv_offset?: number[];
  mirror_uv?: boolean;
  faces?: Record<string, BBFace>;
}

export interface BBTexture {
  id?: string | number;
  uuid?: string;
  name?: string;
  path?: string;
  relative_path?: string;
  source?: string;
  width?: number;
  height?: number;
  uv_width?: number;
  uv_height?: number;
  particle?: boolean;
  frame_time?: number;
  frame_order_type?: string;
  frame_order?: string;
  frame_interpolate?: boolean;
  pbr_channel?: string;
}

export interface BBModel {
  meta?: { format_version?: string; model_format?: string; box_uv?: boolean };
  name?: string;
  parent?: string;
  ambientocclusion?: boolean;
  front_gui_light?: boolean;
  java_block_version?: string;
  resolution?: { width?: number; height?: number };
  elements?: BBElement[];
  outliner?: unknown[];
  textures?: BBTexture[];
  display?: Record<string, unknown>;
  unhandled_root_fields?: Record<string, unknown>;
}

/** Size of the UV grid in pixels (per project or, in some formats, per texture). */
export interface UvSize {
  width: number;
  height: number;
}

export function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function vec3(value: unknown): [number, number, number] {
  const arr = Array.isArray(value) ? value : [];
  const at = (i: number): number => (typeof arr[i] === 'number' && Number.isFinite(arr[i]) ? arr[i] : 0);
  return [at(0), at(1), at(2)];
}
