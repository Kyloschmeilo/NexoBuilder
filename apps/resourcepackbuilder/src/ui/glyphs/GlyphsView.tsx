import { Link2, RefreshCw, Smile, Trash2 } from 'lucide-react';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { glyphFileFromDataUrl, glyphFilePath, type Glyph } from '@resourcepackbuilder/core/nexo/glyphs';
import { addGlyph, deleteGlyph, updateGlyph } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '@resourcepackbuilder/ui';
import { IssueList } from '@resourcepackbuilder/ui';
import { CopyButton } from '@resourcepackbuilder/ui';
import { NumberInput, TextInput } from '@resourcepackbuilder/ui';
import { pickFiles, readAsDataUrl } from '@resourcepackbuilder/ui';

async function readGlyphFiles(files: File[]) {
  const toast = useStore.getState().toast;
  const result: Array<{ name: string; file: NonNullable<ReturnType<typeof glyphFileFromDataUrl>>; gif: boolean }> = [];
  for (const f of files) {
    const dataUrl = await readAsDataUrl(f);
    const file = glyphFileFromDataUrl(f.name, dataUrl.replace(/^data:application\/octet-stream/, f.name.toLowerCase().endsWith('.gif') ? 'data:image/gif' : 'data:image/png'));
    if (!file) {
      toast('error', `„${f.name}“ ist kein PNG oder GIF.`);
      continue;
    }
    result.push({ name: f.name.replace(/\.[^.]+$/, ''), file, gif: file.dataUrl.startsWith('data:image/gif') });
  }
  return result;
}

