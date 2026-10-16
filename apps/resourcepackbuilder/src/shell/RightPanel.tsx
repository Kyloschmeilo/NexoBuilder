import { useMemo } from 'react';
import { Code } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ExportPlan, findItemPlan, itemYamlPreview } from '@resourcepackbuilder/export';
import { issuesFor, type Issue } from '@resourcepackbuilder/utils';
import { glyphFilePath } from '@resourcepackbuilder/core/nexo';
import type { Project } from '@resourcepackbuilder/core/project';
import { Tip } from '@resourcepackbuilder/ui';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { IssueList } from '../components/IssueList';
import { YamlCode } from '../components/YamlCode';
import { usePlan } from './PlanProvider';
import { useOpenProject } from '../store/project';
import { useUiStore, type Selection } from '../store/ui';

interface Preview {
  /** File the text belongs to; null when there is nothing to show */
  file: string | null;
  text: string;
  /** Issues of the selected item */
  issues: Issue[];
}

const NOTHING: Preview = { file: null, text: '', issues: [] };

/** A text file of the plan's plugin folder ('' when there is none). */
function pluginText(plan: ExportPlan, path: string): string {
  const content = plan.pluginFiles.get(path);
  return typeof content === 'string' ? content : '';
}

/** What the panel shows for a selection: the item's YAML, the folder's file, or the glyph file. */
function previewFor(project: Project, plan: ExportPlan | null, selection: Selection): Preview {
  if (!plan || !selection) return NOTHING;
  switch (selection.kind) {
    case 'item': {
      const item = project.items[selection.id];
      if (!item) return NOTHING;
      return {
        file: findItemPlan(plan, item.id)?.yamlFile ?? null,
        text: itemYamlPreview(plan, item.id),
        issues: issuesFor(plan.issues, selection),
      };
    }
    case 'folder': {
      const itemIds = new Set(project.folders[selection.id]?.itemIds);
      const entry = plan.items.find((p) => itemIds.has(p.item.id));
      return entry ? { file: entry.yamlFile, text: pluginText(plan, entry.yamlFile), issues: [] } : NOTHING;
    }
    case 'view': {
      const glyphFile = selection.view === 'glyphs' ? glyphFilePath(project) : null;
      const text = glyphFile ? pluginText(plan, glyphFile) : '';
      return glyphFile && text ? { file: glyphFile, text, issues: [] } : NOTHING;
    }
  }
}

/** Right panel: live YAML of the selected item, the folder's file or the glyph file, with the item's checks. */
export function RightPanel() {
  const t = useTranslations('layout.rightPanel');
  const project = useOpenProject();
  const plan = usePlan();
  const selection = useUiStore((s) => s.selection);
  const { file, text, issues } = useMemo(() => previewFor(project, plan, selection), [project, plan, selection]);
  const title = file ?? t('title');

  return (
    <aside className="flex min-h-0 w-100 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3">
        <Code className="size-4 shrink-0" />
        <Tip label={title}>
          <h2 className="min-w-0 flex-1 truncate font-mono text-xs">{title}</h2>
        </Tip>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {text ? (
          <div className="p-2.5">
            <YamlCode text={text} />
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">{t('empty')}</div>
        )}
        {issues.length > 0 && (
          <div className="px-2.5 pb-3.5">
            <h3 className="mt-1.5 mb-2 text-xs font-medium text-muted-foreground">{t('checks')}</h3>
            <IssueList issues={issues} />
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
