/**
 * The jukebox song of a sound: whether the sound is one (a music disc can play it), its duration, description,
 * comparator output and range. Nexo writes it as `jukebox_playable` of the sound, CraftEngine as a `jukebox_songs`
 * entry.
 */
import { Disc3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Sound } from '@resourcepackbuilder/core/project';
import { jukeboxDocsFor } from '@resourcepackbuilder/core/targets';
import { DocsLink, FieldGroup, Help, Section } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { setSoundJukebox, updateJukeboxSong } from '../../commands/media';
import { NumberInput } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { MediaField, SwitchField } from '../media/MediaFields';
import { useMediaActions } from '../media/useMediaActions';

/** Strongest redstone signal a comparator can output. */
const MAX_COMPARATOR_OUTPUT = 15;

/** The Jukebox section of a sound page. */
export function JukeboxSection({ sound }: { sound: Sound }) {
  const t = useTranslations('media.sounds');
  const tField = useTranslations('media.fields');
  const tSection = useTranslations('media.sections');
  const media = useMediaActions();
  const { target } = useOpenProject();
  const nexo = target === 'nexo';
  const song = sound.jukebox;
  const update = (recipe: (draft: NonNullable<Sound['jukebox']>) => void, historyKey: string) =>
    updateJukeboxSong(sound.id, recipe, historyKey);

  return (
    <Section
      id="jukebox"
      title={tSection('jukebox')}
      actions={<DocsLink url={jukeboxDocsFor(target)} target={target} label={t('jukeboxDocs', { target })} />}
    >
      <FieldGroup>
        <SwitchField
          label={tField('jukebox')}
          yamlKey={nexo ? 'jukebox_playable' : 'jukebox_songs'}
          help={t('jukeboxHint')}
          checked={song !== null}
          onChange={(checked) => setSoundJukebox(sound.id, checked)}
        />
        {song && (
          <>
            <MediaField
              label={tField('duration')}
              yamlKey={nexo ? 'duration' : 'length'}
              help={t('durationHelp')}
              error={song.duration.trim() ? undefined : t('durationMissing')}
            >
              {(id) => (
                <Input
                  id={id}
                  className="font-mono"
                  value={song.duration}
                  placeholder={t('durationPlaceholder')}
                  onChange={(e) => update((s) => (s.duration = e.target.value), 'duration')}
                />
              )}
            </MediaField>
            <MediaField label={tField('description')} yamlKey="description" help={t('descriptionHelp')}>
              {(id) => (
                <Input id={id} value={song.description} onChange={(e) => update((s) => (s.description = e.target.value), 'description')} />
              )}
            </MediaField>
            <MediaField label={tField('comparatorOutput')} yamlKey="comparator_output" help={t('comparatorHelp')}>
              {(id) => (
                <NumberInput
                  id={id}
                  value={song.comparatorOutput}
                  integer
                  min={0}
                  max={MAX_COMPARATOR_OUTPUT}
                  onChange={(v) => update((s) => (s.comparatorOutput = v ?? null), 'comparator')}
                />
              )}
            </MediaField>
            <MediaField label={tField('range')} yamlKey="range" help={t('rangeHelp')}>
              {(id) => (
                <NumberInput id={id} value={song.range} integer min={1} onChange={(v) => update((s) => (s.range = v ?? null), 'range')} />
              )}
            </MediaField>
          </>
        )}
      </FieldGroup>
      {song && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => media.createMusicDisc(sound)}>
            <Disc3 /> {t('createDisc')}
          </Button>
          <Help>{t('createDiscHint')}</Help>
        </div>
      )}
    </Section>
  );
}
