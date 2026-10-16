import { Plus, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { soundFilePath } from '@resourcepackbuilder/core/nexo/sounds/files';
import type { Sound } from '@resourcepackbuilder/core/nexo/sounds/model';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@resourcepackbuilder/ui/components/item';
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
        <Item key={`${index}:${file.name}`} variant="muted" size="xs" className="gap-x-3 gap-y-1.5 border-border px-2 py-1.5">
          <ItemMedia className="w-full @md/media-card:w-64">
            <audio controls preload="none" src={file.dataUrl} className="h-8 w-full" />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <Tip label={file.name}>
              <ItemTitle className="max-w-full truncate font-mono text-xs font-normal">{soundFilePath(sound, index)}.ogg</ItemTitle>
            </Tip>
          </ItemContent>
          <ItemActions>
            <span className="text-xs text-muted-foreground">{fileSize(file.size)}</span>
            <IconButton label={t('removeFile')} variant="ghost-destructive" onClick={() => removeSoundFile(sound.id, index)}>
              <Trash2 />
            </IconButton>
          </ItemActions>
        </Item>
      ))}
      <div>
        <Button variant="outline" size="sm" onClick={() => void addFiles()}>
          <Plus /> {t('addFile')}
        </Button>
      </div>
    </div>
  );
}
