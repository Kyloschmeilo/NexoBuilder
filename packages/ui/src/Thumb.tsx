import type { ReactNode } from 'react';
import { cn } from 'cn';

interface ThumbProps {
  /** Image URL; without one `fallback` (usually an icon) is shown. */
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
  /** Edge length in pixels. */
  size?: number;
  className?: string;
}

/** Square, pixelated image on a checkerboard (so transparent pixels stay visible). */
export function Thumb({ src, alt = '', fallback, size = 64, className }: ThumbProps) {
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-sm bg-background bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-size-[12px_12px] text-muted-foreground',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt={alt} className="max-h-full max-w-full [image-rendering:pixelated]" /> : fallback}
    </div>
  );
}
