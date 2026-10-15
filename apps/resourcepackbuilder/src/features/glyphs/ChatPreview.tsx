import { useTranslations } from 'next-intl';
import type { Glyph, GlyphFile } from '@resourcepackbuilder/core/nexo/glyphs/model';

/** Screen pixels per Minecraft pixel in the preview. */
const PREVIEW_SCALE = 2;
/** Ascent of Minecraft's default font; a glyph with another ascent sits higher or lower than the text. */
const DEFAULT_FONT_ASCENT = 7;
/** Glyphs taller than this (screen pixels) are GUI images rather than characters; they get no chat preview. */
const MAX_PREVIEW_HEIGHT = 120;

/** Approximate look of the glyph between chat text (first cell of a multi-bitmap). */
export function ChatPreview({ glyph, file }: { glyph: Glyph; file: GlyphFile }) {
  const t = useTranslations('media.glyphs');
  const cellHeight = file.height / Math.max(1, glyph.rows);
  const cellWidth = file.width / Math.max(1, glyph.columns);
  const height = glyph.height * PREVIEW_SCALE;
  if (height > MAX_PREVIEW_HEIGHT) return <span className="text-xs text-muted-foreground">{t('largeNoPreview')}</span>;
  return (
    <div className="flex max-w-full min-w-0 items-start gap-1 rounded-sm border-2 border-input bg-background px-2.5 py-1.5 text-base leading-tight text-foreground">
      <span>{t('previewBefore')}</span>
      <span
        className="inline-block flex-none bg-no-repeat [background-position:0_0] [image-rendering:pixelated]"
        style={{
          width: (cellWidth / cellHeight) * height,
          height,
          marginTop: (DEFAULT_FONT_ASCENT - glyph.ascent) * PREVIEW_SCALE,
          backgroundImage: `url(${file.dataUrl})`,
          backgroundSize: `${glyph.columns * 100}% ${glyph.rows * 100}%`,
        }}
      />
      <span>{t('previewAfter')}</span>
    </div>
  );
}
