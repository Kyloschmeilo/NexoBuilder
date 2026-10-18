/** The pages of glyphs, sounds and paintings: one descriptor per kind, one page component. */
import type { ReactNode } from 'react';
import { Frame, Link2, Music, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ExportPlan, packTargetFor } from '@resourcepackbuilder/export';
import {
  glyphKindOf,
  type MediaEntryByKind,
  type MediaKind,
  mediaList,
  type PackTargetId,
  type Project,
} from '@resourcepackbuilder/core/project';
import { mediaDocsFor } from '@resourcepackbuilder/core/targets';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Tip } from '@resourcepackbuilder/ui';
import { addGlyph, addPainting, addSound } from '../../commands/media';
import { useMediaFileReader } from '../../hooks/useFileReaders';
import { richTags } from '../../i18n/richTags';
import { MEDIA_FILES, type MediaFileByKind } from '../../lib/mediaFiles';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { GlyphCard } from '../glyphs/GlyphCard';
import { PaintingCard } from '../paintings/PaintingCard';
import { SoundCard } from '../sounds/SoundCard';
import { DocsLinkButton } from './DocsLinkButton';
import { MediaPage } from './MediaPage';

interface MediaViewInfo<K extends MediaKind> {
  icon: ReactNode;
  /** Message section below `media` */
  section: 'glyphs' | 'sounds' | 'paintings';
  /** Adds an entry for an uploaded file named `name` */
  add: (name: string, file: MediaFileByKind[K]) => void;
  card: (entry: MediaEntryByKind[K], project: Project, plan: ExportPlan | null) => ReactNode;
}

const MEDIA_VIEWS: { [K in MediaKind]: MediaViewInfo<K> } = {
  glyph: {
    icon: <Smile className="size-7" />,
    section: 'glyphs',
    add: (name, file) => addGlyph(name, file, glyphKindOf(file)),
    card: (glyph, project, plan) => <GlyphCard key={glyph.id} glyph={glyph} glyphs={project.glyphs} plan={plan} />,
  },
  sound: {
    icon: <Music className="size-7" />,
    section: 'sounds',
    add: (name, file) => addSound(name, [file]),
    card: (sound, _, plan) => <SoundCard key={sound.id} sound={sound} plan={plan} />,
  },
  painting: {
    icon: <Frame className="size-7" />,
    section: 'paintings',
    add: addPainting,
    card: (painting, _, plan) => <PaintingCard key={painting.id} painting={painting} plan={plan} />,
  },
};

/** The glyph tag the hint shows as an example, by pack target. */
const GLYPH_TAG_EXAMPLES: Record<PackTargetId, string> = { nexo: '<glyph:id>', craftengine: '<image:namespace:id>' };

/** Adds a glyph that shows a cell of another (multi-bitmap) glyph instead of its own image. */
function ReferenceGlyphButton() {
  const t = useTranslations('media.glyphs');
  return (
    <Tip label={t('referenceGlyphHelp')}>
      <Button variant="outline" onClick={() => addGlyph(t('defaultReferenceId'), null, 'reference')}>
        <Link2 /> {t('referenceGlyph')}
      </Button>
    </Tip>
  );
}

function MediaView<K extends MediaKind>({ kind }: { kind: K }) {
  const t = useTranslations('media');
  const project = useOpenProject();
  const plan = usePlan();
  const readFiles = useMediaFileReader(kind);
  const view = MEDIA_VIEWS[kind] as MediaViewInfo<K>;
  const { section } = view;
  const files = MEDIA_FILES[kind];
  const entries = mediaList(project, kind);
  const { layout } = packTargetFor(project);

  return (
    <MediaPage
      icon={view.icon}
      title={t(`${section}.title`)}
      count={t(`${section}.count`, { count: entries.length })}
      configPath={`${layout.pluginDir}/${layout.mediaFile(project, kind)}`}
      actions={
        <>
          {kind === 'glyph' && <ReferenceGlyphButton />}
          <DocsLinkButton href={mediaDocsFor(project.target, kind)} label={t('shared.docs', { target: project.target })} />
        </>
      }
      // Only the glyph hint uses {tag}
      hint={t.rich(`${section}.hint`, { ...richTags, target: project.target, tag: GLYPH_TAG_EXAMPLES[project.target] })}
      drop={{
        accept: files.accept,
        formats: files.formats,
        title: t(`${section}.dropTitle`),
        subtitle: t(`${section}.dropSubtitle`),
        onFiles: async (dropped) => {
          for (const entry of await readFiles(dropped)) view.add(entry.name, entry.file);
        },
      }}
    >
      {entries.map((entry) => view.card(entry, project, plan))}
    </MediaPage>
  );
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
