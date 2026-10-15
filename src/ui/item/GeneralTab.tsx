import type { Item } from '../../core/types';
import { MATERIALS } from '../../core/nexo/options';
import { ITEM_ID_PATTERN } from '../../core/util';
import { moveItem, updateItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { ItemTooltip } from '../common/MiniMessage';
import { TextInput } from '../form/inputs';
import { FolderSelect } from '../dialogs/FolderSelect';
import { PropertiesPanel } from './PropertiesPanel';

export function GeneralTab({ item }: { item: Item }) {
  const project = useStore((s) => s.project)!;
  const duplicate = Object.values(project.items).find((i) => i.id !== item.id && i.nexoId === item.nexoId);
  const idError = !item.nexoId
    ? 'Die ID darf nicht leer sein.'
    : !ITEM_ID_PATTERN.test(item.nexoId)
      ? 'Nur Kleinbuchstaben, Zahlen und _ erlaubt.'
      : duplicate
        ? `Diese ID wird bereits von „${duplicate.displayName || duplicate.nexoId}“ verwendet.`
        : null;
  const material = typeof item.config.material === 'string' ? item.config.material : 'PAPER';
  const lore = Array.isArray(item.config.lore) ? (item.config.lore as unknown[]).map((l) => String(l ?? '')) : undefined;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Grunddaten</h3>
            <div className="desc">Name, ID und Basis-Material des Items</div>
          </div>
        </div>
        <div className="card-body">
          <div className="general-grid">
            <div className="field-grid general-fields">
              <label className="field wide">
                <span className="field-label">Anzeigename (itemname, MiniMessage)</span>
                <input
                  className="input"
                  value={item.displayName}
                  placeholder="z.B. <gradient:#ff5555:#ffaa00>Feuerschwert"
                  onChange={(e) => updateItem(item.id, (d) => (d.displayName = e.target.value), 'displayName')}
                />
                <span className="field-help">
                  Farben: &lt;red&gt;, &lt;#ff8800&gt;, &lt;gradient:#ff0000:#0000ff&gt; · Formatierung: &lt;bold&gt;, &lt;italic&gt;, &lt;!italic&gt;
                </span>
              </label>
              <label className="field">
                <span className="field-label">Item-ID (für /nexo give)</span>
                <input
                  className={`input mono ${idError ? 'invalid' : ''}`}
                  value={item.nexoId}
                  onChange={(e) =>
                    updateItem(item.id, (d) => (d.nexoId = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')), 'nexoId')
                  }
                />
                {idError && <span className="field-error">{idError}</span>}
              </label>
              <label className="field">
                <span className="field-label">Material</span>
                <TextInput
                  value={material}
                  suggestions={MATERIALS}
                  mono
                  onChange={(v) =>
                    updateItem(item.id, (d) => (d.config.material = (v ?? '').toUpperCase().replace(/[^A-Z0-9_]/g, '_')), 'material')
                  }
                />
                <span className="field-help">Basis-Item in Minecraft. Standard ist PAPER; für Werkzeuge/Rüstung das passende Material.</span>
              </label>
              <label className="field">
                <span className="field-label">Ordner</span>
                <FolderSelect value={item.folderId} onChange={(folderId) => moveItem(item.id, folderId)} />
              </label>
            </div>
            <div className="col general-preview" style={{ gap: 6 }}>
              <span className="field-label">Tooltip-Vorschau</span>
              <ItemTooltip name={item.displayName || item.nexoId} lore={lore} />
              <span className="field-help">Ohne eigene Farbe zeigt Minecraft die Lore lila und kursiv an.</span>
            </div>
          </div>
        </div>
      </div>
      <PropertiesPanel item={item} groups={['general']} title="General" emptyText="Noch nichts hinzugefügt (z.B. Lore)." />
    </div>
  );
}
