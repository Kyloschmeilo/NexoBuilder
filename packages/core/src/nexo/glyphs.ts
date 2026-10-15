/**
 * Glyphs (Nexo: configuration/glyphs) – textured Unicode characters for chat, lore, titles and GUIs.
 * Export: plugins/Nexo/glyphs/<project>.yml + textures in the external pack
 * (assets/<ns>/textures/glyphs/<id>.png or .gif).
 */
import type { MessageParams } from '../errors';
import type { Issue, Project } from '../types';
import { base64ToBytes, ITEM_ID_PATTERN, readPngInfoFromDataUrl, slugify } from '../util';
import { itemsToYaml } from './yaml';

export type GlyphKind = 'image' | 'gif' | 'reference';

export interface GlyphFile {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface Glyph {
  id: string;
  /** Key in the YAML, used as <glyph:id> */
  glyphId: string;
  kind: GlyphKind;
  file: GlyphFile | null;
  ascent: number;
  height: number;
  font: string;
  permission: string;
  placeholders: string[];
  isEmoji: boolean;
  tabcomplete: boolean;
  rows: number;
  columns: number;
  /** GIF only */
  frameCount: number | null;
  offset: number | null;
  /** reference glyphs only */
  reference: string;
  index: number;
}

/** Maximum size of a single glyph cell (otherwise use multi-bitmap). */
export const MAX_GLYPH_CELL = 256;

export function readGifInfo(dataUrl: string): { width: number; height: number } | null {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:image/gif') || comma < 0) return null;
  try {
    const bytes = base64ToBytes(dataUrl.slice(comma + 1, comma + 1 + 16));
    const header = String.fromCharCode(...bytes.slice(0, 6));
    if (header !== 'GIF87a' && header !== 'GIF89a') return null;
    return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
  } catch {
    return null;
  }
}

export function createGlyph(id: string, glyphId: string, file: GlyphFile | null, kind: GlyphKind = 'image'): Glyph {
  // Small images are usually emojis (chat height 8), large images GUI backgrounds
  const small = !file || (file.width <= 32 && file.height <= 32);
  const height = small ? 8 : Math.min(file!.height, MAX_GLYPH_CELL);
  return {
    id,
    glyphId,
    kind,
    file,
    ascent: small ? 7 : Math.min(height, 13),
    height,
    font: '',
    permission: '',
    placeholders: [],
    isEmoji: small && kind !== 'reference',
    tabcomplete: false,
    rows: 1,
    columns: 1,
    frameCount: null,
    offset: null,
    reference: '',
    index: 1,
  };
}

/** Reads a dropped PNG/GIF file as a glyph file. */
export function glyphFileFromDataUrl(name: string, dataUrl: string): GlyphFile | null {
  const png = readPngInfoFromDataUrl(dataUrl);
  if (png) return { name, dataUrl, ...png };
  const gif = readGifInfo(dataUrl);
  if (gif) return { name, dataUrl, ...gif };
  return null;
}

export function glyphTexturePath(project: Project, glyph: Glyph): string | null {
  if (!glyph.file || glyph.kind === 'reference') return null;
  const ext = glyph.kind === 'gif' ? 'gif' : 'png';
  return `assets/${project.namespace}/textures/glyphs/${glyph.glyphId}.${ext}`;
}

export function glyphToYaml(project: Project, glyph: Glyph): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const ns = project.namespace;
  if (glyph.kind === 'reference') {
    out.reference = glyph.reference;
    out.index = glyph.index;
  } else {
    if (glyph.kind === 'gif') out.gif = `${ns}:glyphs/${glyph.glyphId}.gif`;
    else out.texture = `${ns}:glyphs/${glyph.glyphId}`;
    out.ascent = glyph.ascent;
    out.height = glyph.height;
    if (glyph.kind === 'image') {
      if (glyph.rows > 1) out.rows = glyph.rows;
      if (glyph.columns > 1) out.columns = glyph.columns;
      if (glyph.font.trim()) out.font = glyph.font.trim();
    }
    if (glyph.kind === 'gif') {
      if (glyph.frameCount) out.frame_count = glyph.frameCount;
      if (glyph.offset !== null && glyph.offset !== undefined) out.offset = glyph.offset;
    }
  }
  if (glyph.permission.trim()) out.permission = glyph.permission.trim();
  const placeholders = glyph.placeholders.map((p) => p.trim()).filter(Boolean);
  if (placeholders.length) out.placeholders = placeholders;
  if (glyph.isEmoji) out.is_emoji = true;
  if (glyph.tabcomplete) out.tabcomplete = true;
  return out;
}

