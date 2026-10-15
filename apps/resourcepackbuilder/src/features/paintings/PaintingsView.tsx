/** Custom paintings (plugins/Nexo/paintings.yml + texture in the resource pack). */
import { Frame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { addPainting } from '../../commands/media';
import { InlineCode } from '../../components/Hint';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { MediaPage } from '../media/MediaPage';
import { PaintingCard } from './PaintingCard';
import { PAINTING_ACCEPT, PAINTING_FORMATS } from './paintingFiles';
import { usePaintingFileReader } from './usePaintingFileReader';

export function PaintingsView() {
  const t = useTranslations('media.paintings');
  const { paintings } = useOpenProject();
  const plan = usePlan();
  const readFiles = usePaintingFileReader();

  return (
    <MediaPage
      icon={<Frame className="size-7" />}
      title={t('title')}
      count={t('count', { count: paintings.length })}
      configPath="plugins/Nexo/paintings.yml"
      hint={t.rich('hint', { code: (chunks) => <InlineCode>{chunks}</InlineCode> })}
      drop={{
        accept: PAINTING_ACCEPT,
        formats: PAINTING_FORMATS,
        title: t('dropTitle'),
        subtitle: t('dropSubtitle'),
        onFiles: async (files) => {
          for (const entry of await readFiles(files)) addPainting(entry.name, entry.file);
        },
      }}
    >
      {paintings.map((painting) => (
        <PaintingCard key={painting.id} painting={painting} plan={plan} />
      ))}
    </MediaPage>
  );
}
