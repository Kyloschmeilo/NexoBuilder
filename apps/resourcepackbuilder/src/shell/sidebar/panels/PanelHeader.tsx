/** The heading row of a sidebar panel, with optional actions on the right. */
import type { ReactNode } from 'react';
import { SectionLabel } from '@resourcepackbuilder/ui';

export function PanelHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <SectionLabel className="min-h-9 pt-1.5 pr-2 pb-1 pl-3" actions={actions}>
      <h2 className="truncate">{title}</h2>
    </SectionLabel>
  );
}
