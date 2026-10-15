/** Paste copied item properties into one or more items. */
import { useMemo, useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { COPY_CATEGORIES, summarizeClipboard, type CopyCategory } from '@resourcepackbuilder/core/nexo/copyConfig';
import { selectFromProject } from '@resourcepackbuilder/core/export/selection';
import { clipboardLabel, pasteItemProperties, useItemClipboard } from '../../state/clipboard';
import { useStore } from '../../state/store';
import { Modal } from '@resourcepackbuilder/ui';
import { SelectionTree } from './ExportSelection';

export function PasteConfigDialog({ targetItemIds }: { targetItemIds: string[] }) {
  const project = useStore((s) => s.project)!;
  const close = useStore((s) => s.closeDialog);
  const clip = useItemClipboard((s) => s.clip);
  const summary = useMemo(() => (clip ? summarizeClipboard(clip) : []), [clip]);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [categories, setCategories] = useState<Set<CopyCategory>>(
    () => new Set(COPY_CATEGORIES.filter((c) => c.defaultOn && summary.find((s) => s.id === c.id)?.entries.length).map((c) => c.id)),
  );
  // Target selection like in the export: what is not selected is remembered
  const [excluded, setExcluded] = useState<string[]>(() => Object.keys(project.items).filter((id) => !targetItemIds.includes(id)));

  if (!clip) return null;
  const sourceInProject = !!project.items[clip.sourceItemId];
  const treeProject = sourceInProject ? selectFromProject(project, { excludedItemIds: [clip.sourceItemId], excludedGlyphIds: [] }) : project;
  const excludedSet = new Set(excluded);
  const targets = Object.keys(treeProject.items).filter((id) => !excludedSet.has(id));

  const apply = () => {
    const count = pasteItemProperties(targets, { categories, mode });
    useStore.getState().toast('success', `Eigenschaften von „${clipboardLabel(clip)}“ in ${count} Item(s) eingefügt. Strg+Z macht es rückgängig.`);
    close();
  };

  const toggle = (id: CopyCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      title="Eigenschaften einfügen"
      icon={<ClipboardPaste size={20} />}
      onClose={close}
      size="wide"
      footer={
        <>
          <span className="left">
            Quelle: <b>{clipboardLabel(clip)}</b> <span className="mono">({clip.sourceNexoId})</span>
            {clip.projectId !== project.id && ' · aus einem anderen Projekt'}
          </span>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={targets.length === 0 || categories.size === 0} onClick={apply}>
            <ClipboardPaste size={16} /> In {targets.length} Item(s) einfügen
          </button>
        </>
      }
    >
      <div className="export-grid">
        <div className="col" style={{ gap: 12 }}>
          <div className="label-caps">Was übernehmen?</div>
          <div className="col" style={{ gap: 2 }}>
            {COPY_CATEGORIES.map((c) => {
              const entries = summary.find((s) => s.id === c.id)?.entries ?? [];
              return (
                <label key={c.id} className="toggle-row">
                  <input type="checkbox" className="check" checked={categories.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="grow">
                    {c.label} <span className="mono faint small">{entries.length > 0 ? entries.length : '–'}</span>
                    <div className="tr-desc">
                      {entries.length > 0
                        ? entries.join(', ')
                        : mode === 'replace'
                          ? 'Bei der Quelle leer – entfernt die Werte dieser Kategorie beim Ziel.'
                          : 'Bei der Quelle leer.'}
                    </div>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="label-caps">Vorhandene Werte im Ziel</div>
            <div className="tabs-inline" role="radiogroup">
              <button className={`seg ${mode === 'replace' ? 'active' : ''}`} role="radio" aria-checked={mode === 'replace'} onClick={() => setMode('replace')}>
                Ersetzen
              </button>
              <button className={`seg ${mode === 'merge' ? 'active' : ''}`} role="radio" aria-checked={mode === 'merge'} onClick={() => setMode('merge')}>
                Ergänzen
              </button>
            </div>
            <div className="field-help">
              {mode === 'replace'
                ? 'Die Ziel-Items bekommen in den gewählten Kategorien genau die Werte der Quelle.'
                : 'Nur hinzufügen und überschreiben – Werte, die es nur beim Ziel gibt, bleiben erhalten.'}
            </div>
          </div>
          <div className="hint">
            Nie kopiert: Anzeigename, Item-ID, Modell und Varianten, Ordner sowie custom_model_data. Eigene Blöcke bekommen bei Bedarf eine freie
            Variation.
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <div className="row">
            <div className="label-caps">
              Ziel-Items · <span className="mono">{targets.length}</span>
            </div>
            <span className="spacer" />
            <button className="btn ghost small" onClick={() => setExcluded([])}>
              Alle
            </button>
            <button className="btn ghost small" onClick={() => setExcluded(Object.keys(project.items))}>
              Keine
            </button>
          </div>
          <div className="picker-project active">
            <SelectionTree
              project={treeProject}
              itemsOnly
              selection={{ excludedItemIds: excluded, excludedGlyphIds: [] }}
              onChange={(next) => setExcluded(next.excludedItemIds)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
