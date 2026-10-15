/** Eigene Sounds und Musik-CDs (plugins/Nexo/sounds.yml + OGG-Dateien im Resourcepack). */
import { Disc3, Music, Plus, Trash2 } from 'lucide-react';
import type { ExportPlan } from '@nexobuilder/core/export/plan';
import { soundFilePath, soundKey, type Sound, type SoundFile } from '@nexobuilder/core/nexo/sounds';
import { addMusicDiscItem, addSound, deleteSound, updateSound } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '@nexobuilder/ui';
import { IssueList } from '@nexobuilder/ui';
import { CopyButton } from '@nexobuilder/ui';
import { NumberInput } from '@nexobuilder/ui';
import { pickFiles, readAsDataUrl } from '@nexobuilder/ui';

const ACCEPT = '.ogg,audio/ogg';

async function readSoundFiles(files: File[]): Promise<Array<{ name: string; file: SoundFile }>> {
  const result: Array<{ name: string; file: SoundFile }> = [];
  for (const f of files) {
    if (!f.name.toLowerCase().endsWith('.ogg')) {
      useStore.getState().toast('error', `„${f.name}“ ist keine OGG-Datei. Minecraft spielt nur .ogg ab (z.B. mit Audacity umwandeln).`);
      continue;
    }
    const dataUrl = (await readAsDataUrl(f)).replace(/^data:[^;,]*/, 'data:audio/ogg');
    result.push({ name: f.name.replace(/\.[^.]+$/, ''), file: { name: f.name, dataUrl, size: f.size } });
  }
  return result;
}

