/** The bordered panel of one entry in the new item dialog: a header row (icon, title, facts, actions) above the body. */
import type { ReactNode } from 'react';
import { Panel } from '@resourcepackbuilder/ui';

interface DraftPanelProps {
  icon?: ReactNode;
  title: ReactNode;
  /** One muted line below the title (source kind, counts). */
  description?: ReactNode;
  /** Buttons and badges on the right of the header. */
  actions?: ReactNode;
  children: ReactNode;
}

/** A draft (or the item without a model) in the new item dialog. */
export function DraftPanel({ icon, title, description, actions, children }: DraftPanelProps) {
  return (
    <Panel>
      <div className="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line px-3 py-2">
        {icon && <span className="grid size-5 shrink-0 place-items-center text-text-muted [&_svg]:size-4">{icon}</span>}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-label font-semibold text-text">{title}</span>
          {description && <span className="truncate text-meta text-text-muted">{description}</span>}
        </div>
        {actions && <div className="flex flex-wrap items-center justify-end gap-1.5">{actions}</div>}
      </div>
      <div className="p-3">{children}</div>
    </Panel>
  );
}