export function GlyphsView({ plan }: { plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const glyphs = project.glyphs ?? [];

  return (
    <div className="editor">
      <div className="editor-header">
        <div className="editor-thumb">
          <Smile size={30} />
        </div>
        <div className="editor-title">
          <h1>Glyphs</h1>
          <div className="editor-meta">
            <span className="badge">{glyphs.length} Glyph(s)</span>
            <span className="badge mono">plugins/Nexo/{glyphFilePath(project)}</span>
          </div>
        </div>
        <button
          className="btn"
          onClick={() => {
            addGlyph('referenz', null, 'reference');
          }}
          title="Verweist auf ein Feld eines Multi-Bitmap-Glyphs"
        >
          <Link2 size={15} /> Reference Glyph
        </button>
      </div>
      <div className="hint">
        Glyphs sind eigene Zeichen für Chat, Lore, Item-Namen, Titel und GUIs. Verwendung überall mit{' '}
        <code className="code-inline">&lt;glyph:id&gt;</code>, z.B. in der Lore eines Items.
      </div>
      <DropZone
        onFiles={async (files) => {
          for (const entry of await readGlyphFiles(files)) addGlyph(entry.name, entry.file, entry.gif ? 'gif' : 'image');
        }}
        accept=".png,.gif,image/png,image/gif"
        title="PNG- oder GIF-Dateien hier ablegen"
        subtitle="Jede Datei wird ein eigener Glyph – z.B. Emojis (8×8) oder GUI-Hintergründe (bis 256×256)"
        formats={['.png', '.gif']}
        compact
      />
      <div style={{ marginTop: 16 }}>
        {glyphs.map((glyph) => (
          <GlyphCard key={glyph.id} glyph={glyph} glyphs={glyphs} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function GlyphCard({ glyph, glyphs, plan }: { glyph: Glyph; glyphs: Glyph[]; plan: ExportPlan | null }) {
  const update = (fn: (g: Glyph) => void, key?: string) => updateGlyph(glyph.id, fn, key);
  const issues = plan?.issues.filter((i) => i.glyphId === glyph.id) ?? [];
  const multi = glyph.kind === 'image' && glyph.rows * glyph.columns > 1;
  const usage = multi ? `<glyph:${glyph.glyphId}:1>` : `<glyph:${glyph.glyphId}>`;
  const kindLabel = { image: 'Image', gif: 'Animated (GIF)', reference: 'Reference' }[glyph.kind];
  const multiBitmaps = glyphs.filter((g) => g.kind === 'image' && g.rows * g.columns > 1 && g.id !== glyph.id);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="row">
            <h3 className="mono">{glyph.glyphId}</h3>
            <span className="badge">{kindLabel}</span>
            {glyph.file && (
              <span className="badge">
                {glyph.file.width}×{glyph.file.height} px
              </span>
            )}
          </div>
        </div>
        <span className="mono small faint">{usage}</span>
        <CopyButton text={usage} label="Tag kopieren" />
        {glyph.kind !== 'reference' && (
          <button
            className="btn ghost icon small"
            title="Bild ersetzen"
            onClick={async () => {
              const files = await pickFiles('.png,.gif,image/png,image/gif', false);
              const [entry] = await readGlyphFiles(files);
              if (entry) update((g) => ((g.file = entry.file), (g.kind = entry.gif ? 'gif' : 'image')));
            }}
          >
            <RefreshCw size={14} />
          </button>
        )}
        <button className="btn ghost icon small danger" title="Glyph löschen" onClick={() => deleteGlyph(glyph.id)}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: glyph.kind === 'reference' ? '1fr' : '170px minmax(0, 1fr)', gap: 16 }}>
          {glyph.kind !== 'reference' && (
            <div className="col" style={{ gap: 8 }}>
              <div className="texture-thumb" style={{ width: 170, height: 130 }}>
                {glyph.file && (
                  <img
                    src={glyph.file.dataUrl}
                    alt=""
                    style={{
                      width: glyph.file.width >= glyph.file.height ? 150 : undefined,
                      height: glyph.file.height > glyph.file.width ? 110 : undefined,
                      maxWidth: 150,
                      maxHeight: 110,
                    }}
                  />
                )}
              </div>
              {glyph.file && <ChatPreview glyph={glyph} />}
            </div>
          )}
          <div className="col" style={{ gap: 12 }}>
            <div className="field-grid">
              <label className="field">
                <span className="field-label">ID</span>
                <input
                  className="input mono"
                  value={glyph.glyphId}
                  onChange={(e) => update((g) => (g.glyphId = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')), 'id')}
                />
              </label>
              {glyph.kind === 'reference' ? (
                <>
                  <label className="field">
                    <span className="field-label" title="Verweist auf einen Multi-Bitmap-Glyph">Reference</span>
                    <TextInput
                      value={glyph.reference}
                      mono
                      suggestions={multiBitmaps.map((g) => ({ value: g.glyphId }))}
                      onChange={(v) => update((g) => (g.reference = v ?? ''), 'reference')}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label" title="Feld-Nummer, ab 1">Index</span>
                    <NumberInput value={glyph.index} integer min={1} onChange={(v) => update((g) => (g.index = v ?? 1), 'index')} />
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    <span className="field-label" title="Höhe (Skalierung)">Height</span>
                    <NumberInput value={glyph.height} integer min={1} onChange={(v) => update((g) => (g.height = v ?? 8), 'height')} />
                  </label>
                  <label className="field">
                    <span className="field-label" title="Verschiebung nach oben">Ascent</span>
                    <NumberInput value={glyph.ascent} integer onChange={(v) => update((g) => (g.ascent = v ?? 0), 'ascent')} />
                  </label>
                </>
              )}
              {glyph.kind === 'image' && (
                <>
                  <label className="field">
                    <span className="field-label" title="Zeilen (Multi-Bitmap)">Rows</span>
                    <NumberInput value={glyph.rows} integer min={1} onChange={(v) => update((g) => (g.rows = v ?? 1), 'rows')} />
                  </label>
                  <label className="field">
                    <span className="field-label" title="Spalten (Multi-Bitmap)">Columns</span>
                    <NumberInput value={glyph.columns} integer min={1} onChange={(v) => update((g) => (g.columns = v ?? 1), 'columns')} />
                  </label>
                  <label className="field">
                    <span className="field-label" title="Schriftart (optional)">Font</span>
                    <TextInput
                      value={glyph.font}
                      mono
                      placeholder="Standard aus settings.yml"
                      suggestions={[{ value: 'minecraft:default' }]}
                      onChange={(v) => update((g) => (g.font = v ?? ''), 'font')}
                    />
                  </label>
                </>
              )}
              {glyph.kind === 'gif' && (
                <>
                  <label className="field">
                    <span className="field-label" title="Max. Bilder (optional)">Frame Count</span>
                    <NumberInput value={glyph.frameCount} integer min={1} onChange={(v) => update((g) => (g.frameCount = v ?? null), 'frames')} />
                  </label>
                  <label className="field">
                    <span className="field-label" title="optional">Offset</span>
                    <NumberInput value={glyph.offset} integer onChange={(v) => update((g) => (g.offset = v ?? null), 'offset')} />
                  </label>
                </>
              )}
              <label className="field">
                <span className="field-label" title="optional">Permission</span>
                <input
                  className="input mono"
                  value={glyph.permission}
                  placeholder="Standard aus settings.yml"
                  onChange={(e) => update((g) => (g.permission = e.target.value), 'permission')}
                />
              </label>
              <label className="field">
                <span className="field-label" title="Chat-Kürzel, durch Komma getrennt">Placeholders</span>
                <input
                  className="input mono"
                  value={glyph.placeholders.join(', ')}
                  placeholder="z.B. <3, :herz:"
                  onChange={(e) => update((g) => (g.placeholders = e.target.value.split(',').map((p) => p.trim())), 'placeholders')}
                />
              </label>
            </div>
            <div className="row wrap" style={{ gap: 18 }}>
              <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={glyph.isEmoji} onChange={(e) => update((g) => (g.isEmoji = e.target.checked))} />
                Is Emoji <span className="faint">(in /nexo emojis)</span>
              </label>
              <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={glyph.tabcomplete} onChange={(e) => update((g) => (g.tabcomplete = e.target.checked))} />
                Tab Complete <span className="faint">(im Chat)</span>
              </label>
            </div>
            {glyph.kind !== 'reference' && (
              <div className="field-help">
                Höhe = Größe im Spiel (Chat-Text ist 8 hoch). Ascent schiebt den Glyph nach oben und darf nicht größer als die Höhe sein.
                Bilder über 256×256 in Zeilen/Spalten aufteilen.
              </div>
            )}
            {issues.length > 0 && <IssueList issues={issues} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Approximate preview in chat (2 screen pixels per Minecraft pixel). */
function ChatPreview({ glyph }: { glyph: Glyph }) {
  if (!glyph.file) return null;
  const scale = 2;
  const cellH = glyph.file.height / Math.max(1, glyph.rows);
  const cellW = glyph.file.width / Math.max(1, glyph.columns);
  const h = glyph.height * scale;
  const w = (cellW / cellH) * h;
  // Default font: ascent 7 – deviations shift the glyph up/down
  const offset = (7 - glyph.ascent) * scale;
  if (h > 120) return <span className="faint small">Großer Glyph (z.B. GUI) – keine Chat-Vorschau.</span>;
  return (
    <div className="mc-text" style={{ fontSize: 16, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: '18px' }}>
      <span>Hallo</span>
      <span
        style={{
          display: 'inline-block',
          width: w,
          height: h,
          marginTop: offset,
          backgroundImage: `url(${glyph.file.dataUrl})`,
          backgroundSize: `${glyph.columns * 100}% ${glyph.rows * 100}%`,
          backgroundPosition: '0 0',
          imageRendering: 'pixelated',
        }}
      />
      <span>Welt</span>
    </div>
  );
}
