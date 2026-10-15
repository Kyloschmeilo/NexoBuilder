/**
 * Custom paintings (Nexo: configuration/custom-paintings) – texture under
 * assets/<ns>/textures/painting/<id>.png plus an entry in plugins/Nexo/paintings.yml.
 * From Minecraft 1.21.5 on, Nexo generates the required datapack from it.
 */
import type { Project } from '../../project/types';

/** Largest painting side in blocks. */
export const MAX_PAINTING_BLOCKS = 16;

export interface PaintingFile {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface Painting {
  id: string;
  /** Key, e.g. "sunset" – used as <namespace>:<paintingId> */
  paintingId: string;
  title: string;
  author: string;
  /** Size in blocks */
  width: number;
  height: number;
  /** Also pick randomly when hanging regular paintings */
  randomPlace: boolean;
  file: PaintingFile | null;
  /** Animated: the image contains several frames stacked vertically */
  animated: boolean;
  frametime: number;
}

export function createPainting(id: string, paintingId: string, file: PaintingFile | null): Painting {
  // Estimate size in blocks from the image (16 pixels per block)
  const blocks = (px: number) => Math.min(16, Math.max(1, Math.round(px / 16)));
  return {
    id,
    paintingId,
    title: '',
    author: '',
    width: file ? blocks(file.width) : 1,
    height: file ? blocks(file.height) : 1,
    randomPlace: false,
    file,
    animated: false,
    frametime: 2,
  };
}

export function paintingKey(project: Project, painting: Painting): string {
  return `${project.namespace}:${painting.paintingId}`;
}

/** Size of a single frame for animated paintings (same aspect ratio as the painting) */
export function paintingFrameSize(painting: Painting): { width: number; height: number; frames: number } | null {
  if (!painting.file) return null;
  const width = painting.file.width;
  const height = Math.round((width * painting.height) / painting.width);
  if (height <= 0) return null;
  return { width, height, frames: Math.floor(painting.file.height / height) };
}
