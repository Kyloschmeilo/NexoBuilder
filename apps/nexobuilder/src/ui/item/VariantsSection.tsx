import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Box, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ImportedModel, Item } from '@nexobuilder/core/types';
import { VARIANTS, variantPathSuffix, type VariantDef } from '@nexobuilder/core/nexo/variants';
import { updateItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '@nexobuilder/ui';
import { MenuItem, Popover } from '@nexobuilder/ui';
import { pickFiles, readDroppedFiles } from '@nexobuilder/ui';
import { createDrafts } from '../importer';
import { useThumbnail } from '@nexobuilder/preview';

export const MODEL_ACCEPT = '.bbmodel,.json,.png,.mcmeta';
const ACCEPT = MODEL_ACCEPT;

/** Liest Modelle aus Dateien – jede Datei (bzw. jedes .bbmodel) wird ein eigenes Modell. */
export async function importModels(files: File[]): Promise<ImportedModel[]> {
  const toast = useStore.getState().toast;
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
  const drafts = createDrafts(await readDroppedFiles(sorted), 'separate');
  const models: ImportedModel[] = [];
  for (const draft of drafts) {
    if (draft.error || !draft.model) toast('error', draft.error ?? `„${draft.name}“ konnte nicht gelesen werden.`);
    else models.push(draft.model);
  }
  if (drafts.length === 0) toast('error', 'Keine passende Datei gefunden. Erlaubt sind .bbmodel, .json (+ PNG) und .png.');
  return models;
}

export function VariantsSection({ item }: { item: Item }) {
  const active = VARIANTS.filter((v) => item.variants?.[v.slot] !== undefined);
  return (
    <div>
      <div className="section-title">
        <span>Special Item Appearance</span>
        <span className="spacer" />
        <AddVariantButton item={item} />
      </div>
      {active.length === 0 && (
        <div className="card">
          <div className="card-body faint small" style={{ textAlign: 'center', padding: 22 }}>
            Pulling, Charged, Blocking, Cast, Throwing, Damaged, Dyeable, Composite oder ein eigenes GUI Model: weitere Modelle über{' '}
            <strong>„Hinzufügen“</strong>.
          </div>
        </div>
      )}
      {active.map((def) => (
        <VariantCard key={def.slot} item={item} def={def} />
      ))}
    </div>
  );
}

function AddVariantButton({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const available = VARIANTS.filter((v) => item.variants?.[v.slot] === undefined);
  return (
    <>
      <button ref={anchor} className="btn small primary" onClick={() => setOpen((o) => !o)} disabled={available.length === 0}>
        <Plus size={14} /> Hinzufügen
      </button>
      <Popover anchor={anchor.current} open={open} onClose={() => setOpen(false)} align="right" width={360}>
        {available.map((def) => (
          <MenuItem
            key={def.slot}
            label={def.label}
            description={def.description}
            onClick={() => {
              setOpen(false);
              updateItem(item.id, (d) => {
                d.variants = { ...(d.variants ?? {}), [def.slot]: [] };
              });
            }}
          />
        ))}
      </Popover>
    </>
  );
}

export function VariantCard({ item, def, removable = true }: { item: Item; def: VariantDef; removable?: boolean }) {
  const models = item.variants?.[def.slot] ?? [];
  const material = String(item.config.material ?? 'PAPER').toUpperCase();
  const wrongMaterial = def.materials && !def.materials.includes(material);
  const setModels = (next: ImportedModel[]) =>
    updateItem(item.id, (d) => {
      d.variants = { ...(d.variants ?? {}), [def.slot]: next };
    });
  const add = async (files: File[]) => {
    const imported = await importModels(files);
    if (imported.length === 0) return;
    setModels(def.multiple ? [...models, ...imported] : [imported[0]]);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="row">
            <h3>{def.label}</h3>
            {def.kind === 'pack' && (
              <span className="badge mono" title="Pfad im YAML">
                Pack.{def.slot}
              </span>
            )}
            {def.kind === 'definition' && <span className="badge mono">eigenes ItemModel</span>}
            {def.kind === 'block' && <span className="badge mono">custom_block.stackable</span>}
          </div>
          <div className="desc">{def.description}</div>
        </div>
        {removable && (
          <button
            className="btn ghost icon small danger"
            title="Variante entfernen"
            onClick={() =>
              updateItem(item.id, (d) => {
                const next = { ...(d.variants ?? {}) };
                delete next[def.slot];
                d.variants = next;
              })
            }
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <div className="card-body">
        {wrongMaterial && (
          <div className="hint warning" style={{ alignItems: 'center' }}>
            <span className="grow">
              Funktioniert nur mit dem Material {def.materials!.join(' oder ')} – aktuell {material}.
            </span>
            <button className="btn small" onClick={() => updateItem(item.id, (d) => (d.config.material = def.materials![0]))}>
              Material auf {def.materials![0]} setzen
            </button>
          </div>
        )}
        {def.hint && <div className="hint">{def.hint}</div>}
        <div className="list-editor" style={{ gap: 8, marginBottom: models.length ? 10 : 0 }}>
          {models.map((model, index) => (
            <VariantEntry
              key={index}
              model={model}
              label={variantPathSuffix(def, index)}
              index={index}
              count={models.length}
              multiple={def.multiple}
              onMove={(to) => {
                const next = [...models];
                const [m] = next.splice(index, 1);
                next.splice(to, 0, m);
                setModels(next);
              }}
              onReplace={async () => {
                const files = await pickFiles(ACCEPT);
                if (!files.length) return;
                const [replacement] = await importModels(files);
                if (replacement) setModels(models.map((m, i) => (i === index ? replacement : m)));
              }}
              onRemove={() => setModels(models.filter((_, i) => i !== index))}
            />
          ))}
        </div>
        {(def.multiple || models.length === 0) && (
          <DropZone
            onFiles={(files) => void add(files)}
            accept={ACCEPT}
            title={def.multiple ? 'Modelle hier ablegen' : 'Modell hier ablegen'}
            subtitle={
              def.multiple
                ? 'Mehrere Dateien auf einmal möglich – sie werden nach Dateinamen sortiert (z.B. bow_0, bow_1, bow_2).'
                : '.bbmodel, .json + .png oder .png'
            }
            compact
          />
        )}
      </div>
    </div>
  );
}

interface VariantEntryProps {
  model: ImportedModel;
  label: string;
  index: number;
  count: number;
  multiple: boolean;
  onMove: (to: number) => void;
  onReplace: () => void;
  onRemove: () => void;
}

function VariantEntry({ model, label, index, count, multiple, onMove, onReplace, onRemove }: VariantEntryProps) {
  const thumb = useThumbnail(model);
  const errors = model.issues.filter((i) => i.level === 'error').length;
  return (
    <div className="texture-card" style={{ alignItems: 'center', padding: 8 }}>
      <div className="texture-thumb" style={{ width: 44, height: 44 }}>
        {thumb ? <img src={thumb} alt="" /> : <Box size={18} className="faint" />}
      </div>
      <div className="texture-info" style={{ gap: 2 }}>
        <span className="mono small">{label}</span>
        <span className="faint small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {model.fileName}
          {errors > 0 && <span style={{ color: 'var(--ember)' }}> · {errors} Fehler</span>}
        </span>
      </div>
      {multiple && (
        <>
          <button className="btn ghost icon small" title="Nach oben" disabled={index === 0} onClick={() => onMove(index - 1)}>
            <ArrowUp size={14} />
          </button>
          <button className="btn ghost icon small" title="Nach unten" disabled={index === count - 1} onClick={() => onMove(index + 1)}>
            <ArrowDown size={14} />
          </button>
        </>
      )}
      <button className="btn ghost icon small" title="Ersetzen" onClick={onReplace}>
        <RefreshCw size={14} />
      </button>
      <button className="btn ghost icon small danger" title="Entfernen" onClick={onRemove}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
