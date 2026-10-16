/** All saved projects to export together; the expanded one shows its selection tree. */
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { countSelected, SELECT_ALL, type ExportSelection } from '@resourcepackbuilder/core/export/selection';
import { MEDIA_KIND_LIST, MEDIA_KINDS, type MediaKind } from '@resourcepackbuilder/core/nexo/media/kinds';
import { treeRowSlots } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { GroupRow } from '../../components/selection/SelectionRows';
import { SelectionTree } from '../../components/selection/SelectionTree';
import type { ProjectChoice } from './useProjectChoices';

interface ProjectPickerProps {
  choices: ProjectChoice[];
  includedIds: ReadonlySet<string>;
  selections: Record<string, ExportSelection>;
  expandedId: string | null;
  onIncludedChange: (projectId: string, isIncluded: boolean) => void;
  onExpand: (projectId: string | null) => void;
  onSelectionChange: (projectId: string, selection: ExportSelection) => void;
}

/** Message key below `dialogs.exportSelection` of the count of each media kind. */
const MEDIA_COUNT_KEYS = {
  glyph: 'glyphCount',
  sound: 'soundCount',
  painting: 'paintingCount',
} as const satisfies Record<MediaKind, string>;

/** What is selected of a project, e.g. "12/14 items · 3 glyphs". */
function useSelectionSummary() {
  const t = useTranslations('dialogs.exportSelection');
  return ({ summary, project }: ProjectChoice, selection: ExportSelection, isIncluded: boolean) => {
    if (!isIncluded || !project) return t('itemCount', { count: summary.itemCount });
    const counts = countSelected(project, selection);
    return [
      t('selectedItems', { selected: counts.items, total: Object.keys(project.items).length }),
      ...MEDIA_KIND_LIST.map((kind) => {
        const count = counts[MEDIA_KINDS[kind].list];
        return count ? t(MEDIA_COUNT_KEYS[kind], { count }) : null;
      }),
    ]
      .filter(Boolean)
      .join(' · ');
  };
}

export function ProjectPicker({
  choices,
  includedIds,
  selections,
  expandedId,
  onIncludedChange,
  onExpand,
  onSelectionChange,
}: ProjectPickerProps) {
  const t = useTranslations('dialogs.exportSelection');
  const selectionSummary = useSelectionSummary();
  return (
    <div className="flex max-h-90 flex-col gap-1.5 overflow-auto">
      {choices.map((choice) => {
        const { summary, project, isOpen } = choice;
        const isIncluded = includedIds.has(summary.id);
        const isExpanded = expandedId === summary.id && isIncluded;
        const selection = selections[summary.id] ?? SELECT_ALL;
        return (
          <div key={summary.id} className={cn('rounded-md border border-border transition-colors', isIncluded && 'border-primary/50')}>
            <GroupRow
              label={t('project', { name: summary.name })}
              state={isIncluded ? 'all' : 'none'}
              onCheckedChange={(checked) => onIncludedChange(summary.id, checked)}
              isOpen={isExpanded}
              // Opening an unchecked project checks it
              onToggle={() => (isIncluded ? onExpand(isExpanded ? null : summary.id) : onIncludedChange(summary.id, true))}
              className="h-10 pl-2.5"
            >
              <span className={cn(treeRowSlots.label, 'font-medium')}>{summary.name}</span>
              {isOpen && (
                <Badge variant="outline" className="font-heading tracking-wider text-muted-foreground uppercase">
                  {t('open')}
                </Badge>
              )}
              <span className={treeRowSlots.count}>
                {isIncluded && !project ? <Spinner className="size-3.5" /> : selectionSummary(choice, selection, isIncluded)}
              </span>
            </GroupRow>
            {isExpanded && project && (
              <SelectionTree project={project} selection={selection} onChange={(next) => onSelectionChange(summary.id, next)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
