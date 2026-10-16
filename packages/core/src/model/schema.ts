/**
 * Schemas of model data read from files (Java model JSON, Blockbench .bbmodel, .png.mcmeta) and from storage
 * (imported model JSON and textures). Lenient: a broken element, face or texture is dropped or emptied
 * instead of crashing the converter later.
 */
import { z } from 'zod';
import {
  type Covers,
  type Fits,
  type SchemaChecks,
  lenientList,
  lenientNumber,
  lenientRecord,
  lenientString,
  optional,
  plainObject,
  withoutUndefined,
} from '../lenient';
import type { BBElement, BBFace, BBModel, BBTexture } from './bbmodel/types';
import type { JavaDisplayTransform, JavaElementRotation, JavaModelElement, JavaModelFace, JavaModelJson, ModelTexture } from './types';

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const numbers = z.array(z.number());

/* ------------------------------------------------------------ Java model JSON */

const JavaFaceSchema = z
  .looseObject({
    uv: optional(z.tuple([z.number(), z.number(), z.number(), z.number()])),
    texture: z.string(),
    rotation: optional(z.number()),
    cullface: optional(z.string()),
    tintindex: optional(z.number()),
  })
  .transform(withoutUndefined);

const JavaRotationSchema = z
  .object({
    origin: vec3.catch([8, 8, 8]),
    angle: optional(z.number()),
    axis: optional(z.enum(['x', 'y', 'z'])),
    x: optional(z.number()),
    y: optional(z.number()),
    z: optional(z.number()),
    rescale: optional(z.boolean()),
  })
  .transform(withoutUndefined);

/** An element needs `from` and `to`; elements without them are dropped. */
const JavaElementSchema = z
  .looseObject({
    from: vec3,
    to: vec3,
    rotation: optional(JavaRotationSchema),
    shade: optional(z.boolean()),
    light_emission: optional(z.number()),
    shade_direction_override: optional(z.string()),
    faces: lenientRecord(JavaFaceSchema),
  })
  .transform(withoutUndefined);

const JavaDisplaySchema = z
  .looseObject({ rotation: optional(numbers), translation: optional(numbers), scale: optional(numbers) })
  .transform(withoutUndefined);

/** A Minecraft Java model; unknown top-level keys are kept (they are written into the pack as they are). */
export const JavaModelSchema = z
  .looseObject({
    parent: optional(z.string()),
    ambientocclusion: optional(z.boolean()),
    gui_light: optional(z.enum(['front', 'side'])),
    texture_size: optional(z.tuple([z.number(), z.number()])),
    textures: optional(lenientRecord(z.string())),
    elements: optional(lenientList(JavaElementSchema)),
    display: optional(lenientRecord(JavaDisplaySchema)),
  })
  .transform(withoutUndefined);

/* ------------------------------------------------------------ Textures */

/** A .png.mcmeta (any JSON object). */
export const McmetaSchema = plainObject();

export const ModelTextureSchema = z.object({
  id: z.string(),
  name: lenientString(),
  dataUrl: lenientString(),
  width: lenientNumber(0),
  height: lenientNumber(0),
  mcmeta: McmetaSchema.nullable().catch(null),
});

/* ------------------------------------------------------------ Blockbench */

const BBFaceSchema = z
  .looseObject({
    uv: optional(numbers),
    texture: optional(z.union([z.number(), z.string(), z.null(), z.literal(false)])),
    rotation: optional(z.number()),
    cullface: optional(z.string()),
    tint: optional(z.number()),
    enabled: optional(z.boolean()),
  })
  .transform(withoutUndefined);

/** Elements that are no object are dropped; bad fields of an element are left out. */
const BBElementSchema = z
  .looseObject({
    type: optional(z.string()),
    uuid: optional(z.string()),
    name: optional(z.string()),
    from: optional(numbers),
    to: optional(numbers),
    origin: optional(numbers),
    rotation: optional(numbers),
    rotation_axis: optional(z.string()),
    inflate: optional(z.number()),
    rescale: optional(z.boolean()),
    shade: optional(z.boolean()),
    shade_direction_override: optional(z.string()),
    light_emission: optional(z.number()),
    export: optional(z.boolean()),
    box_uv: optional(z.boolean()),
    uv_offset: optional(numbers),
    mirror_uv: optional(z.boolean()),
    faces: optional(lenientRecord(BBFaceSchema)),
  })
  .transform(withoutUndefined);

/** Faces refer to textures by their index, so a broken texture becomes an empty one instead of being dropped. */
const BBTextureSchema = z
  .looseObject({
    id: optional(z.union([z.string(), z.number()])),
    uuid: optional(z.string()),
    name: optional(z.string()),
    path: optional(z.string()),
    relative_path: optional(z.string()),
    source: optional(z.string()),
    width: optional(z.number()),
    height: optional(z.number()),
    uv_width: optional(z.number()),
    uv_height: optional(z.number()),
    particle: optional(z.boolean()),
    frame_time: optional(z.number()),
    frame_order_type: optional(z.string()),
    frame_order: optional(z.string()),
    frame_interpolate: optional(z.boolean()),
    pbr_channel: optional(z.string()),
  })
  .transform(withoutUndefined)
  .catch({});

const BBModelFieldsSchema = z
  .looseObject({
    meta: optional(
      z
        .looseObject({ format_version: optional(z.string()), model_format: optional(z.string()), box_uv: optional(z.boolean()) })
        .transform(withoutUndefined),
    ),
    name: optional(z.string()),
    parent: optional(z.string()),
    ambientocclusion: optional(z.boolean()),
    front_gui_light: optional(z.boolean()),
    java_block_version: optional(z.string()),
    resolution: optional(z.looseObject({ width: optional(z.number()), height: optional(z.number()) }).transform(withoutUndefined)),
    elements: lenientList(BBElementSchema),
    outliner: optional(z.array(z.unknown())),
    textures: z.array(z.unknown()).catch([]).pipe(z.array(BBTextureSchema)),
    display: optional(plainObject()),
    unhandled_root_fields: optional(plainObject()),
  })
  .transform(withoutUndefined);

/** A Blockbench project: an object with an element or a texture list. */
export const BBModelSchema = z
  .union([z.looseObject({ elements: z.array(z.unknown()) }), z.looseObject({ textures: z.array(z.unknown()) })])
  .pipe(BBModelFieldsSchema);

/* ------------------------------------------------------------ Type checks */

export type ModelSchemaChecks = SchemaChecks<
  [
    Fits<z.output<typeof JavaModelSchema>, JavaModelJson>,
    Fits<z.output<typeof JavaElementSchema>, JavaModelElement>,
    Fits<z.output<typeof JavaFaceSchema>, JavaModelFace>,
    Fits<z.output<typeof JavaRotationSchema>, JavaElementRotation>,
    Covers<z.output<typeof JavaRotationSchema>, JavaElementRotation>,
    Fits<z.output<typeof JavaDisplaySchema>, JavaDisplayTransform>,
    Fits<z.output<typeof ModelTextureSchema>, ModelTexture>,
    Covers<z.output<typeof ModelTextureSchema>, ModelTexture>,
    Fits<z.output<typeof BBModelSchema>, BBModel>,
    Fits<z.output<typeof BBElementSchema>, BBElement>,
    Covers<z.output<typeof BBElementSchema>, BBElement>,
    Fits<z.output<typeof BBFaceSchema>, BBFace>,
    Fits<z.output<typeof BBTextureSchema>, BBTexture>,
    Covers<z.output<typeof BBTextureSchema>, BBTexture>,
  ]
>;
