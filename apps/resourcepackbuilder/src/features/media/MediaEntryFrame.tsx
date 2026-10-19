/**
 * The page of one glyph, sound, painting or dialog: the header (image tile, id, facts, usage with a copy button, actions and
 * the `⋯` menu with Delete), the editor's sections, and the entry's checks at the end.
 */
import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MediaEntryByKind, type MediaKind } from '@resourcepackbuilder/core/project';
import { mediaDocsFor } from '@resourcepackbuilder/core/targets';
import type { Issue } from '@resourcepackbuilder/utils';
import { CopyButton, DocsLink, type MenuEntry, Page, PageHeader, Section, Thumb } from '@resourcepackbuilder/ui';
import { IssueList } from '../../components/IssueList';
import { useOpenProject } from '../../store/project';
import { MEDIA_KIND_VIEWS } from './mediaKinds';
import { useMediaActions } from './useMediaActions';

interface MediaEntryFrameProps<K extends MediaKind> {
  kind: K;
  entry: MediaEntryByKind[K];
  /** The entry's id, the page title */
  title: string;
  /** Content of the header tile: the image, or the kind's icon */
  thumb: ReactNode;
  /** Facts in the meta line (size, kind) */
  meta?: ReactNode;
  /** What to write elsewhere to use the entry (glyph tag, sound event, painting id); shown and copyable */
  usage: string;
  copyLabel: string;
  /** Header buttons before the docs link (replace image) */
  actions?: ReactNode;
  /** Menu entries before Delete (create an item for the entry) */
  menu?: MenuEntry[];
  issues: Issue[];
  children: ReactNode;
}

export function MediaEntryFrame<K extends MediaKind>({
  kind,
  entry,
  title,
  thumb,
  meta,
  usage,
  copyLabel,
  actions,
  menu = [],
  issues,
  children,
}: MediaEntryFrameProps<K>) {
  const t = useTranslations('media');
  const tUi = useTranslations('ui');
  const project = useOpenProject();
  const media = useMediaActions();
  const section: MediaSection = SECTIONS[kind];
  const deleteEntry: MenuEntry = {
    icon: <Trash2 />,
    label: t(`${section}.delete`),
    destructive: true,
    onSelect: () => void media.remove(kind, entry),
  };
  return (
    <Page
      header={
        <PageHeader
          thumb={thumb}
          title={<span className="font-mono">{title}</span>}
          meta={
            <>
              {meta}
              <code className="min-w-0 truncate font-mono text-micro text-text-muted" title={usage}>
                {usage}
              </code>
            </>
          }
          actions={
            <>
              <CopyButton text={usage} label={copyLabel} copiedLabel={tUi('copyButton.copied')} />
              {actions}
              <DocsLink url={mediaDocsFor(project.target, kind)} target={project.target} label={t(`${section}.title`)} />
            </>
          }
          menu={[...menu, ...(menu.length > 0 ? (['separator'] as const) : []), deleteEntry]}
        />
      }
    >
      {children}
      {issues.length > 0 && (
        <Section id="checks" title={t('sections.checks')}>
          <IssueList issues={issues} />
        </Section>
      )}
    </Page>
  );
}

/** The message section of each media kind. */
const SECTIONS = MEDIA_KIND_VIEWS;

type MediaSection = (typeof SECTIONS)[MediaKind];

/** Fixed-size frame for an entry's image (or a custom preview) in its Preview section. */
export function PreviewFrame({ src, children }: { src?: string; children?: ReactNode }) {
  return (
    <Thumb src={src} size={192} height={160} bordered checkered={false} fill className="rounded-md bg-canvas p-2.5">
      {children}
    </Thumb>
  );
}
