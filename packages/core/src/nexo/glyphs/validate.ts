import { mediaFrame } from '../../issueFrames';
import { issueReporter, type Issue } from '../../issues';
import { ITEM_ID_PATTERN, RESOURCE_LOCATION_PATTERN } from '../../minecraft/resourceLocation';
import type { Project } from '../../project/types';
import { MAX_GLYPH_CELL, type Glyph } from './model';

/** Checks all glyphs of the project; each issue targets its glyph and carries a `context.glyph` frame. */
export function validateGlyphs(project: Project): Issue[] {
  const issues: Issue[] = [];
  const glyphs = project.glyphs ?? [];
  const seen = new Map<string, Glyph>();
  const placeholderOwner = new Map<string, string>();
  for (const glyph of glyphs) {
    const add = issueReporter(issues, {
      target: { kind: 'glyph', id: glyph.id },
      context: [mediaFrame('glyph', glyph.glyphId)],
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
      if (glyph.font.trim() && !RESOURCE_LOCATION_PATTERN.test(glyph.font.trim())) add('error', 'glyph.fontInvalid');
    } else {
      add('info', 'glyph.animatedShaders');
    }
  }
  return issues;
}