const formatSize = (bytes: number) => (bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`);

export function SoundsView({ plan }: { plan: ExportPlan | null }) {
  const sounds = useStore((s) => s.project?.sounds ?? []);
  return (
    <div className="editor">
      <div className="editor-header">
        <div className="editor-thumb">
          <Music size={30} />
        </div>
        <div className="editor-title">
          <h1>Sounds</h1>
          <div className="editor-meta">
            <span className="badge">{sounds.length} Sound(s)</span>
            <span className="badge mono">plugins/Nexo/sounds.yml</span>
          </div>
        </div>
      </div>
      <div className="hint">
        Eigene Geräusche und Musik. Die ID (z.B. <code className="code-inline">namespace:block.rubin.place</code>) kannst du überall eintragen, wo ein
        Sound verlangt wird – etwa bei Block-Sounds, Türen oder <code className="code-inline">/playsound</code>. Mit „Jukebox Playable“ wird der Sound zur
        Musik-CD. Achtung: Die exportierte <code className="code-inline">sounds.yml</code> ersetzt eine vorhandene Datei auf dem Server.
      </div>
      <DropZone
        onFiles={async (files) => {
          for (const entry of await readSoundFiles(files)) addSound(entry.name, [entry.file]);
        }}
        accept={ACCEPT}
        title="OGG-Dateien hier ablegen"
        subtitle="Jede Datei wird ein eigener Sound. Weitere Varianten (zufällig abgespielt) fügst du im Sound hinzu."
        formats={['.ogg']}
        compact
      />
      <div style={{ marginTop: 16 }}>
        {sounds.map((sound) => (
          <SoundCard key={sound.id} sound={sound} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function SoundCard({ sound, plan }: { sound: Sound; plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const update = (fn: (s: Sound) => void, key?: string) => updateSound(sound.id, fn, key);
  const issues = plan?.issues.filter((i) => i.soundId === sound.id) ?? [];
  const key = soundKey(project, sound);
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="row">
            <h3 className="mono">{sound.soundId}</h3>
            {sound.jukebox && <span className="badge accent">Jukebox Song</span>}
          </div>
        </div>
        <span className="mono small faint">{key}</span>
        <CopyButton text={key} label="ID kopieren" />
        <button className="btn ghost icon small danger" title="Sound löschen" onClick={() => deleteSound(sound.id)}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="card-body col" style={{ gap: 14 }}>
        <div className="field-grid">
          <label className="field">
            <span className="field-label" title="Name des Sounds">ID</span>
            <input
              className="input mono"
              value={sound.soundId}
              onChange={(e) => update((s) => (s.soundId = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_')), 'id')}
            />
          </label>
          <label className="field">
            <span className="field-label" title="Lautstärke, Standard 1">Volume</span>
            <NumberInput value={sound.volume} min={0} onChange={(v) => update((s) => (s.volume = v ?? null), 'volume')} />
          </label>
          <label className="field">
            <span className="field-label" title="Tonhöhe, Standard 1">Pitch</span>
            <NumberInput value={sound.pitch} min={0} onChange={(v) => update((s) => (s.pitch = v ?? null), 'pitch')} />
          </label>
          <label className="field">
            <span className="field-label" title="Reichweite in Blöcken, Standard 16">Attenuation Distance</span>
            <NumberInput value={sound.distance} integer min={1} onChange={(v) => update((s) => (s.distance = v ?? null), 'distance')} />
          </label>
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="field-label">Sounds {sound.files.length > 1 && <span className="faint">(eine Datei wird zufällig abgespielt)</span>}</span>
          {sound.files.map((file, i) => (
            <div key={i} className="sound-file">
              <audio controls preload="none" src={file.dataUrl} />
              <span className="mono small grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                {soundFilePath(sound, i)}.ogg
              </span>
              <span className="faint small">{formatSize(file.size)}</span>
              <button
                className="btn ghost icon small danger"
                title="Datei entfernen"
                onClick={() => update((s) => (s.files = s.files.filter((_, j) => j !== i)))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div>
            <button
              className="btn small"
              onClick={async () => {
                const entries = await readSoundFiles(await pickFiles(ACCEPT));
                if (entries.length) update((s) => (s.files = [...s.files, ...entries.map((e) => e.file)]));
              }}
            >
              <Plus size={14} /> Datei hinzufügen
            </button>
          </div>
        </div>

        <div className="row wrap" style={{ gap: 18 }}>
          <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" className="check" checked={sound.stream} onChange={(e) => update((s) => (s.stream = e.target.checked))} />
            Stream <span className="faint">(für lange Musik)</span>
          </label>
          <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="check"
              checked={!!sound.jukebox}
              onChange={(e) =>
                update((s) => {
                  s.jukebox = e.target.checked ? { duration: '', description: '', comparatorOutput: null, range: null } : null;
                  if (e.target.checked) s.stream = true;
                })
              }
            />
            Jukebox Playable <span className="faint">(als Musik-CD registrieren)</span>
          </label>
        </div>

        {sound.jukebox && (
          <div className="subsection" style={{ padding: 12 }}>
            <div className="field-grid">
              <label className="field">
                <span className="field-label" title="Länge des Liedes">Duration</span>
                <input
                  className={`input mono ${sound.jukebox.duration.trim() ? '' : 'invalid'}`}
                  value={sound.jukebox.duration}
                  placeholder="z.B. 2m 30s"
                  onChange={(e) => update((s) => (s.jukebox!.duration = e.target.value), 'duration')}
                />
              </label>
              <label className="field wide">
                <span className="field-label" title="MiniMessage, z.B. Interpret – Titel">Description</span>
                <input
                  className="input"
                  value={sound.jukebox.description}
                  onChange={(e) => update((s) => (s.jukebox!.description = e.target.value), 'description')}
                />
              </label>
              <label className="field">
                <span className="field-label" title="Komparator-Signal 0–15">Comparator Output</span>
                <NumberInput
                  value={sound.jukebox.comparatorOutput}
                  integer
                  min={0}
                  max={15}
                  onChange={(v) => update((s) => (s.jukebox!.comparatorOutput = v ?? null), 'comparator')}
                />
              </label>
              <label className="field">
                <span className="field-label" title="Hörweite in Blöcken (optional)">Range</span>
                <NumberInput value={sound.jukebox.range} integer min={1} onChange={(v) => update((s) => (s.jukebox!.range = v ?? null), 'range')} />
              </label>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="btn small"
                onClick={() => {
                  const id = addMusicDiscItem(sound);
                  if (id) useStore.getState().toast('success', 'Musik-CD-Item angelegt – Modell oder Textur kannst du noch hinzufügen.');
                }}
              >
                <Disc3 size={14} /> Musik-CD-Item anlegen
              </button>
              <span className="faint small">Ein neues Item mit der Component „Jukebox Playable“ für diesen Song.</span>
            </div>
          </div>
        )}
        <IssueList issues={issues} />
      </div>
    </div>
  );
}
