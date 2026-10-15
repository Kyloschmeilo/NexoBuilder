import type { ReactNode } from 'react';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { DropZone, PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Hint } from '../../components/Hint';

interface MediaPageProps {
  icon: ReactNode;
  title: string;
  /** Translated count, e.g. "3 sounds". */
  count: string;
  /** Path of the generated Nexo file, e.g. `plugins/Nexo/sounds.yml`. */
  configPath: string;
  actions?: ReactNode;
  hint: ReactNode;
  drop: {
    accept: string;
    formats: string[];
    title: string;
    subtitle: string;
    onFiles: (files: File[]) => void | Promise<void>;
  };
  /** The cards, one per entry. */
  children: ReactNode[];
}

/** Page of a media list (glyphs, sounds, paintings): header, hint, drop zone and one card per entry. */
export function MediaPage({ icon, title, count, configPath, actions, hint, drop, children }: MediaPageProps) {
  return (
    <PageShell>
      <PageHeader
        icon={icon}
        title={title}
        meta={
          <>
            <Badge variant="secondary">{count}</Badge>
            <Badge variant="outline" className="max-w-full truncate font-mono">
              {configPath}
            </Badge>
          </>
        }
        actions={actions}
      />
      <Hint>
        <div>{hint}</div>
      </Hint>
      <DropZone
        onFiles={drop.onFiles}
        accept={drop.accept}
        title={drop.title}
        subtitle={drop.subtitle}
        formats={drop.formats}
        compact
      />
      {children.length > 0 && <div className="mt-2 flex flex-col gap-4">{children}</div>}
    </PageShell>
  );
}
