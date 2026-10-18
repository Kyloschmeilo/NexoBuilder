/**
 * A titled part of the node editor (cases, tints, transformation …): a hairline above, a small heading with optional
 * badges and actions, then the content. It is not a box, so the node card never nests panels.
 */
import type { ReactNode } from 'react';

interface NodeBlockProps {
  title: ReactNode;
  /** Shown after the title (version badges, ⓘ). */
  meta?: ReactNode;
  /** Buttons on the right of the heading. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** A part of the node editor below a hairline and a small heading. */
export function NodeBlock({ title, meta, actions, children }: NodeBlockProps) {
  return (
    <div data-slot="node-block" className="flex min-w-0 flex-col gap-2 border-t border-line pt-3">
      <div className="flex min-h-7 min-w-0 items-center gap-1.5">
        <h4 className="m-0 truncate text-label font-semibold text-text">{title}</h4>
        {meta}
        {actions && <div className="ml-auto flex flex-none items-center gap-1">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
