/**
 * Custom paintings (Nexo: configuration/custom-paintings) – texture under
 * assets/<ns>/textures/painting/<id>.png plus an entry in plugins/Nexo/paintings.yml.
 * From Minecraft 1.21.5 on, Nexo generates the required datapack from it.
 */
import { DEFAULT_ANIMATION_FRAMETIME } from '../../model/textures';
import type { MediaFile } from '../media/entry';

/** Largest painting side in blocks. */
export const MAX_PAINTING_BLOCKS = 16;
/** Pixels of a vanilla painting texture per block */
const PIXELS_PER_BLOCK = 16;

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
  file: MediaFile | null;
  /** Animated: the image contains several frames stacked vertically */
  animated: boolean;
  frametime: number;
}

export function createPainting(id: string, paintingId: string, file: MediaFile | null): Painting {
  // Estimate size in blocks from the image (16 pixels per block)
  const blocks = (px: number) => Math.min(MAX_PAINTING_BLOCKS, Math.max(1, Math.round(px / PIXELS_PER_BLOCK)));
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
    frametime: DEFAULT_ANIMATION_FRAMETIME,
  };
}

/** Size of a single frame for animated paintings (same aspect ratio as the painting) */
export function paintingFrameSize(painting: Painting): { width: number; height: number; frames: number } | null {
  if (!painting.file) return null;
  const width = painting.file.width;
  const height = Math.round((width * painting.height) / painting.width);
  if (height <= 0) return null;
  return { width, height, frames: Math.floor(painting.file.height / height) };
}
