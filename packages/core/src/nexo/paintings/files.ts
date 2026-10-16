/** Export of paintings: the paintings.yml entry (texture: see export/paths, animation: paintingMcmeta). */
import type { Project } from '../../project/types';
import { mediaKey } from '../../project/media/entry';
import type { Painting } from '../../project/media/painting';

/** Entry for paintings.yml */
export function paintingToYaml(project: Project, painting: Painting): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (painting.author.trim()) out.author = painting.author.trim();
  if (painting.title.trim()) out.title = painting.title.trim();
  out.asset_id = mediaKey(project, painting.paintingId);
  out.width = painting.width;
  out.height = painting.height;
  if (painting.randomPlace) out.random_place = true;
  return out;
}
