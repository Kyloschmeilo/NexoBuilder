import type { Painting, PaintingFile } from '@resourcepackbuilder/core/nexo/paintings/model';

/**
 * The painting as it hangs: the texture stretched to the painting's block ratio; for an animation its first frame.
 * Scales to fill its parent while keeping that ratio.
 */
export function PaintingPreview({ painting, file, frames }: { painting: Painting; file: PaintingFile; frames: number }) {
  const width = file.width;
  const height = (file.width * painting.height) / painting.width;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="size-full" aria-hidden>
      {/* The nested viewport clips the frames below the first one */}
      <svg width={width} height={height}>
        <image href={file.dataUrl} width={width} height={height * frames} preserveAspectRatio="none" className="[image-rendering:pixelated]" />
      </svg>
      <rect width={width} height={height} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" className="stroke-input" />
    </svg>
  );
}
