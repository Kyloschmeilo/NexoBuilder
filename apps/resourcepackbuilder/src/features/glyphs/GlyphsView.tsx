import { Link2, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { glyphFilePath } from '@resourcepackbuilder/core/nexo/glyphs/files';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Tip } from '@resourcepackbuilder/ui';
import { addGlyph } from '../../commands/media';
import { richTags } from '../../i18n/richTags';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { MediaPage } from '../media/MediaPage';
import { GlyphCard } from './GlyphCard';
import { GLYPH_ACCEPT, GLYPH_FORMATS, glyphKindOf } from './glyphFiles';
import { useGlyphFileReader } from './useGlyphFileReader';

export function GlyphsView() {
  const t = useTranslations('media.glyphs');
  const project = useOpenProject();
  const plan = usePlan();
  const readFiles = useGlyphFileReader();
  const { glyphs } = project;

  return (
    <MediaPage
      icon={<Smile className="size-7" />}
      title={t('title')}
      count={t('count', { count: glyphs.length })}
      configPath={`plugins/Nexo/${glyphFilePath(project)}`}
      actions={
        <Tip label={t('referenceGlyphHelp')}>
          <Button variant="outline" onClick={() => addGlyph(t('defaultReferenceId'), null, 'reference')}>
            <Link2 /> {t('referenceGlyph')}
          </Button>
        </Tip>
      }
      hint={t.rich('hint', { ...richTags, tag: '<glyph:id>' })}
      drop={{
        accept: GLYPH_ACCEPT,
        formats: GLYPH_FORMATS,
        title: t('dropTitle'),
        subtitle: t('dropSubtitle'),
        onFiles: async (files) => {
          for (const entry of await readFiles(files)) addGlyph(entry.name, entry.file, glyphKindOf(entry.file));
        },
      }}
    >
      {glyphs.map((glyph) => (
        <GlyphCard key={glyph.id} glyph={glyph} glyphs={glyphs} plan={plan} />
      ))}
    </MediaPage>
  );
}
