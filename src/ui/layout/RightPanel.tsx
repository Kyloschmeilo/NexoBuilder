import { Code } from 'lucide-react';
import type { ExportPlan } from '../../core/export/plan';
import { issuesForItem } from '../../core/export/plan';
import { useStore } from '../../state/store';
import { IssueList } from '../common/IssueList';
import { CopyButton, YamlView } from '../common/YamlView';
import { itemYamlPreview } from '../item/YamlTab';

/** Rechte Leiste: Live-YAML des gewählten Items bzw. der Ordner-Datei. */
export function RightPanel({ plan }: { plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const selection = useStore((s) => s.selection);

  let title = 'YAML-Vorschau';
  let text = '';
  let issues = null as ReturnType<typeof issuesForItem> | null;

  if (selection?.kind === 'item' && project.items[selection.id]) {
    const item = project.items[selection.id];
    text = itemYamlPreview(plan, item);
    const entry = plan?.items.find((p) => p.item.id === item.id);
    title = entry?.yamlFile ?? title;
    issues = plan ? issuesForItem(plan.issues, item.id) : [];
  } else if (selection?.kind === 'glyphs') {
    const entry = plan ? [...plan.glyphFiles.entries()][0] : undefined;
    if (entry) {
      title = entry[0];
      text = entry[1];
    }
  } else if (selection?.kind === 'folder' && project.folders[selection.id]) {
    const folder = project.folders[selection.id];
    const first = folder.itemIds.map((id) => plan?.items.find((p) => p.item.id === id)).find(Boolean);
    if (first) {
      title = first.yamlFile;
      text = plan?.itemFiles.get(first.yamlFile) ?? '';
    }
  }

  return (
    <aside className="rightpanel">
      <div className="rightpanel-header">
        <Code size={16} />
        <span className="grow mono small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={title}>
          {title}
        </span>
        {text && <CopyButton text={text} />}
      </div>
      <div className="rightpanel-body">
        {text ? (
          <div style={{ padding: 10 }}>
            <YamlView text={text} />
          </div>
        ) : (
          <div className="empty-state small">
            <div>Wähle ein Item, um hier das fertige Nexo-YAML zu sehen.</div>
          </div>
        )}
        {issues && issues.length > 0 && (
          <div style={{ padding: '0 10px 14px' }}>
            <div className="field-label" style={{ margin: '6px 0 8px' }}>
              Prüfung
            </div>
            <IssueList issues={issues} onOpenItem={undefined} />
          </div>
        )}
      </div>
    </aside>
  );
}
