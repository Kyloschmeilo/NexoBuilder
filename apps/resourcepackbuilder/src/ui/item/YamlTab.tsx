import { useEffect, useState } from 'react';
import type { Item } from '@resourcepackbuilder/core/types';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { parseYaml, toYaml } from '@resourcepackbuilder/core/nexo/yaml';
import { isPlainObject } from '@resourcepackbuilder/core/util';
import { updateItem } from '../../state/actions';
import { CopyButton, YamlView } from '@resourcepackbuilder/ui';

export function itemYamlPreview(plan: ExportPlan | null, item: Item): string {
  const entry = plan?.items.find((p) => p.item.id === item.id);
  if (!entry) return '';
  return toYaml({ [item.nexoId || 'item']: entry.config });
}

export function YamlTab({ item, plan }: { item: Item; plan: ExportPlan | null }) {
  const [text, setText] = useState(item.rawYaml);
  useEffect(() => setText(item.rawYaml), [item.id, item.rawYaml]);
  const parsed = parseYaml(text);
  const error = parsed.error ?? (parsed.value !== null && !isPlainObject(parsed.value) ? 'Erwartet Schlüssel-Wert-Paare (z.B. "Mechanics:").' : null);
  const preview = itemYamlPreview(plan, item);
  const entry = plan?.items.find((p) => p.item.id === item.id);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Zusätzliches YAML</h3>
            <div className="desc">
              Für alles, was es im Editor (noch) nicht gibt. Wird zum Schluss über die Einstellungen gelegt und überschreibt gleiche Schlüssel.
            </div>
          </div>
        </div>
        <div className="card-body">
          <textarea
            className={`textarea ${error ? 'invalid' : ''}`}
            rows={10}
            spellCheck={false}
            value={text}
            placeholder={'# Beispiel:\nMechanics:\n  furniture:\n    placements:\n      wall:\n        properties:\n          translation: 0,0.3,-0.3'}
            onChange={(e) => {
              setText(e.target.value);
              updateItem(item.id, (d) => (d.rawYaml = e.target.value), 'rawYaml');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const el = e.target as HTMLTextAreaElement;
                const { selectionStart, selectionEnd } = el;
                const next = text.slice(0, selectionStart) + '  ' + text.slice(selectionEnd);
                setText(next);
                updateItem(item.id, (d) => (d.rawYaml = next), 'rawYaml');
                window.requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
              }
            }}
          />
          {error && <div className="field-error" style={{ marginTop: 6 }}>YAML-Fehler: {error}</div>}
          <div className="field-help" style={{ marginTop: 6 }}>
            Nicht den Item-Schlüssel ({item.nexoId}) angeben – nur den Inhalt darunter.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Fertiges YAML</h3>
            <div className="desc">So landet das Item in {entry?.yamlFile ?? 'plugins/Nexo/items/…'}</div>
          </div>
          <CopyButton text={preview} />
        </div>
        <div className="card-body">
          <YamlView text={preview || '# wird berechnet …'} />
        </div>
      </div>
    </div>
  );
}
