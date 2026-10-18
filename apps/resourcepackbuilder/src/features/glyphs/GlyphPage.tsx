/**
 * The page of one glyph: its image and chat preview, the basic options (id, size, grid, frames), the chat options,
 * the advanced options and, for CraftEngine, the emoji content.
 */
import { RefreshCw, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { issuesFor } from '@resourcepackbuilder/utils';
import { glyphKindOf, type Glyph } from '@resourcepackbuilder/core/project';
import { glyphTagFor } from '@resourcepackbuilder/core/targets';
import { IconButton, pickFiles, Section, StatusPill } from '@resourcepackbuilder/ui';
import { updateGlyph } from '../../commands/media';
import { useMediaFileReader } from '../../hooks/useFileReaders';
import { MEDIA_FILES } from '../../lib/mediaFiles';
import { useOpenProject } from '../../store/project';
import { MediaEntryFrame, PreviewFrame } from '../media/MediaEntryFrame';
import { ChatPreview } from './ChatPreview';
import { EmojiContentSection, GlyphExtraFields, hasGlyphExtraFields } from './GlyphExtraFields';
import { GlyphBasicsFields, GlyphChatFields } from './GlyphFields';

export function GlyphPage({ glyph, plan }: { glyph: Glyph; plan: ExportPlan | null }) {
  const t = useTranslations('media.glyphs');
  const tShared = useTranslations('media.shared');
  const tSection = useTranslations('media.sections');
  const readFiles = useMediaFileReader('glyph');
  const project = useOpenProject();
  const issues = plan ? issuesFor(plan.issues, { kind: 'glyph', id: glyph.id }) : [];
  const { file } = glyph;
  const own = glyph.kind !== 'reference';

  const replaceImage = async () => {
    const [entry] = await readFiles(await pickFiles(MEDIA_FILES.glyph.accept, false));
    if (!entry) return;
    updateGlyph(glyph.id, (draft) => {
      draft.file = entry.file;
      draft.kind = glyphKindOf(entry.file);
    });
  };

  return (
    <MediaEntryFrame
      kind="glyph"
      entry={glyph}
      title={glyph.glyphId}
      thumb={file ? <img src={file.dataUrl} alt="" /> : <Smile />}
      meta={
        <>
          <StatusPill tone="info" label={t(`kinds.${glyph.kind}`)} />
          {file && <StatusPill tone="muted" label={t('pixelSize', { width: file.width, height: file.height })} />}
        </>
      }
      usage={glyphTagFor(project, glyph)}
      copyLabel={t('copyTag')}
      actions={
        own && (
          <IconButton label={tShared('replaceImage')} onClick={() => void replaceImage()}>
            <RefreshCw />
          </IconButton>
        )
      }
      issues={issues}
    >
      {own && (
        <Section id="preview" title={tSection('preview')} description={t('sizeHelp')}>
          <div className="flex flex-wrap items-start gap-4">
            <PreviewFrame src={file?.dataUrl} />
            {file && <ChatPreview glyph={glyph} file={file} />}
          </div>
        </Section>
      )}
      <Section id="basics" title={tSection('basics')}>
        <GlyphBasicsFields glyph={glyph} glyphs={project.glyphs} />
      </Section>
      <Section id="chat" title={tSection('chat')}>
        <GlyphChatFields glyph={glyph} />
      </Section>
      {hasGlyphExtraFields(glyph, project.target === 'nexo') && (
        <Section id="advanced" title={tSection('advanced')}>
          <GlyphExtraFields glyph={glyph} glyphs={project.glyphs} />
        </Section>
      )}
      <EmojiContentSection glyph={glyph} />
    </MediaEntryFrame>
  );
}
