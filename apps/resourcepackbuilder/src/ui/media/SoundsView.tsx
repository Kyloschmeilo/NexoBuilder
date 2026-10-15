/** Custom sounds and music discs (plugins/Nexo/sounds.yml + OGG files in the resource pack). */
import { Disc3, Music, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { soundFilePath, soundKey, type Sound, type SoundFile } from '@resourcepackbuilder/core/nexo/sounds';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { CopyButton, DropZone, IssueList, NumberInput, pickFiles, readAsDataUrl } from '@resourcepackbuilder/ui';
import { translator } from '../../i18n/locale';
import { addMusicDiscItem, addSound, deleteSound, updateSound } from '../../state/actions';
import { useStore } from '../../state/store';
import { CheckRow, Code, FieldGrid, FormField, Hint, IconAction, ViewHeader, ViewShell } from './layout';

const ACCEPT = '.ogg,audio/ogg';

async function readSoundFiles(files: File[]): Promise<Array<{ name: string; file: SoundFile }>> {
  const result: Array<{ name: string; file: SoundFile }> = [];
  for (const f of files) {
    if (!f.name.toLowerCase().endsWith('.ogg')) {
      useStore.getState().toast('error', translator('media')('sounds.notOgg', { name: f.name }));
      continue;
    }
    const dataUrl = (await readAsDataUrl(f)).replace(/^data:[^;,]*/, 'data:audio/ogg');
    result.push({ name: f.name.replace(/\.[^.]+$/, ''), file: { name: f.name, dataUrl, size: f.size } });
  }
  return result;
}

const formatSize = (bytes: number) => (bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`);

export function SoundsView({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('media.sounds');
  const sounds = useStore((s) => s.project?.sounds ?? []);
  return (
    <ViewShell>
      <ViewHeader
        icon={<Music className="size-7" />}
        title={t('title')}
        meta={
          <>
            <Badge variant="secondary">{t('count', { count: sounds.length })}</Badge>
            <Badge variant="outline" className="font-mono">
              plugins/Nexo/sounds.yml
            </Badge>
          </>
        }
      />
      <Hint>
        <div>{t.rich('hint', { code: (chunks) => <Code>{chunks}</Code> })}</div>
      </Hint>
      <DropZone
        onFiles={async (files) => {
          for (const entry of await readSoundFiles(files)) addSound(entry.name, [entry.file]);
        }}
        accept={ACCEPT}
        title={t('dropTitle')}
        subtitle={t('dropSubtitle')}
        formats={['.ogg']}
        compact
      />
      {sounds.length > 0 && (
        <div className="mt-2 flex flex-col gap-4">
          {sounds.map((sound) => (
            <SoundCard key={sound.id} sound={sound} plan={plan} />
          ))}
        </div>
      )}
    </ViewShell>
  );
}

function SoundCard({ sound, plan }: { sound: Sound; plan: ExportPlan | null }) {
  const t = useTranslations('media.sounds');
  const tShared = useTranslations('media.shared');
  const project = useStore((s) => s.project)!;
  const update = (fn: (s: Sound) => void, key?: string) => updateSound(sound.id, fn, key);
  const issues = plan?.issues.filter((i) => i.soundId === sound.id) ?? [];
  const key = soundKey(project, sound);
  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="truncate font-mono text-sm font-medium">{sound.soundId}</h3>
          {sound.jukebox && <Badge>{t('jukeboxSong')}</Badge>}
        </div>
        <span className="truncate font-mono text-xs text-muted-foreground">{key}</span>
        <CopyButton text={key} label={tShared('copyId')} />
        <IconAction label={t('delete')} destructive onClick={() => deleteSound(sound.id)}>
          <Trash2 />
        </IconAction>
      </div>
      <CardContent className="flex flex-col gap-3.5 py-4">
        <FieldGrid>
          <FormField label="ID" help={t('idHelp')}>
            <Input
              className="font-mono"
              value={sound.soundId}
              onChange={(e) => update((s) => (s.soundId = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_')), 'id')}
            />
          </FormField>
          <FormField label="Volume" help={t('volumeHelp')}>
            <NumberInput value={sound.volume} min={0} onChange={(v) => update((s) => (s.volume = v ?? null), 'volume')} />
          </FormField>
          <FormField label="Pitch" help={t('pitchHelp')}>
            <NumberInput value={sound.pitch} min={0} onChange={(v) => update((s) => (s.pitch = v ?? null), 'pitch')} />
          </FormField>
          <FormField label="Attenuation Distance" help={t('distanceHelp')}>
            <NumberInput value={sound.distance} integer min={1} onChange={(v) => update((s) => (s.distance = v ?? null), 'distance')} />
          </FormField>
        </FieldGrid>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t('files')} {sound.files.length > 1 && <span className="font-normal">{t('filesRandom')}</span>}
          </span>
          {sound.files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-2 py-1.5">
              <audio controls preload="none" src={file.dataUrl} className="h-8 w-[260px] flex-none" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={file.name}>
                {soundFilePath(sound, i)}.ogg
              </span>
              <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
              <IconAction label={t('removeFile')} destructive onClick={() => update((s) => (s.files = s.files.filter((_, j) => j !== i)))}>
                <Trash2 />
              </IconAction>
            </div>
          ))}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const entries = await readSoundFiles(await pickFiles(ACCEPT));
                if (entries.length) update((s) => (s.files = [...s.files, ...entries.map((e) => e.file)]));
              }}
            >
              <Plus /> {t('addFile')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <CheckRow checked={sound.stream} onChange={(checked) => update((s) => (s.stream = checked))} label="Stream" hint={t('streamHint')} />
          <CheckRow
            checked={!!sound.jukebox}
            onChange={(checked) =>
              update((s) => {
                s.jukebox = checked ? { duration: '', description: '', comparatorOutput: null, range: null } : null;
                if (checked) s.stream = true;
              })
            }
            label="Jukebox Playable"
            hint={t('jukeboxHint')}
          />
        </div>

        {sound.jukebox && (
          <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
            <FieldGrid>
              <FormField label="Duration" help={t('durationHelp')}>
                <Input
                  className="font-mono"
                  aria-invalid={!sound.jukebox.duration.trim()}
                  value={sound.jukebox.duration}
                  placeholder={t('durationPlaceholder')}
                  onChange={(e) => update((s) => (s.jukebox!.duration = e.target.value), 'duration')}
                />
              </FormField>
              <FormField label="Description" help={t('descriptionHelp')} wide>
                <Input value={sound.jukebox.description} onChange={(e) => update((s) => (s.jukebox!.description = e.target.value), 'description')} />
              </FormField>
              <FormField label="Comparator Output" help={t('comparatorHelp')}>
                <NumberInput
                  value={sound.jukebox.comparatorOutput}
                  integer
                  min={0}
                  max={15}
                  onChange={(v) => update((s) => (s.jukebox!.comparatorOutput = v ?? null), 'comparator')}
                />
              </FormField>
              <FormField label="Range" help={t('rangeHelp')}>
                <NumberInput value={sound.jukebox.range} integer min={1} onChange={(v) => update((s) => (s.jukebox!.range = v ?? null), 'range')} />
              </FormField>
            </FieldGrid>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const id = addMusicDiscItem(sound);
                  if (id) useStore.getState().toast('success', t('discCreated'));
                }}
              >
                <Disc3 /> {t('createDisc')}
              </Button>
              <span className="text-xs text-muted-foreground">{t('createDiscHint')}</span>
            </div>
          </div>
        )}
        <IssueList issues={issues} />
      </CardContent>
    </Card>
  );
}
