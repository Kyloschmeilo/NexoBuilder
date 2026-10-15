/** Custom paintings (plugins/Nexo/paintings.yml + texture in the resource pack). */
import { Frame, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { paintingFrameSize, paintingKey, type Painting, type PaintingFile } from '@resourcepackbuilder/core/nexo/paintings';
import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/util';
import { addPainting, addPaintingItem, deletePainting, updatePainting } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '@resourcepackbuilder/ui';
import { IssueList } from '@resourcepackbuilder/ui';
import { CopyButton } from '@resourcepackbuilder/ui';
import { NumberInput } from '@resourcepackbuilder/ui';
import { pickFiles, readAsDataUrl } from '@resourcepackbuilder/ui';

const ACCEPT = '.png,image/png';

async function readPaintingFiles(files: File[]): Promise<Array<{ name: string; file: PaintingFile }>> {
  const result: Array<{ name: string; file: PaintingFile }> = [];
  for (const f of files) {
    const dataUrl = (await readAsDataUrl(f)).replace(/^data:[^;,]*/, 'data:image/png');
    const info = readPngInfoFromDataUrl(dataUrl);
    if (!info) {
      useStore.getState().toast('error', `„${f.name}“ ist kein PNG.`);
      continue;
    }
    result.push({ name: f.name.replace(/\.[^.]+$/, ''), file: { name: f.name, dataUrl, width: info.width, height: info.height } });
  }
  return result;
}

export function PaintingsView({ plan }: { plan: ExportPlan | null }) {
  const paintings = useStore((s) => s.project?.paintings ?? []);
  return (
    <div className="editor">
      <div className="editor-header">
        <div className="editor-thumb">
          <Frame size={30} />
        </div>
        <div className="editor-title">
          <h1>Paintings</h1>
          <div className="editor-meta">
            <span className="badge">{paintings.length} Painting(s)</span>
            <span className="badge mono">plugins/Nexo/paintings.yml</span>
          </div>
        </div>
      </div>
      <div className="hint">
        Eigene Bilder zum Aufhängen (ab Minecraft 1.21.5 erzeugt Nexo das nötige Datapack). Neue Gemälde werden erst nach einem Server-Neustart
        registriert – im Testserver also „Neu starten“. Die exportierte <code className="code-inline">paintings.yml</code> ersetzt eine vorhandene
        Datei auf dem Server.
      </div>
      <DropZone
        onFiles={async (files) => {
          for (const entry of await readPaintingFiles(files)) addPainting(entry.name, entry.file);
        }}
        accept={ACCEPT}
        title="Bilder (PNG) hier ablegen"
        subtitle="16 Pixel pro Block, z.B. 32×16 für ein Gemälde mit 2×1 Blöcken. Für Animationen die Bilder untereinander anordnen."
        formats={['.png']}
        compact
      />
      <div style={{ marginTop: 16 }}>
        {paintings.map((painting) => (
          <PaintingCard key={painting.id} painting={painting} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function PaintingCard({ painting, plan }: { painting: Painting; plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const update = (fn: (p: Painting) => void, key?: string) => updatePainting(painting.id, fn, key);
  const issues = plan?.issues.filter((i) => i.paintingId === painting.id) ?? [];
  const key = paintingKey(project, painting);
  const frame = paintingFrameSize(painting);
  const aspect = painting.width / painting.height;
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="row">
            <h3 className="mono">{painting.paintingId}</h3>
            <span className="badge">
              {painting.width}×{painting.height} Blocks
            </span>
            {painting.animated && <span className="badge accent">Animated</span>}
          </div>
        </div>
        <span className="mono small faint">{key}</span>
        <CopyButton text={key} label="ID kopieren" />
        <button
          className="btn ghost icon small"
          title="Bild ersetzen"
          onClick={async () => {
            const [entry] = await readPaintingFiles(await pickFiles(ACCEPT, false));
            if (entry) update((p) => (p.file = entry.file));
          }}
        >
          <RefreshCw size={14} />
        </button>
        <button className="btn ghost icon small danger" title="Gemälde löschen" onClick={() => deletePainting(painting.id)}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: '190px minmax(0, 1fr)', gap: 16 }}>
          <div className="col" style={{ gap: 8 }}>
            <div className="painting-preview">
              {painting.file && (
                <div
                  className="painting-canvas"
                  style={{
                    aspectRatio: String(aspect),
                    width: aspect >= 1 ? 170 : undefined,
                    height: aspect < 1 ? 150 : undefined,
                    backgroundImage: `url(${painting.file.dataUrl})`,
                    backgroundSize: painting.animated && frame && frame.frames > 1 ? `100% ${frame.frames * 100}%` : '100% 100%',
                  }}
                />
              )}
            </div>
            {painting.file && (
              <span className="faint small">
                {painting.file.width}×{painting.file.height} px{frame && painting.animated ? ` · ${frame.frames} Bilder` : ''}
              </span>
            )}
          </div>
          <div className="col" style={{ gap: 12 }}>
            <div className="field-grid">
              <label className="field">
                <span className="field-label">ID</span>
                <input
                  className="input mono"
                  value={painting.paintingId}
                  onChange={(e) => update((p) => (p.paintingId = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')), 'id')}
                />
              </label>
              <label className="field">
                <span className="field-label" title="Titel (MiniMessage)">Title</span>
                <input className="input" value={painting.title} onChange={(e) => update((p) => (p.title = e.target.value), 'title')} />
              </label>
              <label className="field">
                <span className="field-label" title="Künstler">Author</span>
                <input className="input" value={painting.author} onChange={(e) => update((p) => (p.author = e.target.value), 'author')} />
              </label>
              <label className="field">
                <span className="field-label" title="Breite in Blöcken">Width</span>
                <NumberInput value={painting.width} integer min={1} max={16} onChange={(v) => update((p) => (p.width = v ?? 1), 'width')} />
              </label>
              <label className="field">
                <span className="field-label" title="Höhe in Blöcken">Height</span>
                <NumberInput value={painting.height} integer min={1} max={16} onChange={(v) => update((p) => (p.height = v ?? 1), 'height')} />
              </label>
              {painting.animated && (
                <label className="field">
                  <span className="field-label" title="Ticks pro Bild">Frametime</span>
                  <NumberInput value={painting.frametime} integer min={1} onChange={(v) => update((p) => (p.frametime = v ?? 2), 'frametime')} />
                </label>
              )}
            </div>
            <div className="row wrap" style={{ gap: 18 }}>
              <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" className="check" checked={painting.randomPlace} onChange={(e) => update((p) => (p.randomPlace = e.target.checked))} />
                Random Place <span className="faint">(auch zufällig beim Aufhängen normaler Gemälde)</span>
              </label>
              <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" className="check" checked={painting.animated} onChange={(e) => update((p) => (p.animated = e.target.checked))} />
                Animated <span className="faint">(Bilder untereinander)</span>
              </label>
            </div>
            <div className="row">
              <button
                className="btn small"
                onClick={() => {
                  if (addPaintingItem(painting)) useStore.getState().toast('success', 'Gemälde-Item angelegt.');
                }}
              >
                <ImagePlus size={14} /> Item zum Aufhängen anlegen
              </button>
              <span className="faint small">Ein Item mit Material PAINTING, das genau dieses Gemälde aufhängt.</span>
            </div>
            <IssueList issues={issues} />
          </div>
        </div>
      </div>
    </div>
  );
}
