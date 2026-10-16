import { mediaFrame } from '../../issueFrames';
import { issueReporter, type Issue } from '../../issues';
import { ITEM_ID_PATTERN } from '../../minecraft/resourceLocation';
import { compareVersions, FEATURE_VERSIONS } from '../../minecraft/versions';
import type { Project } from '../../project/types';
import { MAX_PAINTING_BLOCKS, paintingFrameSize } from './model';

/** Checks all paintings of the project; each issue targets its painting and carries a `context.painting` frame. */
export function validatePaintings(project: Project): Issue[] {
  const issues: Issue[] = [];
  const paintings = project.paintings ?? [];
  if (paintings.length > 0 && compareVersions(project.settings.minecraftVersion, FEATURE_VERSIONS.paintingDatapack) < 0) {
    issues.push({ level: 'warning', code: 'painting.datapackNeedsVersion', target: { kind: 'painting', id: paintings[0].id } });
  }
  const seen = new Set<string>();
  for (const painting of paintings) {
    const add = issueReporter(issues, {
      target: { kind: 'painting', id: painting.id },
      context: [mediaFrame('painting', painting.paintingId)],
    });
    if (!ITEM_ID_PATTERN.test(painting.paintingId)) add('error', 'painting.idInvalid');
    if (seen.has(painting.paintingId)) add('error', 'painting.idDuplicate');
    seen.add(painting.paintingId);
    for (const [code, value] of [
      ['painting.widthRange', painting.width],
      ['painting.heightRange', painting.height],
    ] as const) {
      if (!Number.isInteger(value) || value < 1 || value > MAX_PAINTING_BLOCKS) add('error', code);
    }
    if (!painting.file) {
      add('error', 'painting.imageMissing');
      continue;
    }
    const frame = paintingFrameSize(painting);
    if (painting.animated) {
      if (!frame || frame.frames < 2 || painting.file.height % frame.height !== 0) {
        add('error', 'painting.animationFrames', { width: painting.width, height: painting.height });
      }
    } else {
      const expected = painting.file.width / painting.width;
      if (Math.abs(painting.file.height / painting.height - expected) > 0.01) {
        add('warning', 'painting.aspectMismatch', {
          imageWidth: painting.file.width,
          imageHeight: painting.file.height,
          width: painting.width,
          height: painting.height,
        });
      }
    }
  }
  return issues;
}
