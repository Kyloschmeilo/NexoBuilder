/** The OGG files of a sound (variants played at random), each with a player, its pack path and size. */
import { Plus, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { type Sound, soundFilePath } from '@resourcepackbuilder/core/project';
import { EmptyHint, IconButton, Panel, pickFiles } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addSoundFiles, removeSoundFile } from '../../commands/media';
import { useMediaFileReader } from '../../hooks/useFileReaders';
import { MEDIA_FILES } from '../../lib/mediaFiles';

const BYTES_PER_KB = 1000;
const BYTES_PER_MB = 1_000_000;

export function SoundFileList({ sound }: { sound: Sound }) {
  const t = useTranslations('media.sounds');
  const format = useFormatter();
  const readFiles = useMediaFileReader('sound');

  const fileSize = (bytes: number) =>
    bytes > BYTES_PER_MB
      ? format.number(bytes / BYTES_PER_MB, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 })
      : format.number(Math.max(1, Math.round(bytes / BYTES_PER_KB)), { style: 'unit', unit: 'kilobyte' });

  const addFiles = async () => {
    const entries = await readFiles(await pickFiles(MEDIA_FILES.sound.accept));
    if (entries.length)
      addSoundFiles(
        sound.id,
        entries.map((entry) => entry.file),
      );
  };

  if (sound.files.length === 0)
    return (
      <EmptyHint actionLabel={t('addFile')} onAction={() => void addFiles()}>
        {t('noFiles')}
      </EmptyHint>
    );

  return (
    <div className="flex flex-col gap-2">
      <Panel className="overflow-hidden">
        <ul className="m-0 flex list-none flex-col p-0">
          {sound.files.map((file, index) => (
            <li
              key={`${index}:${file.name}`}
              className="@container/sound-file flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line px-3 py-2 first:border-t-0"
            >
              <audio controls preload="none" src={file.dataUrl} aria-label={file.name} className="h-8 w-full @md/sound-file:w-64" />
              <code title={file.name} className="min-w-0 flex-1 truncate font-mono text-micro text-text-muted">
                {soundFilePath(sound, index)}.ogg
              </code>
              <span className="text-micro text-text-muted tabular-nums">{fileSize(file.size)}</span>
              <IconButton label={t('removeFile')} variant="ghost-destructive" onClick={() => removeSoundFile(sound.id, index)}>
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
      </Panel>
      <div>
        <Button variant="ghost" size="sm" onClick={() => void addFiles()}>
          <Plus /> {t('addFile')}
        </Button>
      </div>
    </div>
  );
}
