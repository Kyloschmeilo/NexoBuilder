import { Disc3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { JukeboxSong, Sound } from '@resourcepackbuilder/core/project';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { AutoGrid } from '@resourcepackbuilder/ui';
import { updateJukeboxSong } from '../../commands/media';
import { NumberInput } from '../../components/editor';
import { FormField } from '../../components/FormField';
import { NexoKey } from '../media/NexoKey';
import { useMediaActions } from '../media/useMediaActions';

/** Strongest redstone signal a comparator can output. */
const MAX_COMPARATOR_OUTPUT = 15;

/** Options of a sound registered as a jukebox song, and the button that creates a music disc for it. */
export function JukeboxFields({ sound, song }: { sound: Sound; song: JukeboxSong }) {
  const t = useTranslations('media.sounds');
  const media = useMediaActions();
  const update = (recipe: (draft: JukeboxSong) => void, historyKey: string) => updateJukeboxSong(sound.id, recipe, historyKey);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
      <AutoGrid>
        <FormField label={<NexoKey>Duration</NexoKey>} help={t('durationHelp')}>
          <Input
            className="font-mono"
            aria-invalid={!song.duration.trim()}
            value={song.duration}
            placeholder={t('durationPlaceholder')}
            onChange={(e) => update((s) => (s.duration = e.target.value), 'duration')}
          />
        </FormField>
        <FormField label={<NexoKey>Description</NexoKey>} help={t('descriptionHelp')} wide>
          <Input value={song.description} onChange={(e) => update((s) => (s.description = e.target.value), 'description')} />
        </FormField>
        <FormField label={<NexoKey>Comparator Output</NexoKey>} help={t('comparatorHelp')}>
          <NumberInput
            value={song.comparatorOutput}
            integer
            min={0}
            max={MAX_COMPARATOR_OUTPUT}
            onChange={(v) => update((s) => (s.comparatorOutput = v ?? null), 'comparator')}
          />
        </FormField>
        <FormField label={<NexoKey>Range</NexoKey>} help={t('rangeHelp')}>
          <NumberInput value={song.range} integer min={1} onChange={(v) => update((s) => (s.range = v ?? null), 'range')} />
        </FormField>
      </AutoGrid>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => media.createMusicDisc(sound)}>
          <Disc3 /> {t('createDisc')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('createDiscHint')}</span>
      </div>
    </div>
  );
}
