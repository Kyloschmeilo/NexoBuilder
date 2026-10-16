import { createIssue, type Issue } from '@resourcepackbuilder/utils';
import { ITEM_ID_PATTERN } from '../../minecraft/resourceLocation';
import { compareVersions, FEATURE_VERSIONS } from '../../minecraft/versions';
import type { Project } from '../../project/types';
import { validateEntries } from '../media/entry';
import { MAX_PAINTING_BLOCKS, paintingFrameSize, type Painting } from './model';

/** Checks all paintings of the project; each issue targets its painting and carries a `context.painting` frame. */
export function validatePaintings(project: Project): Issue[] {
  const issues: Issue[] = [];
  const paintings = project.paintings ?? [];
  if (paintings.length > 0 && compareVersions(project.settings.minecraftVersion, FEATURE_VERSIONS.paintingDatapack) < 0) {
    issues.push(createIssue('warning', 'painting.datapackNeedsVersion', undefined, { target: { kind: 'painting', id: paintings[0].id } }));
  }
  const rules = { kind: 'painting', idOf: (p: Painting) => p.paintingId, pattern: ITEM_ID_PATTERN } as const;
  const checked = validateEntries(paintings, rules, (painting, add) => {
    for (const [code, value] of [
      ['painting.widthRange', painting.width],
      ['painting.heightRange', painting.height],
    ] as const) {
      if (!Number.isInteger(value) || value < 1 || value > MAX_PAINTING_BLOCKS) add('error', code);
    }
    if (!painting.file) {
      add('error', 'painting.imageMissing');
      return;
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
  });
  return [...issues, ...checked];
}
