import { Plus, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { soundFilePath } from '@resourcepackbuilder/core/nexo/sounds/files';
import type { Sound } from '@resourcepackbuilder/core/nexo/sounds/model';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { IconButton, Tip, pickFiles } from '@resourcepackbuilder/ui';
import { addSoundFiles, removeSoundFile } from '../../commands/media';
import { SOUND_ACCEPT } from './soundFiles';
import { useSoundFileReader } from './useSoundFileReader';

const BYTES_PER_KB = 1000;
const BYTES_PER_MB = 1_000_000;

/** The sound's OGG files (variants played at random) with player, path and size. */
export function SoundFileList({ sound }: { sound: Sound }) {
  const t = useTranslations('media.sounds');
  const format = useFormatter();
  const readFiles = useSoundFileReader();

  const fileSize = (bytes: number) =>
    bytes > BYTES_PER_MB
      ? format.number(bytes / BYTES_PER_MB, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 })
      : format.number(Math.max(1, Math.round(bytes / BYTES_PER_KB)), { style: 'unit', unit: 'kilobyte' });

  const addFiles = async () => {
    const entries = await readFiles(await pickFiles(SOUND_ACCEPT));
    if (entries.length)
      addSoundFiles(
        sound.id,
        entries.map((entry) => entry.file),
      );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {t('files')} {sound.files.length > 1 && <span className="font-normal">{t('filesRandom')}</span>}
      </span>
      {sound.files.map((file, index) => (
        <div
          key={`${index}:${file.name}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1.5"
        >
          <audio controls preload="none" src={file.dataUrl} className="h-8 w-full @md/media-card:w-64" />
          <Tip label={file.name}>
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{soundFilePath(sound, index)}.ogg</span>
          </Tip>
          <span className="text-xs text-muted-foreground">{fileSize(file.size)}</span>
          <IconButton label={t('removeFile')} variant="ghost-destructive" onClick={() => removeSoundFile(sound.id, index)}>
            <Trash2 />
          </IconButton>
        </div>
      ))}
      <div>
        <Button variant="outline" size="sm" onClick={() => void addFiles()}>
          <Plus /> {t('addFile')}
        </Button>
      </div>
    </div>
  );
}
