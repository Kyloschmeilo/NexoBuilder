/**
 * A bordered surface for lists, consoles and previews. Page content is grouped in `Section` panels; a `Panel` is the
 * plain box without a header, on the canvas or inside a section.
 */
import type { ComponentProps } from 'react';
import { cn } from 'cn';

/** A `div` with a hairline border, the surface colour and the panel radius; other props go to the `div`. */
export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="panel" className={cn('min-w-0 rounded-xl border border-line bg-surface', className)} {...props} />;
}
