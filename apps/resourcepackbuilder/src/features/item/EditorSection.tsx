import type { ReactNode } from 'react';
import { SectionLabel } from '@resourcepackbuilder/ui';
import { Empty, EmptyDescription } from '@resourcepackbuilder/ui/components/empty';

interface EditorSectionProps {
  title: ReactNode;
  /** Buttons next to the title (e.g. "Add"). */
  actions?: ReactNode;
  /** Shown in a placeholder card when set (the section has no entries yet). */
  empty?: ReactNode;
  children?: ReactNode;
}

/** A titled group of cards in the item editor. */
export function EditorSection({ title, actions, empty, children }: EditorSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel actions={actions}>{title}</SectionLabel>
      {empty && (
        <Empty className="rounded-lg border p-5">
          <EmptyDescription className="text-xs">{empty}</EmptyDescription>
        </Empty>
      )}
      {children}
    </section>
  );
}
