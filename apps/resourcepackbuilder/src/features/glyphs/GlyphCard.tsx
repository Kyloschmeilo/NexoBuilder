import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/core/export/types';
import { issuesFor } from '@resourcepackbuilder/core/issues';
import type { Glyph } from '@resourcepackbuilder/core/nexo/glyphs/model';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { IconButton, pickFiles } from '@resourcepackbuilder/ui';
import { deleteGlyph, updateGlyph } from '../../commands/media';
import { IssueList } from '../../components/IssueList';
import { MediaCard, PreviewFrame } from '../media/MediaCard';
import { ChatPreview } from './ChatPreview';
import { GlyphFields } from './GlyphFields';
import { GLYPH_ACCEPT, glyphKindOf } from './glyphFiles';
import { glyphTag } from './glyphTag';
import { useGlyphFileReader } from './useGlyphFileReader';

export function GlyphCard({ glyph, glyphs, plan }: { glyph: Glyph; glyphs: Glyph[]; plan: ExportPlan | null }) {
  const t = useTranslations('media.glyphs');
  const tShared = useTranslations('media.shared');
  const readFiles = useGlyphFileReader();
  const issues = plan ? issuesFor(plan.issues, { kind: 'glyph', id: glyph.id }) : [];
  const { file } = glyph;

  const replaceImage = async () => {
    const [entry] = await readFiles(await pickFiles(GLYPH_ACCEPT, false));
    if (!entry) return;
    updateGlyph(glyph.id, (draft) => {
      draft.file = entry.file;
      draft.kind = glyphKindOf(entry.file);
    });
  };

  return (
    <MediaCard
      title={glyph.glyphId}
      badges={
        <>
          <Badge variant="secondary">{t(`kinds.${glyph.kind}`)}</Badge>
          {file && <Badge variant="secondary">{t('pixelSize', { width: file.width, height: file.height })}</Badge>}
        </>
      }
      usage={glyphTag(glyph)}
      copyLabel={t('copyTag')}
      actions={
        glyph.kind !== 'reference' && (
          <IconButton label={tShared('replaceImage')} onClick={() => void replaceImage()}>
            <RefreshCw />
          </IconButton>
        )
      }
      deleteLabel={t('delete')}
      onDelete={() => deleteGlyph(glyph.id)}
      preview={
        glyph.kind !== 'reference' && (
          <>
            <PreviewFrame>
              {file && (
                // eslint-disable-next-line @next/next/no-img-element -- a data URL; next/image cannot optimise it in a static export
                <img src={file.dataUrl} alt="" className="size-full object-contain [image-rendering:pixelated]" />
              )}
            </PreviewFrame>
            {file && <ChatPreview glyph={glyph} file={file} />}
          </>
        )
      }
    >
      <GlyphFields glyph={glyph} glyphs={glyphs} />
      {glyph.kind !== 'reference' && <p className="text-xs leading-relaxed text-muted-foreground">{t('sizeHelp')}</p>}
      <IssueList issues={issues} />
    </MediaCard>
  );
}
