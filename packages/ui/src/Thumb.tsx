import type { ReactNode } from 'react';
import { cn } from 'cn';

interface ThumbProps {
  /** Image URL; without one `fallback` (usually an icon) is shown. */
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
  /** Edge length in pixels. */
  size?: number;
  /** Height in pixels when the frame is not square; defaults to `size`. */
  height?: number;
  /** Draws a border around the frame. */
  bordered?: boolean;
  /** Draws the checkerboard behind the image (so transparent pixels stay visible); on by default. */
  checkered?: boolean;
  /** Scales the image up to fill the frame instead of showing it at most at its own size. */
  fill?: boolean;
  /** Custom content of the frame instead of the image (e.g. an animated preview). */
  children?: ReactNode;
  className?: string;
}

/** Square (or `height`-tall), pixelated image frame, by default on a checkerboard. */
export function Thumb({
  src,
  alt = '',
  fallback,
  size = 64,
  height = size,
  bordered,
  checkered = true,
  fill,
  children,
  className,
}: ThumbProps) {
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-sm text-muted-foreground',
        checkered &&
          'bg-background bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-size-[12px_12px]',
        bordered && 'border border-border',
        className,
      )}
      style={{ width: size, height }}
    >
      {children ??
        (src ? (
          <img
            src={src}
            alt={alt}
            className={cn('[image-rendering:pixelated]', fill ? 'size-full object-contain' : 'max-h-full max-w-full')}
          />
        ) : (
          fallback
        ))}
    </div>
  );
}
