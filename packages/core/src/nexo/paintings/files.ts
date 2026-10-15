/** Export of paintings: texture path, animation metadata and the paintings.yml entry. */
import type { Project } from '../../project/types';
import { paintingFrameSize, paintingKey, type Painting } from './model';

export function paintingTexturePath(project: Project, painting: Painting): string {
  return `assets/${project.namespace}/textures/painting/${painting.paintingId}.png`;
}

export function paintingMcmeta(painting: Painting): Record<string, unknown> | null {
  if (!painting.animated) return null;
  const frame = paintingFrameSize(painting);
  if (!frame || frame.frames < 2) return null;
  return { animation: { width: frame.width, height: frame.height, frametime: Math.max(1, Math.round(painting.frametime)) } };
}

/** Entry for paintings.yml */
export function paintingToYaml(project: Project, painting: Painting): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (painting.author.trim()) out.author = painting.author.trim();
  if (painting.title.trim()) out.title = painting.title.trim();
  out.asset_id = paintingKey(project, painting);
  out.width = painting.width;
  out.height = painting.height;
  if (painting.randomPlace) out.random_place = true;
  return out;
}
