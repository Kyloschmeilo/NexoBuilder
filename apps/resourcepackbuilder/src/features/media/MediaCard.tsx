import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { CopyButton, IconButton } from '@resourcepackbuilder/ui';

interface MediaCardProps {
  /** The entry's ID, shown as the heading. */
  title: string;
  badges?: ReactNode;
  /** What to write elsewhere to use the entry (sound key, glyph tag …); shown and copyable. */
  usage: string;
  copyLabel: string;
  /** Icon buttons shown before the delete button. */
  actions?: ReactNode;
  deleteLabel: string;
  onDelete: () => void;
  /** Image column: left of the form when there is room, above it otherwise. */
  preview?: ReactNode;
  children: ReactNode;
}

/** Card of one glyph, sound or painting: heading with usage and actions, optional preview and the form. */
export function MediaCard({ title, badges, usage, copyLabel, actions, deleteLabel, onDelete, preview, children }: MediaCardProps) {
  return (
    <Card size="sm" className="@container/media-card gap-0 py-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-[1_1_10rem] flex-wrap items-center gap-2">
          <h3 className="max-w-full truncate font-mono text-sm font-medium">{title}</h3>
          {badges}
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{usage}</span>
          <CopyButton text={usage} label={copyLabel} />
          {actions}
          <IconButton label={deleteLabel} tone="destructive" onClick={onDelete}>
            <Trash2 />
          </IconButton>
        </div>
      </div>
      <CardContent className="py-4">
        {preview ? (
          <div className="grid gap-4 @lg/media-card:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">{preview}</div>
            <div className="flex min-w-0 flex-col gap-3">{children}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

/** Fixed-size frame for an entry's image in the {@link MediaCard} preview column. */
export function PreviewFrame({ children }: { children?: ReactNode }) {
  return <div className="grid h-40 w-48 place-items-center rounded-md border border-border bg-background p-2.5">{children}</div>;
}
