import { useState } from 'react';
import { Box, ImageUp, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { ImportedModel, Item, ModelTexture } from '@resourcepackbuilder/core/types';
import { createTexture, getAnimation, getFrameSize } from '@resourcepackbuilder/core/model/textures';
import { parseTexturePlaceholder, texturePlaceholder } from '@resourcepackbuilder/core/model/common';
import { compareVersions, readPngInfoFromDataUrl } from '@resourcepackbuilder/core/util';
import { getMcVersion } from '@resourcepackbuilder/core/minecraft/versions';
import { issuesForItem, type ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { updateItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '@resourcepackbuilder/ui';
import { IssueList } from '@resourcepackbuilder/ui';
import { NumberInput } from '@resourcepackbuilder/ui';
import { pickFiles, readAsDataUrl, readDroppedFiles } from '@resourcepackbuilder/ui';
import { createDrafts } from '../importer';
import { ModelPreview } from '@resourcepackbuilder/preview';
import { PropertiesPanel } from './PropertiesPanel';
import { VariantsSection } from './VariantsSection';
import { BlockModelsSection, FurnitureModelsSection } from './ModelSlots';

const ITEM_PARENTS = [
  { value: 'minecraft:item/generated', label: '2D-Item (item/generated)' },
  { value: 'minecraft:item/handheld', label: '2D-Werkzeug/Waffe (item/handheld)' },
  { value: 'minecraft:item/handheld_rod', label: '2D-Stab/Angel (item/handheld_rod)' },
];

const SOURCE_LABEL: Record<ImportedModel['source'], string> = {
  bbmodel: 'Blockbench (.bbmodel)',
  json: 'Java-Modell (.json)',
  png: 'Aus Textur erzeugt',
};

async function importModelFiles(files: File[]): Promise<ImportedModel | null> {
  const toast = useStore.getState().toast;
  const read = await readDroppedFiles(files);
  const drafts = createDrafts(read, 'combined');
  if (drafts.length === 0) {
    toast('error', 'Keine passende Datei gefunden. Erlaubt sind .bbmodel, .json (+ PNG) und .png.');
    return null;
  }
  const draft = drafts[0];
  if (draft.error || !draft.model) {
    toast('error', draft.error ?? 'Das Modell konnte nicht gelesen werden.');
    return null;
  }
  if (drafts.length > 1) toast('warning', 'Es wurde nur das erste Modell übernommen.');
  return draft.model;
}

export function ModelTab({ item, plan }: { item: Item; plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const model = item.model;
  const issues = plan ? issuesForItem(plan.issues, item.id) : [];

  const setModel = (next: ImportedModel | null) => updateItem(item.id, (d) => (d.model = next));

  if (!model) {
    return (
      <div>
        <div className="card">
          <div className="card-header">
            <Box size={18} />
            <div className="card-title-group">
              <h3>Kein Modell</h3>
              <div className="desc">Ohne Modell sieht das Item wie das Basis-Material ({String(item.config.material ?? 'PAPER')}) aus.</div>
            </div>
          </div>
          <div className="card-body">
            <DropZone
              onFiles={async (files) => {
                const m = await importModelFiles(files);
                if (m) setModel(m);
              }}
              accept=".bbmodel,.json,.png,.mcmeta"
              title="Modell hier ablegen"
              subtitle="Blockbench-Projekt (.bbmodel), Java-Modell (.json) mit PNG-Texturen oder PNG-Texturen"
              formats={['.bbmodel', '.json + .png', '.png']}
            />
          </div>
        </div>
        <PropertiesPanel item={item} groups={['appearance']} title="Pack & Appearance" emptyText="Noch keine Pack-Optionen (z.B. CustomArmor, Color)." />
      </div>
    );
  }

  const elementCount = model.json.elements?.length ?? 0;
  const requiresTooHigh = model.requiresVersion && compareVersions(model.requiresVersion, project.settings.minecraftVersion) > 0;
  const placeholderIds = new Set(Object.values(model.json.textures ?? {}).map(parseTexturePlaceholder).filter(Boolean));
  const otherRefs = Object.entries(model.json.textures ?? {}).filter(([, v]) => typeof v === 'string' && !v.startsWith('#') && !parseTexturePlaceholder(v));
  const parent = typeof model.json.parent === 'string' ? model.json.parent : '';
  const canSwitchParent = !model.json.elements && ITEM_PARENTS.some((p) => p.value === parent || p.value === `minecraft:${parent}`);

  const updateModel = (recipe: (m: ImportedModel) => void) =>
    updateItem(item.id, (d) => {
      if (d.model) recipe(d.model);
    });

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <Box size={18} />
          <div className="card-title-group">
            <h3>{model.fileName}</h3>
            <div className="desc">
              {SOURCE_LABEL[model.source]}
              {elementCount > 0 && ` · ${elementCount} Würfel`} · {model.textures.length} Textur(en)
              {parent && ` · Parent: ${parent}`}
            </div>
          </div>
          <button
            className="btn small"
            onClick={async () => {
              const files = await pickFiles('.bbmodel,.json,.png,.mcmeta');
              if (!files.length) return;
              const m = await importModelFiles(files);
              if (m) setModel(m);
            }}
          >
            <RefreshCw size={14} /> Ersetzen
          </button>
          <button
            className="btn small danger"
            onClick={() =>
              useStore.getState().openDialog({
                type: 'confirm',
                title: 'Modell entfernen?',
                message: 'Das Modell und seine Texturen werden aus dem Item entfernt.',
                confirmLabel: 'Entfernen',
                danger: true,
                onConfirm: () => setModel(null),
              })
            }
          >
            <Trash2 size={14} /> Entfernen
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 16 }}>
            <ModelPreview model={model} height={360} />
            <div className="col" style={{ gap: 10 }}>
              {model.requiresVersion && (
                <div className={`hint ${requiresTooHigh ? 'warning' : ''}`}>
                  Dieses Modell benötigt mindestens Minecraft {model.requiresVersion}
                  {requiresTooHigh ? ` – dein Projekt ist auf ${getMcVersion(project.settings.minecraftVersion).label} eingestellt.` : '.'}
                </div>
              )}
              {canSwitchParent && (
                <label className="field">
                  <span className="field-label">Darstellung</span>
                  <select
                    className="select"
                    value={parent.startsWith('minecraft:') ? parent : `minecraft:${parent}`}
                    onChange={(e) => updateModel((m) => (m.json.parent = e.target.value))}
                  >
                    {ITEM_PARENTS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <ShadingOptions model={model} onChange={updateModel} />
              <div>
                <div className="field-label" style={{ marginBottom: 6 }}>
                  Prüfung
                </div>
                <IssueList issues={issues.filter((i) => !i.message.includes('Kein Modell'))} empty="Keine Probleme gefunden." hideInfo={false} />
              </div>
              {model.issues.length > 0 && (
                <details className="subsection">
                  <summary>Hinweise vom Import ({model.issues.length})</summary>
                  <div className="subsection-body">
                    <IssueList issues={model.issues} />
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">Texturen</div>
      <div className="texture-grid" style={{ marginBottom: 14 }}>
        {model.textures.map((tex) => (
          <TextureCard
            key={tex.id}
            texture={tex}
            used={placeholderIds.has(tex.id)}
            onChange={(next) =>
              updateModel((m) => {
                const index = m.textures.findIndex((t) => t.id === tex.id);
                if (index >= 0) m.textures[index] = next;
              })
            }
          />
        ))}
        {otherRefs.map(([key, ref]) => (
          <VanillaRefCard
            key={key}
            textureKey={key}
            reference={ref}
            onAssign={async (file) => {
              const dataUrl = await readAsDataUrl(file);
              if (!readPngInfoFromDataUrl(dataUrl)) {
                useStore.getState().toast('error', 'Die Datei ist kein gültiges PNG.');
                return;
              }
              updateModel((m) => {
                const id = `t${Date.now().toString(36)}`;
                m.textures.push(createTexture(id, file.name, dataUrl));
                for (const [k, v] of Object.entries(m.json.textures ?? {})) {
                  if (v === ref) m.json.textures![k] = texturePlaceholder(id);
                }
              });
            }}
          />
        ))}
      </div>

      <VariantsSection item={item} />
      <FurnitureModelsSection item={item} />
      <BlockModelsSection item={item} />

      <PropertiesPanel item={item} groups={['appearance']} title="Pack & Appearance" emptyText="Noch keine Pack-Optionen (z.B. CustomArmor, Color)." />
    </div>
  );
}

/** ambientocclusion (whole model) and shade (per cube) – like in Blockbench */
function ShadingOptions({ model, onChange }: { model: ImportedModel; onChange: (recipe: (m: ImportedModel) => void) => void }) {
  const elements = model.json.elements ?? [];
  const unshaded = elements.filter((el) => el.shade === false).length;
  const shadeState = unshaded === 0 ? 'all' : unshaded === elements.length ? 'none' : 'some';
  const usesOverride = elements.some((el) => el.shade_direction_override !== undefined);
  return (
    <div className="col" style={{ gap: 4 }}>
      <label className="toggle-row">
        <input
          type="checkbox"
          className="check"
          checked={model.json.ambientocclusion !== false}
          onChange={(e) =>
            onChange((m) => {
              if (e.target.checked) delete m.json.ambientocclusion;
              else m.json.ambientocclusion = false;
            })
          }
        />
        <span>
          Ambient Occlusion
          <div className="tr-desc">Weiche Schatten in Ecken und Kanten (ambientocclusion). Aus für flache oder leuchtende Modelle.</div>
        </span>
      </label>
      {elements.length > 0 && (
        <label className="toggle-row">
          <input
            type="checkbox"
            className="check"
            ref={(el) => {
              if (el) el.indeterminate = shadeState === 'some';
            }}
            checked={shadeState === 'all'}
            disabled={usesOverride}
            onChange={() =>
              onChange((m) => {
                const on = shadeState !== 'all';
                for (const el of m.json.elements ?? []) {
                  if (on) delete el.shade;
                  else el.shade = false;
                }
              })
            }
          />
          <span>
            Shade
            <div className="tr-desc">
              {usesOverride
                ? 'Das Modell nutzt shade_direction_override (aus Blockbench) – bitte dort ändern.'
                : shadeState === 'some'
                  ? `Richtungs-Schattierung der Würfel (shade) – bei ${unshaded} von ${elements.length} Würfeln aus.`
                  : 'Richtungs-Schattierung der Würfel (shade). Aus = alle Seiten gleich hell.'}
            </div>
          </span>
        </label>
      )}
    </div>
  );
}

function TextureCard({ texture, used, onChange }: { texture: ModelTexture; used: boolean; onChange: (t: ModelTexture) => void }) {
  const [editingName, setEditingName] = useState(false);
  const animation = getAnimation(texture);
  const frame = getFrameSize(texture);
  const replace = async () => {
    const [file] = await pickFiles('.png,image/png', false);
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    const info = readPngInfoFromDataUrl(dataUrl);
    if (!info) {
      useStore.getState().toast('error', 'Die Datei ist kein gültiges PNG.');
      return;
    }
    onChange({ ...texture, dataUrl, width: info.width, height: info.height });
  };
  return (
    <div className={`texture-card ${texture.dataUrl ? '' : 'missing'}`}>
      <div className="texture-thumb">
        {texture.dataUrl ? <img src={texture.dataUrl} alt={texture.name} /> : <ImageUp size={22} className="faint" />}
      </div>
      <div className="texture-info">
        {editingName ? (
          <input
            className="input"
            autoFocus
            defaultValue={texture.name}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name) onChange({ ...texture, name });
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <div className="row" style={{ gap: 4 }}>
            <strong className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {texture.name}.png
            </strong>
            <button className="btn ghost icon small" title="Umbenennen" onClick={() => setEditingName(true)}>
              <Pencil size={12} />
            </button>
          </div>
        )}
        <span className="faint small">
          {texture.dataUrl ? `${texture.width}×${texture.height} px` : 'Fehlt – bitte PNG zuweisen'}
          {animation && ` · ${frame.count} Frames`}
          {!used && ' · nur Partikel'}
        </span>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn small" onClick={() => void replace()}>
            <ImageUp size={13} /> {texture.dataUrl ? 'Ersetzen' : 'PNG zuweisen'}
          </button>
          <label className="row small" style={{ gap: 5, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!animation}
              onChange={(e) =>
                onChange({
                  ...texture,
                  mcmeta: e.target.checked ? { ...(texture.mcmeta ?? {}), animation: { frametime: 2 } } : null,
                })
              }
            />
            Animiert
          </label>
        </div>
        {animation && (
          <div className="row" style={{ gap: 6 }}>
            <span className="small faint">Ticks/Frame</span>
            <div style={{ width: 70 }}>
              <NumberInput
                value={animation.frametime}
                integer
                min={1}
                onChange={(v) =>
                  onChange({
                    ...texture,
                    mcmeta: { ...(texture.mcmeta ?? {}), animation: { ...(texture.mcmeta?.animation as object), frametime: v ?? 1 } },
                  })
                }
              />
            </div>
            <label className="row small" style={{ gap: 5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!animation.interpolate}
                onChange={(e) => {
                  const anim = { ...(texture.mcmeta?.animation as Record<string, unknown>) };
                  if (e.target.checked) anim.interpolate = true;
                  else delete anim.interpolate;
                  onChange({ ...texture, mcmeta: { ...(texture.mcmeta ?? {}), animation: anim } });
                }}
              />
              Weich
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function VanillaRefCard({ textureKey, reference, onAssign }: { textureKey: string; reference: string; onAssign: (file: File) => void }) {
  const vanilla = !reference.includes(':') || reference.startsWith('minecraft:');
  return (
    <div className={`texture-card ${vanilla ? '' : 'missing'}`}>
      <div className="texture-thumb">
        <ImageUp size={22} className="faint" />
      </div>
      <div className="texture-info">
        <strong className="small mono">#{textureKey}</strong>
        <span className="faint small" style={{ wordBreak: 'break-all' }}>
          {reference}
          {vanilla ? ' (Minecraft-Textur)' : ' (nicht im Pack!)'}
        </span>
        <button
          className="btn small"
          style={{ alignSelf: 'flex-start' }}
          onClick={async () => {
            const [file] = await pickFiles('.png,image/png', false);
            if (file) onAssign(file);
          }}
        >
          <ImageUp size={13} /> Eigene PNG zuweisen
        </button>
      </div>
    </div>
  );
}
