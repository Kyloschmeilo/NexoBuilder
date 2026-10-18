/**
 * The page of one sound: its OGG files, the basic options (id, volume, pitch, distance, weight, subtitle, the event
 * it plays instead), how it is played (stream, preload, replace) and its jukebox song (with the music disc button).
 */
import { Music } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { issuesFor } from '@resourcepackbuilder/utils';
import { normalizeTypedId, SOUND_ID_CHARS } from '@resourcepackbuilder/minecraft';
import { type Sound, soundEventKey } from '@resourcepackbuilder/core/project';
import { FieldGroup, Section, StatusPill } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { updateSound } from '../../commands/media';
import { NumberInput, TextInput } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { MediaEntryFrame } from '../media/MediaEntryFrame';
import { MediaField, SwitchField } from '../media/MediaFields';
import { JukeboxSection } from './JukeboxFields';
import { SoundFileList } from './SoundFileList';

export function SoundPage({ sound, plan }: { sound: Sound; plan: ExportPlan | null }) {
  const t = useTranslations('media.sounds');
  const tShared = useTranslations('media.shared');
  const tField = useTranslations('media.fields');
  const tSection = useTranslations('media.sections');
  const project = useOpenProject();
  const nexo = project.target === 'nexo';
  const update = (recipe: (draft: Sound) => void, historyKey?: string) => updateSound(sound.id, recipe, historyKey);
  const issues = plan ? issuesFor(plan.issues, { kind: 'sound', id: sound.id }) : [];
  const otherEvents = project.sounds.filter((other) => other.id !== sound.id).map((other) => ({ value: soundEventKey(project, other) }));

  return (
    <MediaEntryFrame
      kind="sound"
      entry={sound}
      title={sound.soundId}
      thumb={<Music />}
      meta={sound.jukebox && <StatusPill tone="info" label={t('jukeboxSong')} />}
      usage={soundEventKey(project, sound)}
      copyLabel={tShared('copyId')}
      issues={issues}
    >
      <Section id="files" title={t('files')} description={sound.files.length > 1 ? t('filesRandom') : undefined}>
        <SoundFileList sound={sound} />
      </Section>
      <Section id="basics" title={tSection('basics')}>
        <FieldGroup>
          <MediaField label={tField('id')} yamlKey={nexo ? 'id' : undefined} help={t('idHelp')}>
            {(id) => (
              <Input
                id={id}
                className="font-mono"
                value={sound.soundId}
                onChange={(e) => update((s) => (s.soundId = normalizeTypedId(e.target.value, SOUND_ID_CHARS)), 'id')}
              />
            )}
          </MediaField>
          <MediaField label={tField('volume')} yamlKey="volume" help={t('volumeHelp')}>
            {(id) => <NumberInput id={id} value={sound.volume} min={0} onChange={(v) => update((s) => (s.volume = v ?? null), 'volume')} />}
          </MediaField>
          <MediaField label={tField('pitch')} yamlKey="pitch" help={t('pitchHelp')}>
            {(id) => <NumberInput id={id} value={sound.pitch} min={0} onChange={(v) => update((s) => (s.pitch = v ?? null), 'pitch')} />}
          </MediaField>
          <MediaField label={tField('distance')} yamlKey="attenuation_distance" help={t('distanceHelp')}>
            {(id) => (
              <NumberInput
                id={id}
                value={sound.distance}
                integer
                min={1}
                onChange={(v) => update((s) => (s.distance = v ?? null), 'distance')}
              />
            )}
          </MediaField>
          <MediaField label={tField('weight')} yamlKey="weight" help={t('weightHelp')}>
            {(id) => (
              <NumberInput id={id} value={sound.weight} integer min={1} onChange={(v) => update((s) => (s.weight = v ?? null), 'weight')} />
            )}
          </MediaField>
          <MediaField label={tField('subtitle')} yamlKey="subtitle" help={t('subtitleHelp')}>
            {(id) => (
              <Input
                id={id}
                className="font-mono"
                value={sound.subtitle}
                placeholder={t('subtitlePlaceholder')}
                onChange={(e) => update((s) => (s.subtitle = e.target.value), 'subtitle')}
              />
            )}
          </MediaField>
          <MediaField label={tField('reference')} yamlKey={nexo ? 'reference_id' : 'type: event'} help={t('referenceHelp')}>
            {(id) => (
              <TextInput
                id={id}
                value={sound.reference}
                mono
                placeholder={t('referencePlaceholder')}
                suggestions={otherEvents}
                onChange={(v) => update((s) => (s.reference = v ?? ''), 'reference')}
              />
            )}
          </MediaField>
        </FieldGroup>
      </Section>
      <Section id="playback" title={tSection('playback')}>
        <FieldGroup>
          <SwitchField
            label={tField('stream')}
            yamlKey="stream"
            help={t('streamHint')}
            checked={sound.stream}
            onChange={(checked) => update((s) => (s.stream = checked))}
          />
          <SwitchField
            label={tField('preload')}
            yamlKey="preload"
            help={t('preloadHint')}
            checked={sound.preload}
            onChange={(checked) => update((s) => (s.preload = checked))}
          />
          <SwitchField
            label={tField('replace')}
            yamlKey="replace"
            help={t('replaceHint')}
            checked={sound.replace}
            onChange={(checked) => update((s) => (s.replace = checked))}
          />
        </FieldGroup>
      </Section>
      <JukeboxSection sound={sound} />
    </MediaEntryFrame>
  );
}
