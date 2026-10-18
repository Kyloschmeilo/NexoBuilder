/**
 * The pages of glyphs, sounds and paintings. With an entry selected (in the Media panel or the overview) the page is
 * that entry's editor; otherwise it is the kind's overview: what the kind is for, a drop zone for new files and the
 * table of entries.
 */
import { useEffect } from 'react';
import { Link2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { packTargetFor } from '@resourcepackbuilder/export';
import { type MediaEntryByKind, mediaList, type PackTargetId, type UploadMediaKind } from '@resourcepackbuilder/core/project';
import { mediaDocsFor } from '@resourcepackbuilder/core/targets';
import { DocsLink, DropZone, Page, PageHeader, pickFiles, Section, StatusPill, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addGlyph } from '../../commands/media';
import { richTags } from '../../i18n/richTags';
import { MEDIA_FILES } from '../../lib/mediaFiles';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { selectEntry, useSelectedEntry } from '../../store/ui';
import { GlyphPage } from '../glyphs/GlyphPage';
import { PaintingPage } from '../paintings/PaintingPage';
import { SoundPage } from '../sounds/SoundPage';
import { MEDIA_KIND_INFO, mediaEntries, useAddMediaFiles } from './mediaKinds';
import { EntryTable, FilePath, PageHint } from './RegistryPageParts';

/** The glyph tag the hint shows as an example, by pack target. */
const GLYPH_TAG_EXAMPLES: Record<PackTargetId, string> = { nexo: '<glyph:id>', craftengine: '<image:namespace:id>' };

/** Adds a glyph that shows a cell of another (multi-bitmap) glyph instead of its own image, and opens it. */
function ReferenceGlyphButton() {
  const t = useTranslations('media.glyphs');
  return (
    <Tip label={t('referenceGlyphHelp')}>
      <Button
        variant="outline"
        onClick={() => {
          const id = addGlyph(t('defaultReferenceId'), null, 'reference');
          if (id) selectEntry('glyphs', id);
        }}
      >
        <Link2 /> {t('referenceGlyph')}
      </Button>
    </Tip>
  );
}

/** The overview of a media kind: header, hint, drop zone and the entries. */
function MediaOverview<K extends UploadMediaKind>({ kind }: { kind: K }) {
  const t = useTranslations('media');
  const tRegistry = useTranslations('media.registry');
  const project = useOpenProject();
  const plan = usePlan();
  const info = MEDIA_KIND_INFO[kind];
  const { view, icon: Icon } = info;
  const files = MEDIA_FILES[kind];
  const addFiles = useAddMediaFiles(kind);
  const entries = mediaEntries(kind, project, plan);
  const { layout } = packTargetFor(project);
  const upload = async (picked: File[]) => {
    const id = await addFiles(picked);
    if (id) selectEntry(view, id);
  };

  return (
    <Page
      header={
        <PageHeader
          thumb={<Icon />}
          title={t(`${view}.title`)}
          meta={
            <>
              <StatusPill tone="muted" label={t(`${view}.count`, { count: entries.length })} />
              <FilePath path={`${layout.pluginDir}/${layout.mediaFile(project, kind) ?? ''}`} />
            </>
          }
          actions={
            <>
              {kind === 'glyph' && <ReferenceGlyphButton />}
              <Button onClick={() => void pickFiles(files.accept, true).then(upload)}>
                <Upload /> {tRegistry(`groups.${view}.add`)}
              </Button>
              <DocsLink url={mediaDocsFor(project.target, kind)} target={project.target} label={t(`${view}.title`)} />
            </>
          }
        />
      }
    >
      <PageHint>
        {/* Only the glyph hint uses {tag} */}
        {t.rich(`${view}.hint`, { ...richTags, target: project.target, tag: GLYPH_TAG_EXAMPLES[project.target] })}
      </PageHint>
      <DropZone
        onFiles={(dropped) => void upload(dropped)}
        accept={files.accept}
        title={t(`${view}.dropTitle`)}
        subtitle={t(`${view}.dropSubtitle`)}
        formats={files.formats}
        compact={entries.length > 0}
        className="mb-4"
      />
      <Section id="entries" title={tRegistry('entries')} meta={<StatusPill tone="muted" label={String(entries.length)} />}>
        <EntryTable view={view} group={{ id: view, entries }} />
      </Section>
    </Page>
  );
}

/** The page of one entry of `kind`. */
function MediaEntryPage<K extends UploadMediaKind>({ kind, entry }: { kind: K; entry: MediaEntryByKind[K] }) {
  const plan = usePlan();
  switch (kind) {
    case 'glyph':
      return <GlyphPage glyph={entry as MediaEntryByKind['glyph']} plan={plan} />;
    case 'sound':
      return <SoundPage sound={entry as MediaEntryByKind['sound']} plan={plan} />;
    default:
      return <PaintingPage painting={entry as MediaEntryByKind['painting']} plan={plan} />;
  }
}

/** The selected entry's page, or the overview when none (or one that no longer exists) is selected. */
function MediaView<K extends UploadMediaKind>({ kind }: { kind: K }) {
  const project = useOpenProject();
  const selected = useSelectedEntry(MEDIA_KIND_INFO[kind].view);
  const { view } = MEDIA_KIND_INFO[kind];
  const entry = selected === undefined ? undefined : mediaList(project, kind).find((candidate) => candidate.id === selected);
  const isGone = selected !== undefined && !entry;
  // A gone entry (deleted, undone) leaves the selection on the overview, so the panel marks the right row
  useEffect(() => {
    if (isGone) selectEntry(view);
  }, [isGone, view]);
  // Keyed: the entry page's local state belongs to one entry
  return entry ? <MediaEntryPage key={entry.id} kind={kind} entry={entry} /> : <MediaOverview kind={kind} />;
}

export function GlyphsView() {
  return <MediaView kind="glyph" />;
}

export function SoundsView() {
  return <MediaView kind="sound" />;
}

export function PaintingsView() {
  return <MediaView kind="painting" />;
}
