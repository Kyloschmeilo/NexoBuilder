import { useEffect, useMemo, useState } from 'react';
import { Box, FilePlus2, Image as ImageIcon, PackagePlus, Trash2 } from 'lucide-react';
import type { DroppedFile } from '../../core/model/textures';
import { MAX_ITEM_LAYERS, TEXTURE_TEMPLATES, getTextureTemplate, suggestSlotAssignment } from '../../core/model/textureModel';
import { MATERIALS } from '../../core/nexo/options';
import { ITEM_ID_PATTERN, slugify } from '../../core/util';
import { getFolderPathLabel } from '../../core/project/tree';
import { addItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '../common/DropZone';
import { IssueList } from '../common/IssueList';
import { stripMiniMessage } from '../common/MiniMessage';
import { Modal } from '../common/Modal';
import { readDroppedFiles } from '../files';
import { createDrafts, isPng, runDraft, unsupportedFiles, type ImportDraft } from '../importer';
import { TextInput } from '../form/inputs';
import { ModelPreview } from '../preview/ModelPreview';
import { FolderSelect } from './FolderSelect';

interface DraftMeta {
  displayName: string;
  nexoId: string;
  idEdited: boolean;
  material: string;
}

const ACCEPT = '.bbmodel,.json,.png,.mcmeta';

/** Stabiler Schlüssel eines Entwurfs (Hauptdatei), damit Eingaben beim Neuaufbau erhalten bleiben. */
function sourceKey(draft: ImportDraft): string {
  return `${draft.kind}:${draft.files[0]?.name ?? draft.key}`;
}

export function NewItemDialog({ folderId, initialFiles }: { folderId: string; initialFiles?: File[] }) {
  const project = useStore((s) => s.project)!;
  const close = useStore((s) => s.closeDialog);
  const toast = useStore((s) => s.toast);
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [meta, setMeta] = useState<Record<string, DraftMeta>>({});
  const [pngMode, setPngMode] = useState<'auto' | 'separate' | 'combined'>('auto');
  const [targetFolder, setTargetFolder] = useState(folderId);
  const [loading, setLoading] = useState(false);
  const [withoutModel, setWithoutModel] = useState(false);
  const [plainMeta, setPlainMeta] = useState<DraftMeta>({ displayName: '', nexoId: '', idEdited: false, material: 'PAPER' });
  const [ignored, setIgnored] = useState<string[]>([]);

  const addFiles = async (list: File[]) => {
    setLoading(true);
    try {
      const read = await readDroppedFiles(list);
      const next = [...files.filter((f) => !read.some((r) => r.name === f.name)), ...read];
      setIgnored(unsupportedFiles(next).map((f) => f.name));
      setFiles(next);
      rebuild(next, pngMode);
      setWithoutModel(false);
    } catch (err) {
      toast('error', `Dateien konnten nicht gelesen werden: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const rebuild = (all: DroppedFile[], mode: typeof pngMode) => {
    const next = createDrafts(all, mode);
    setDrafts(next);
    // Eingaben (Name, ID, Material) bleiben erhalten, wenn weitere Dateien hinzukommen
    setMeta((old) => {
      const result = { ...old };
      for (const d of next) {
        const key = sourceKey(d);
        if (!result[key]) result[key] = { displayName: d.name, nexoId: slugify(d.name), idEdited: false, material: 'PAPER' };
      }
      return result;
    });
  };

  useEffect(() => {
    if (initialFiles?.length) void addFiles(initialFiles);
  }, []);

  const entries = withoutModel ? [] : drafts;
  const allMeta = withoutModel ? [plainMeta] : entries.map((d) => meta[sourceKey(d)]).filter(Boolean);

  const idErrors = useMemo(() => {
    const existing = new Set(Object.values(project.items).map((i) => i.nexoId));
    const counts = new Map<string, number>();
    for (const m of allMeta) counts.set(m.nexoId, (counts.get(m.nexoId) ?? 0) + 1);
    return allMeta.map((m) => {
      if (!m.nexoId) return 'Bitte eine ID angeben.';
      if (!ITEM_ID_PATTERN.test(m.nexoId)) return 'Nur Kleinbuchstaben, Zahlen und _ erlaubt.';
      if (existing.has(m.nexoId)) return 'Diese ID gibt es im Projekt bereits.';
      if ((counts.get(m.nexoId) ?? 0) > 1) return 'Diese ID wird mehrfach verwendet.';
      return null;
    });
  }, [allMeta, project.items]);

  const blocking = withoutModel
    ? !!idErrors[0]
    : entries.length === 0 || entries.some((d) => d.error || !d.model) || idErrors.some(Boolean);

  const create = () => {
    if (blocking) return;
    let lastId: string | null = null;
    if (withoutModel) {
      lastId = addItem({
        displayName: plainMeta.displayName,
        nexoId: plainMeta.nexoId,
        folderId: targetFolder,
        material: plainMeta.material || 'PAPER',
        model: null,
      });
    } else {
      for (const d of entries) {
        const m = meta[sourceKey(d)];
        lastId = addItem({ displayName: m.displayName, nexoId: m.nexoId, folderId: targetFolder, material: m.material || 'PAPER', model: d.model });
      }
    }
    close();
    const count = withoutModel ? 1 : entries.length;
    toast('success', count === 1 ? 'Item erstellt.' : `${count} Items erstellt.`);
    if (lastId) useStore.getState().setActiveTab('general');
  };

  const updateMeta = (key: string, patch: Partial<DraftMeta>) =>
    setMeta((old) => {
      const current = old[key];
      const next = { ...current, ...patch };
      if (patch.displayName !== undefined && !current.idEdited) next.nexoId = slugify(stripMiniMessage(patch.displayName));
      return { ...old, [key]: next };
    });

  const updateDraft = (key: string, patch: Partial<ImportDraft>) =>
    setDrafts((old) => old.map((d) => (d.key === key ? runDraft({ ...d, ...patch }) : d)));

  const pngCount = files.filter(isPng).length;
  const onlyPngs = pngCount > 0 && drafts.every((d) => d.kind === 'png');

  return (
    <Modal
      title="Neues Item"
      icon={<PackagePlus size={20} />}
      onClose={close}
      size="wide"
      sticky={drafts.length > 0}
      footer={
        <>
          <span className="left">
            Ziel: <strong>{getFolderPathLabel(project, targetFolder)}</strong>
          </span>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={blocking} onClick={create}>
            <FilePlus2 size={16} />
            {withoutModel || entries.length <= 1 ? 'Item erstellen' : `${entries.length} Items erstellen`}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <label className="field" style={{ minWidth: 260 }}>
            <span className="field-label">Ordner</span>
            <FolderSelect value={targetFolder} onChange={setTargetFolder} />
          </label>
        </div>

        {!withoutModel && (
          <DropZone
            onFiles={(f) => void addFiles(f)}
            accept={ACCEPT}
            title={drafts.length ? 'Weitere Dateien hinzufügen' : 'Modell hier ablegen'}
            subtitle={
              drafts.length
                ? 'z.B. fehlende Texturen oder weitere Modelle'
                : 'Blockbench-Projekt (.bbmodel), Java-Modell (.json) mit PNG-Texturen oder nur PNG-Texturen. Mehrere Modelle ergeben mehrere Items.'
            }
            formats={drafts.length ? undefined : ['.bbmodel', '.json + .png', '.png', '.png.mcmeta']}
            compact={drafts.length > 0}
          />
        )}
        {loading && <div className="faint small">Dateien werden gelesen …</div>}
        {ignored.length > 0 && (
          <div className="hint warning">Nicht unterstützte Dateien werden ignoriert: {ignored.join(', ')}</div>
        )}

        {drafts.length === 0 && !withoutModel && (
          <div className="row">
            <span className="faint small">Kein Modell zur Hand?</span>
            <button className="btn small" onClick={() => setWithoutModel(true)}>
              <Box size={14} /> Item ohne Modell erstellen
            </button>
          </div>
        )}

        {withoutModel && (
          <div className="card mb-0">
            <div className="card-header">
              <div className="card-title-group">
                <h3>Item ohne Modell</h3>
                <div className="desc">Das Item nutzt das Aussehen des gewählten Materials. Ein Modell kann später hinzugefügt werden.</div>
              </div>
              <button className="btn small" onClick={() => setWithoutModel(false)}>
                Doch ein Modell ablegen
              </button>
            </div>
            <div className="card-body">
              <MetaFields
                meta={plainMeta}
                idError={idErrors[0]}
                onChange={(patch) =>
                  setPlainMeta((old) => {
                    const next = { ...old, ...patch };
                    if (patch.displayName !== undefined && !old.idEdited) next.nexoId = slugify(stripMiniMessage(patch.displayName));
                    return next;
                  })
                }
              />
            </div>
          </div>
        )}

        {onlyPngs && pngCount > 1 && (
          <div className="row wrap">
            <span className="small muted">Mehrere PNGs:</span>
            <div className="tristate">
              <button
                className={drafts.length > 1 ? 'active' : ''}
                onClick={() => {
                  setPngMode('separate');
                  rebuild(files, 'separate');
                }}
              >
                Ein Item pro PNG
              </button>
              <button
                className={drafts.length === 1 ? 'active' : ''}
                onClick={() => {
                  setPngMode('combined');
                  rebuild(files, 'combined');
                }}
              >
                Alle PNGs für ein Item (Ebenen / Blockseiten)
              </button>
            </div>
          </div>
        )}

        {entries.map((draft, index) => (
          <DraftCard
            key={draft.key}
            draft={draft}
            meta={meta[sourceKey(draft)]}
            idError={idErrors[index]}
            single={entries.length === 1}
            onMeta={(patch) => updateMeta(sourceKey(draft), patch)}
            onDraft={(patch) => updateDraft(draft.key, patch)}
            onRemove={() => {
              setDrafts((old) => old.filter((d) => d.key !== draft.key));
            }}
          />
        ))}
      </div>
    </Modal>
  );
}

function MetaFields({ meta, idError, onChange }: { meta: DraftMeta; idError: string | null; onChange: (patch: Partial<DraftMeta>) => void }) {
  return (
    <div className="field-grid">
      <label className="field">
        <span className="field-label">Anzeigename (MiniMessage möglich)</span>
        <input
          className="input"
          value={meta.displayName}
          placeholder="z.B. <red>Rubin-Schwert"
          autoFocus
          onChange={(e) => onChange({ displayName: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">Item-ID</span>
        <input
          className={`input mono ${idError ? 'invalid' : ''}`}
          value={meta.nexoId}
          onChange={(e) => onChange({ nexoId: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'), idEdited: true })}
        />
        {idError && <span className="field-error">{idError}</span>}
      </label>
      <label className="field">
        <span className="field-label">Material</span>
        <TextInput
          value={meta.material}
          suggestions={MATERIALS}
          mono
          onChange={(v) => onChange({ material: (v ?? '').toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
        />
      </label>
    </div>
  );
}

interface DraftCardProps {
  draft: ImportDraft;
  meta: DraftMeta | undefined;
  idError: string | null;
  single: boolean;
  onMeta: (patch: Partial<DraftMeta>) => void;
  onDraft: (patch: Partial<ImportDraft>) => void;
  onRemove: () => void;
}

function DraftCard({ draft, meta, idError, single, onMeta, onDraft, onRemove }: DraftCardProps) {
  if (!meta) return null;
  const pngs = draft.files.filter(isPng);
  const template = draft.template ? getTextureTemplate(draft.template) : null;
  const sourceLabel = { bbmodel: 'Blockbench (.bbmodel)', json: 'Java-Modell (.json)', png: 'Textur (.png)' }[draft.kind];
  const errorCount = draft.model?.issues.filter((i) => i.level === 'error').length ?? 0;
  return (
    <div className="card mb-0">
      <div className="card-header">
        {draft.kind === 'png' ? <ImageIcon size={18} /> : <Box size={18} />}
        <div className="card-title-group">
          <h3>{draft.model?.fileName ?? draft.files[0]?.name}</h3>
          <div className="desc">
            {sourceLabel}
            {draft.model && ` · ${draft.model.textures.length} Textur(en)`}
            {draft.model?.json.elements && ` · ${draft.model.json.elements.length} Würfel`}
          </div>
        </div>
        {errorCount > 0 && <span className="badge danger">{errorCount} Fehler</span>}
        {!single && (
          <button className="btn ghost icon small danger" title="Nicht importieren" onClick={onRemove}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="card-body">
        {draft.error ? (
          <div className="hint warning">{draft.error}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: single ? '320px 1fr' : '200px 1fr', gap: 16 }}>
            {draft.model && <ModelPreview model={draft.model} height={single ? 300 : 200} showToolbar={single} />}
            <div className="col" style={{ gap: 12 }}>
              <MetaFields meta={meta} idError={idError} onChange={onMeta} />
              {draft.kind === 'png' && template && (
                <div className="col" style={{ gap: 8 }}>
                  <label className="field">
                    <span className="field-label">Art des Modells</span>
                    <select
                      className="select"
                      value={template.id}
                      onChange={(e) => {
                        const t = getTextureTemplate(e.target.value);
                        onDraft({ template: t.id, assignment: suggestSlotAssignment(t, pngs) });
                      }}
                    >
                      {TEXTURE_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <span className="field-help">{template.description}</span>
                  </label>
                  {(!template.multiLayer || pngs.length > 1) && (
                    <div className="field-grid">
                      {(template.multiLayer ? Array.from({ length: Math.min(pngs.length, MAX_ITEM_LAYERS) }, (_, i) => `layer${i}`) : template.slots).map((slot) => (
                        <label key={slot} className="field">
                          <span className="field-label mono">{slot}</span>
                          <select
                            className="select"
                            value={draft.assignment?.[slot] ?? ''}
                            onChange={(e) => onDraft({ assignment: { ...draft.assignment, [slot]: e.target.value } })}
                          >
                            <option value="">– keine –</option>
                            {pngs.map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {draft.model && <IssueList issues={draft.model.issues} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
