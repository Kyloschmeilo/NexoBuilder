/** Export of glyphs: texture paths and the glyph file. */
import type { Project } from '../../project/types';
import { projectFileName } from '../projectFiles';
import { itemsToYaml } from '../yaml';
import type { Glyph } from './model';

export function glyphTexturePath(project: Project, glyph: Glyph): string | null {
  if (!glyph.file || glyph.kind === 'reference') return null;
  const ext = glyph.kind === 'gif' ? 'gif' : 'png';
  return `assets/${project.namespace}/textures/glyphs/${glyph.glyphId}.${ext}`;
}

function glyphToYaml(project: Project, glyph: Glyph): Record<string, unknown> {
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
  return `glyphs/${projectFileName(project)}.yml`;
}

export function buildGlyphFile(project: Project): string | null {
  const glyphs = project.glyphs ?? [];
  if (glyphs.length === 0) return null;
  return itemsToYaml(
    glyphs.map((g) => ({ id: g.glyphId, config: glyphToYaml(project, g) })),
    `glyphs of "${project.name}"`,
  );
}
