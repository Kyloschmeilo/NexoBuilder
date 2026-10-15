/**
 * Modelle für Möbel-Funktionen (verbinden, Platzierung, Licht, Zustände) und Stapel-Stufen von Blöcken.
 * Jeder Platz nimmt ein Modell auf; beim Export schreibt NexoBuilder die passenden ItemModels und Werte.
 */
import { Box, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ImportedModel, Item } from '../../core/types';
import { getPath } from '../../core/nexo/configPath';
import { CONNECT_SLOTS, FURNITURE_MODEL_SLOTS, PLACEMENT_SLOTS, STACK_MODELS, stateDef, type VariantDef, type VariantSlot } from '../../core/nexo/variants';
import { isPlainObject } from '../../core/util';
import { updateItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { DropZone } from '../common/DropZone';
import { pickFiles } from '../files';
import { useThumbnail } from '../preview/thumbnail';
import { importModels, MODEL_ACCEPT, VariantCard } from './VariantsSection';

const STATE_RESERVED = new Set(['next_after', 'reset_after', 'condition']);

function setSlot(item: Item, slot: VariantSlot, models: ImportedModel[] | undefined) {
  updateItem(item.id, (d) => {
    const next = { ...(d.variants ?? {}) };
    if (models && models.length > 0) next[slot] = models;
    else delete next[slot];
    d.variants = next;
  });
}

/** Ein Platz für genau ein Modell */
function ModelSlot({ item, def }: { item: Item; def: VariantDef }) {
  const model = item.variants?.[def.slot]?.[0] ?? null;
  const thumb = useThumbnail(model);
  const load = async (files: File[]) => {
    const [imported] = await importModels(files);
    if (imported) setSlot(item, def.slot, [imported]);
  };
  return (
    <div className={`model-slot ${model ? 'filled' : ''}`}>
      <div className="model-slot-head">
        <span className="model-slot-label">{def.label}</span>
        {model && (
          <>
            <button
              className="btn ghost icon small"
              title="Ersetzen"
              onClick={async () => {
                const files = await pickFiles(MODEL_ACCEPT);
                if (files.length) void load(files);
              }}
            >
              <RefreshCw size={13} />
            </button>
            <button className="btn ghost icon small danger" title="Entfernen" onClick={() => setSlot(item, def.slot, undefined)}>
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
      {model ? (
        <div className="model-slot-body" title={model.fileName}>
          <div className="texture-thumb" style={{ width: 48, height: 48 }}>
            {thumb ? <img src={thumb} alt="" /> : <Box size={18} className="faint" />}
          </div>
          <span className="faint small model-slot-file">{model.fileName}</span>
        </div>
      ) : (
        <DropZone onFiles={(files) => void load(files)} accept={MODEL_ACCEPT} title="Modell" subtitle={def.description} multiple={false} compact />
      )}
    </div>
  );
}

function SlotGroup({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="slot-group">
      <div className="label-caps">{title}</div>
      <div className="field-help" style={{ marginBottom: 8 }}>
        {desc}
      </div>
      <div className="slot-grid">{children}</div>
    </div>
  );
}

const byslot = (slot: VariantSlot) => FURNITURE_MODEL_SLOTS.find((d) => d.slot === slot)!;

/** Möbel-Modelle – nur sichtbar, wenn die Mechanik „Möbel“ aktiv ist */
export function FurnitureModelsSection({ item }: { item: Item }) {
  const furniture = getPath(item.config, ['Mechanics', 'furniture']);
  if (!isPlainObject(furniture)) return null;
  const states = isPlainObject(furniture.states) ? Object.keys(furniture.states).filter((k) => !STATE_RESERVED.has(k)) : [];

  const addState = () =>
    useStore.getState().openDialog({
      type: 'prompt',
      title: 'Neuer State',
      label: 'Name des States (z.B. an, offen, kanal_2)',
      initial: '',
      confirmLabel: 'Anlegen',
      validate: (value) => {
        const name = value.trim();
        if (!name) return 'Bitte einen Namen eingeben.';
        if (!/^[A-Za-z0-9_-]+$/.test(name)) return 'Nur Buchstaben, Zahlen, _ und - erlaubt.';
        if (STATE_RESERVED.has(name) || states.includes(name)) return 'Diesen Namen gibt es schon.';
        return null;
      },
      onSubmit: (value) =>
        updateItem(item.id, (d) => {
          const mechanics = (d.config.Mechanics ??= {}) as Record<string, unknown>;
          const f = (mechanics.furniture ??= {}) as Record<string, unknown>;
          const s = (isPlainObject(f.states) ? f.states : (f.states = {})) as Record<string, unknown>;
          s[value.trim()] = {};
        }),
    });

  return (
    <div>
      <div className="section-title">
        <span>Furniture Models</span>
      </div>
      <div className="card">
        <div className="card-body col" style={{ gap: 20 }}>
          <SlotGroup
            title="Connectable"
            desc="Gleiche Möbel nebeneinander verbinden sich, z.B. Stühle zu einem Sofa. Fehlende Teile zeigen das Hauptmodell."
          >
            {CONNECT_SLOTS.map((c) => (
              <ModelSlot key={c.slot} item={item} def={byslot(c.slot)} />
            ))}
          </SlotGroup>
          <SlotGroup title="Placements" desc="Anderes Modell je nachdem, ob die Möbel auf den Boden, an die Wand oder an die Decke gesetzt wird.">
            {PLACEMENT_SLOTS.map((p) => (
              <ModelSlot key={p.slot} item={item} def={byslot(p.slot)} />
            ))}
          </SlotGroup>
          <SlotGroup title="Lights" desc="Toggled Item Model: Modell, wenn das Licht per Rechtsklick eingeschaltet ist (Lichtquellen unter „Mechanics → Furniture → Lights“).">
            <ModelSlot item={item} def={byslot('light_on')} />
          </SlotGroup>
          <SlotGroup title="States" desc="Per Klick durchschaltbare Zustände, z.B. Fernseher mit Kanälen. Weitere Einstellungen unter „Mechanics → Furniture → States“.">
            {states.map((name) => (
              <ModelSlot key={name} item={item} def={stateDef(name)} />
            ))}
            <button className="model-slot add" onClick={addState}>
              <Plus size={18} />
              <span>State hinzufügen</span>
            </button>
          </SlotGroup>
        </div>
      </div>
    </div>
  );
}

/** Stapel-Stufen – nur bei der Mechanik „Eigener Block“ (StringBlock) */
export function BlockModelsSection({ item }: { item: Item }) {
  const block = getPath(item.config, ['Mechanics', 'custom_block']);
  if (!isPlainObject(block) || block.type !== 'STRINGBLOCK') return null;
  return (
    <div>
      <div className="section-title">
        <span>Custom Block Models</span>
      </div>
      <VariantCard item={item} def={STACK_MODELS} removable={false} />
    </div>
  );
}
