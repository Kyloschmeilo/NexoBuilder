/**
 * Converts Blockbench projects (.bbmodel) into Minecraft Java models.
 *
 * The logic follows the official Blockbench exporter for "Java Block/Item"
 * (js/formats/java/java_block.ts, Codec.compile):
 *  - only cubes are exported (meshes etc. do not exist in the Java format)
 *  - UVs are converted from pixel coordinates to the 0–16 range
 *  - faces with texture === null are skipped, faces without a texture get "#missing"
 *  - "inflate" enlarges from/to
 *  - rotations are written as {angle, axis, origin} or (from 1.21.11 on) as {x, y, z, origin}
 *
 * The converted model is then checked like every other model (see analyseElements).
 */
import { type Issue, parseJson, texturePlaceholder, unwrapJson } from '@resourcepackbuilder/utils';
import { compareVersions, FEATURE_VERSIONS } from '../versions';
import { convertDisplay } from './bbmodel/display';
import { convertElements, hasRotatedGroups } from './bbmodel/elements';
import { buildTextureMcmeta, readTextureEntries } from './bbmodel/textures';
import { positiveNumber, type BBTexture } from './bbmodel/types';
import { BBModelSchema } from './schema';
import { analyseElements } from './javaModel';
import { createTexture, findMcmetaFor } from './textures';
import type { ImportedModel, ImportFile, JavaModelJson, ModelTexture } from './types';

/** Formats whose origin is in the center (Blockbench: centered_grid). */
const CENTERED_FORMATS = new Set([
  'free',
  'bedrock',
  'bedrock_block',
  'bedrock_old',
  'modded_entity',
  'optifine_entity',
  'optifine_part',
  'skin',
]);
/** Formats with their own UV size per texture (Blockbench: per_texture_uv_size). */
const PER_TEXTURE_UV_FORMATS = new Set(['free', 'optifine_entity', 'optifine_part', 'image']);

/** Names of the Blockbench formats as Blockbench shows them (product names, not translated) */
const FORMAT_LABELS: Record<string, string> = {
  java_block: 'Java Block/Item',
  free: 'Generic Model',
  bedrock: 'Bedrock Entity',
  bedrock_block: 'Bedrock Block',
  bedrock_old: 'Bedrock Entity (legacy)',
  modded_entity: 'Modded Entity',
  optifine_entity: 'OptiFine Entity',
  optifine_part: 'OptiFine Part',
  skin: 'Minecraft Skin',
  image: 'Image',
};

export function convertBBModel(text: string, fileName: string, extraFiles: ImportFile[] = []): ImportedModel {
  const model = unwrapJson(
    parseJson(text, BBModelSchema, { syntax: 'model.invalidBbmodel', shape: 'model.noBlockbenchModel', args: { file: fileName } }),
  );
  const issues: Issue[] = [];
  const format = model.meta?.model_format ?? 'java_block';
  const isJava = format === 'java_block';
  if (!isJava) {
    issues.push({ level: 'warning', code: 'model.nonJavaFormat', args: { format: FORMAT_LABELS[format] ?? format } });
  }
  const javaVersion = typeof model.java_block_version === 'string' ? model.java_block_version : undefined;
  const uv = { width: positiveNumber(model.resolution?.width, 16), height: positiveNumber(model.resolution?.height, 16) };
  const perTextureUv = PER_TEXTURE_UV_FORMATS.has(format);

  const entries = readTextureEntries(model.textures, extraFiles, issues);
  const converted = convertElements(model.elements, model.outliner, {
    textures: entries,
    uv,
    perTextureUv,
    centered: CENTERED_FORMATS.has(format),
    usesShadeOverride: !!javaVersion && compareVersions(javaVersion, FEATURE_VERSIONS.shadeDirectionOverride) >= 0,
  });
  const { elements } = converted;
  if (converted.skippedNonCubes > 0)
    issues.push({ level: 'warning', code: 'model.skippedNonCubes', args: { count: converted.skippedNonCubes } });
  if (converted.facesWithoutTexture > 0)
    issues.push({ level: 'warning', code: 'model.facesWithoutTexture', args: { count: converted.facesWithoutTexture } });
  if (converted.invalidUvRotations > 0)
    issues.push({ level: 'error', code: 'model.invalidUvRotation', args: { count: converted.invalidUvRotations } });
  if (!isJava && hasRotatedGroups(model.outliner)) issues.push({ level: 'warning', code: 'model.rotatedGroups' });

  /* ------------------------------------------------------------ Textures */
  const texturesOnly = elements.length === 0 && !!model.parent;
  const textures: ModelTexture[] = [];
  const texturesJson: Record<string, string> = {};
  for (const entry of entries) {
    const used = converted.usedTextures.has(entry.index);
    const particle = entry.tex.particle === true;
    if (!used && !texturesOnly && !particle) continue;
    if (entry.tex.pbr_channel && entry.tex.pbr_channel !== 'color' && !used) continue;

    const id = `t${textures.length}`;
    const mcmeta = buildTextureMcmeta(entry, textureUv(entry.tex, uv, perTextureUv)) ?? findMcmetaFor(extraFiles, entry.displayName);
    textures.push(createTexture(id, entry.displayName, entry.dataUrl ?? '', mcmeta));
    if (!entry.dataUrl) {
      issues.push({ level: 'error', code: 'model.textureNotEmbedded', args: { name: entry.displayName } });
    }
    if (used || texturesOnly) texturesJson[entry.key] = texturePlaceholder(id);
    if (particle) texturesJson.particle = texturePlaceholder(id);
  }
  if (!texturesJson.particle && textures.length > 0 && elements.length > 0) {
    // Without a particle texture, Minecraft shows missing particles when breaking (blocks).
    texturesJson.particle = texturePlaceholder(textures[0].id);
  }
  const unused = entries.length - textures.length;
  if (unused > 0) issues.push({ level: 'info', code: 'model.unusedTextures', args: { count: unused } });

  /* ------------------------------------------------------------ Model JSON */
  const json: JavaModelJson = {};
  if (typeof model.parent === 'string' && model.parent.trim()) json.parent = model.parent.trim();
  if (model.ambientocclusion === false) json.ambientocclusion = false;
  if (model.front_gui_light === true) json.gui_light = 'front';
  if (uv.width !== 16 || uv.height !== 16) json.texture_size = [uv.width, uv.height];
  if (Object.keys(texturesJson).length > 0) json.textures = texturesJson;
  if (elements.length > 0) json.elements = elements;
  const display = convertDisplay(model.display);
  if (display) json.display = display;
  if (model.unhandled_root_fields) {
    for (const [key, value] of Object.entries(model.unhandled_root_fields)) {
      if (json[key] === undefined && key !== 'groups' && key !== 'overrides') json[key] = value;
    }
  }
  if (elements.length === 0 && !json.parent) issues.push({ level: 'error', code: 'model.noExportableCubes' });

  const analysis = analyseElements(json);
  issues.push(...analysis.issues);
  if (analysis.requiresVersion) {
    issues.push({ level: 'info', code: 'model.requiresVersion', args: { version: analysis.requiresVersion } });
  }
  return { source: 'bbmodel', fileName, json, textures, issues, requiresVersion: analysis.requiresVersion };
}

/** UV grid of a texture: its own in formats with per-texture UV sizes, otherwise the project's. */
function textureUv(tex: BBTexture, projectUv: { width: number; height: number }, perTextureUv: boolean) {
  return perTextureUv
    ? { width: positiveNumber(tex.uv_width, projectUv.width), height: positiveNumber(tex.uv_height, projectUv.height) }
    : projectUv;
}
