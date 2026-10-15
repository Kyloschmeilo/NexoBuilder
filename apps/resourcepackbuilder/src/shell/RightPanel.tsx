import { Code } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { issuesFor, type Issue } from '@resourcepackbuilder/core/issues';
import { CopyButton } from '@resourcepackbuilder/ui';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { IssueList } from '../components/IssueList';
import { YamlView } from '../components/YamlView';
import { itemYamlPreview } from '../features/item/YamlTab';
import { usePlan } from '../store/PlanProvider';
import { useOpenProject } from '../store/project';
import { useUiStore } from '../store/ui';

/** Right panel: live YAML of the selected item or the folder file. */
export function RightPanel() {
  const t = useTranslations('layout.rightPanel');
  const project = useOpenProject();
  const plan = usePlan();
  const selection = useUiStore((s) => s.selection);

  let title = t('title');
  let text = '';
  let issues: Issue[] | null = null;

  if (selection?.kind === 'item' && project.items[selection.id]) {
    const item = project.items[selection.id];
    text = itemYamlPreview(plan, item);
    const entry = plan?.items.find((p) => p.item.id === item.id);
    title = entry?.yamlFile ?? title;
    issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  } else if (selection?.kind === 'view' && selection.view === 'glyphs') {
    const entry = plan ? [...plan.glyphFiles.entries()][0] : undefined;
    if (entry) {
      title = entry[0];
      text = entry[1];
    }
  } else if (selection?.kind === 'folder' && project.folders[selection.id]) {
    const folder = project.folders[selection.id];
    const first = folder.itemIds.map((id) => plan?.items.find((p) => p.item.id === id)).find((entry) => entry !== undefined);
    if (first) {
      title = first.yamlFile;
      text = plan?.itemFiles.get(first.yamlFile) ?? '';
    }
  }

  return (
    <aside className="flex min-h-0 w-[400px] flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3 font-heading text-[13px] leading-4 font-semibold tracking-[0.08em] uppercase">
        <Code className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs tracking-normal normal-case" title={title}>
          {title}
        </span>
        {text && <CopyButton text={text} />}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {text ? (
          <div className="p-2.5">
            <YamlView text={text} />
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">{t('empty')}</div>
        )}
        {issues && issues.length > 0 && (
          <div className="px-2.5 pb-3.5">
            <div className="mt-1.5 mb-2 text-xs font-medium text-muted-foreground">{t('checks')}</div>
            <IssueList issues={issues} />
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