export function glyphFilePath(project: Project): string {
  return `glyphs/${slugify(project.name, 'resourcepackbuilder')}.yml`;
}

export function buildGlyphFile(project: Project): string | null {
  const glyphs = project.glyphs ?? [];
  if (glyphs.length === 0) return null;
  return itemsToYaml(
    glyphs.map((g) => ({ id: g.glyphId, config: glyphToYaml(project, g) })),
    `# Created with ResourcepackBuilder – glyphs of "${project.name}"`,
  );
}

const FONT_PATTERN = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

export function validateGlyphs(project: Project): Array<Issue & { glyphId: string }> {
  const issues: Array<Issue & { glyphId: string }> = [];
  const glyphs = project.glyphs ?? [];
  const seen = new Map<string, Glyph>();
  const placeholderOwner = new Map<string, string>();
  for (const glyph of glyphs) {
    const add = (level: Issue['level'], code: string, params?: MessageParams) =>
      issues.push({
        level,
        code: 'context.glyph',
        params: { glyph: glyph.glyphId || '?' },
        detail: { level, code, params },
        glyphId: glyph.id,
      });
    if (!ITEM_ID_PATTERN.test(glyph.glyphId)) add('error', 'glyph.idInvalid');
    if (seen.has(glyph.glyphId)) add('error', 'glyph.idDuplicate');
    seen.set(glyph.glyphId, glyph);
    for (const p of glyph.placeholders.map((x) => x.trim()).filter(Boolean)) {
      const owner = placeholderOwner.get(p);
      if (owner && owner !== glyph.glyphId) add('warning', 'glyph.placeholderShared', { placeholder: p, owner });
      placeholderOwner.set(p, glyph.glyphId);
    }

    if (glyph.kind === 'reference') {
      if (!glyph.reference) {
        add('error', 'glyph.referenceMissing');
      } else {
        const target = glyphs.find((g) => g.glyphId === glyph.reference);
        if (!target) {
          add('info', 'glyph.referenceNotInProject', { reference: glyph.reference });
        } else if (target.kind !== 'image' || target.rows * target.columns <= 1) {
          add('warning', 'glyph.referenceNotMultiBitmap', { reference: glyph.reference });
        } else if (glyph.index < 1 || glyph.index > target.rows * target.columns) {
          add('error', 'glyph.indexRange', { max: target.rows * target.columns });
        }
      }
      continue;
    }

    if (!glyph.file) {
      add('error', glyph.kind === 'gif' ? 'glyph.gifMissing' : 'glyph.pngMissing');
      continue;
    }
    if (!Number.isInteger(glyph.height) || glyph.height < 1) add('error', 'glyph.heightInvalid');
    if (!Number.isInteger(glyph.ascent)) add('error', 'glyph.ascentNotInteger');
    if (glyph.ascent > glyph.height) add('error', 'glyph.ascentTooLarge', { ascent: glyph.ascent, height: glyph.height });
    if (glyph.kind === 'image') {
      const rows = Math.max(1, glyph.rows);
      const columns = Math.max(1, glyph.columns);
      if (glyph.file.width % columns !== 0 || glyph.file.height % rows !== 0) {
        add('error', 'glyph.gridUneven', { width: glyph.file.width, height: glyph.file.height, rows, columns });
      }
      const cellW = glyph.file.width / columns;
      const cellH = glyph.file.height / rows;
      if (cellW > MAX_GLYPH_CELL || cellH > MAX_GLYPH_CELL) {
        add('error', 'glyph.cellTooLarge', { width: Math.round(cellW), height: Math.round(cellH), max: MAX_GLYPH_CELL });
      }
      if (glyph.font.trim() && !FONT_PATTERN.test(glyph.font.trim())) add('error', 'glyph.fontInvalid');
    } else {
      add('info', 'glyph.animatedShaders');
    }
  }
  return issues;
}
