import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { issuesFor } from '@resourcepackbuilder/utils';
import { normalizeTypedId, SOUND_ID_CHARS } from '@resourcepackbuilder/minecraft';
import { type Sound, soundEventKey } from '@resourcepackbuilder/core/project';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { AutoGrid } from '@resourcepackbuilder/ui';
import { setSoundJukebox, updateSound } from '../../commands/media';
import { NumberInput, TextInput } from '../../components/editor';
import { CheckboxField } from '../../components/CheckboxField';
import { FormField } from '../../components/FormField';
import { IssueList } from '../../components/IssueList';
import { useOpenProject } from '../../store/project';
import { MediaCard } from '../media/MediaCard';
import { NexoKey } from '../media/NexoKey';
import { useMediaActions } from '../media/useMediaActions';
import { JukeboxFields } from './JukeboxFields';
import { SoundFileList } from './SoundFileList';

export function SoundCard({ sound, plan }: { sound: Sound; plan: ExportPlan | null }) {
  const t = useTranslations('media.sounds');
  const tShared = useTranslations('media.shared');
  const media = useMediaActions();
  const project = useOpenProject();
  const update = (recipe: (draft: Sound) => void, historyKey?: string) => updateSound(sound.id, recipe, historyKey);
  const issues = plan ? issuesFor(plan.issues, { kind: 'sound', id: sound.id }) : [];
  const otherEvents = project.sounds.filter((other) => other.id !== sound.id).map((other) => ({ value: soundEventKey(project, other) }));

  return (
    <MediaCard
      title={sound.soundId}
      badges={sound.jukebox && <Badge>{t('jukeboxSong')}</Badge>}
      usage={soundEventKey(project, sound)}
      copyLabel={tShared('copyId')}
      deleteLabel={t('delete')}
      onDelete={() => void media.remove('sound', sound)}
    >
      <AutoGrid>
        <FormField label={<NexoKey>ID</NexoKey>} help={t('idHelp')}>
          <Input
            className="font-mono"
            value={sound.soundId}
            onChange={(e) => update((s) => (s.soundId = normalizeTypedId(e.target.value, SOUND_ID_CHARS)), 'id')}
          />
        </FormField>
        <FormField label={<NexoKey>Volume</NexoKey>} help={t('volumeHelp')}>
          <NumberInput value={sound.volume} min={0} onChange={(v) => update((s) => (s.volume = v ?? null), 'volume')} />
        </FormField>
        <FormField label={<NexoKey>Pitch</NexoKey>} help={t('pitchHelp')}>
          <NumberInput value={sound.pitch} min={0} onChange={(v) => update((s) => (s.pitch = v ?? null), 'pitch')} />
        </FormField>
        <FormField label={<NexoKey>Attenuation Distance</NexoKey>} help={t('distanceHelp')}>
          <NumberInput value={sound.distance} integer min={1} onChange={(v) => update((s) => (s.distance = v ?? null), 'distance')} />
        </FormField>
        <FormField label={<NexoKey>Weight</NexoKey>} help={t('weightHelp')}>
          <NumberInput value={sound.weight} integer min={1} onChange={(v) => update((s) => (s.weight = v ?? null), 'weight')} />
        </FormField>
        <FormField label={<NexoKey>Subtitle</NexoKey>} help={t('subtitleHelp')}>
          <Input
            className="font-mono"
            value={sound.subtitle}
            placeholder={t('subtitlePlaceholder')}
            onChange={(e) => update((s) => (s.subtitle = e.target.value), 'subtitle')}
          />
        </FormField>
        <FormField label={<NexoKey>Reference</NexoKey>} help={t('referenceHelp')}>
          <TextInput
            value={sound.reference}
            mono
            placeholder={t('referencePlaceholder')}
            suggestions={otherEvents}
            onChange={(v) => update((s) => (s.reference = v ?? ''), 'reference')}
          />
        </FormField>
      </AutoGrid>
      <SoundFileList sound={sound} />
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <CheckboxField
          checked={sound.stream}
          onChange={(checked) => update((s) => (s.stream = checked))}
          label={<NexoKey>Stream</NexoKey>}
          description={t('streamHint')}
        />
        <CheckboxField
          checked={sound.preload}
          onChange={(checked) => update((s) => (s.preload = checked))}
          label={<NexoKey>Preload</NexoKey>}
          description={t('preloadHint')}
        />
        <CheckboxField
          checked={sound.replace}
          onChange={(checked) => update((s) => (s.replace = checked))}
          label={<NexoKey>Replace</NexoKey>}
          description={t('replaceHint')}
        />
        <CheckboxField
          checked={sound.jukebox !== null}
          onChange={(checked) => setSoundJukebox(sound.id, checked)}
          label={<NexoKey>Jukebox Playable</NexoKey>}
          description={t('jukeboxHint')}
        />
      </div>
      {sound.jukebox && <JukeboxFields sound={sound} song={sound.jukebox} />}
      <IssueList issues={issues} />
    </MediaCard>
  );
}
