import type { ReactNode } from 'react';

/** One entry of an object list or map: a header row with its controls above the entry's fields. */
export function EntryCard({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40">
      <div className="flex items-center gap-1.5 border-b border-border py-1.5 pr-2 pl-3 text-sm leading-5 font-semibold text-foreground">{header}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}
