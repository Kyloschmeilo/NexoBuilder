/** Custom sounds and music discs (plugins/Nexo/sounds.yml + OGG files in the resource pack). */
import { Music } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { addSound } from '../../commands/media';
import { InlineCode } from '../../components/Hint';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { MediaPage } from '../media/MediaPage';
import { SoundCard } from './SoundCard';
import { SOUND_ACCEPT, SOUND_FORMATS } from './soundFiles';
import { useSoundFileReader } from './useSoundFileReader';

export function SoundsView() {
  const t = useTranslations('media.sounds');
  const { sounds } = useOpenProject();
  const plan = usePlan();
  const readFiles = useSoundFileReader();

  return (
    <MediaPage
      icon={<Music className="size-7" />}
      title={t('title')}
      count={t('count', { count: sounds.length })}
      configPath="plugins/Nexo/sounds.yml"
      hint={t.rich('hint', { code: (chunks) => <InlineCode>{chunks}</InlineCode> })}
      drop={{
        accept: SOUND_ACCEPT,
        formats: SOUND_FORMATS,
        title: t('dropTitle'),
        subtitle: t('dropSubtitle'),
        onFiles: async (files) => {
          for (const entry of await readFiles(files)) addSound(entry.name, [entry.file]);
        },
      }}
    >
      {sounds.map((sound) => (
        <SoundCard key={sound.id} sound={sound} plan={plan} />
      ))}
    </MediaPage>
  );
}
