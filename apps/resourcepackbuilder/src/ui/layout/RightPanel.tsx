import { Code } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { issuesForItem } from '@resourcepackbuilder/core/export/plan';
import { IssueList, CopyButton, YamlView } from '@resourcepackbuilder/ui';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { useStore } from '../../state/store';
import { itemYamlPreview } from '../item/YamlTab';

/** Right panel: live YAML of the selected item or the folder file. */
export function RightPanel({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('layout.rightPanel');
  const project = useStore((s) => s.project)!;
  const selection = useStore((s) => s.selection);

  let title = t('title');
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
            <IssueList issues={issues} onOpenItem={undefined} />
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
