/**
 * The outline of the item model tree: one row per node, indented by depth with guide lines, showing the slot it sits
 * in, its type and its own value, plus a warning or error mark when the export reported a problem for it. Clicking a
 * row (or moving with the arrow keys) selects the node, whose editor shows beside or below the outline.
 */
import { type KeyboardEvent, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, TriangleAlert } from 'lucide-react';
import type { ItemModelNode, ItemModelPath } from '@resourcepackbuilder/core/project';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Tip } from '@resourcepackbuilder/ui';
import { NodeIcon, NodeValue, useNodeSummary, useSlotLabel, useTypeLabel } from './nodeLabels';
import { outlineRows, pathKey, samePath } from './treePaths';
import { type NodeIssue, nodeIssueKey } from './useNodeIssues';

/** Indent per level, in px. */
const INDENT = 14;

interface TreeOutlineProps {
  root: ItemModelNode;
  selected: ItemModelPath;
  onSelect: (path: ItemModelPath) => void;
  /** The problems per node, by {@link nodeIssueKey}. */
  issues: ReadonlyMap<string, NodeIssue[]>;
}

/** The tree's nodes as a list of selectable rows. */
export function TreeOutline({ root, selected, onSelect, issues }: TreeOutlineProps) {
  const t = useTranslations('item');
  const slotLabel = useSlotLabel();
  const typeLabel = useTypeLabel();
  const summary = useNodeSummary();
  const listRef = useRef<HTMLUListElement>(null);
  const rows = outlineRows(root);
  const selectedIndex = Math.max(
    0,
    rows.findIndex((row) => samePath(row.path, selected)),
  );

  const focusRow = (index: number) => {
    const row = rows[index];
    if (!row) return;
    onSelect(row.path);
    listRef.current?.querySelectorAll<HTMLElement>('[role=treeitem]')[index]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (step !== undefined) focusRow(Math.min(rows.length - 1, Math.max(0, selectedIndex + step)));
    else if (e.key === 'Home') focusRow(0);
    else if (e.key === 'End') focusRow(rows.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <ul
      ref={listRef}
      role="tree"
      aria-label={t('modelTree.nodes')}
      data-slot="item-model-outline"
      className="m-0 flex min-w-0 list-none flex-col gap-px rounded-lg border border-line bg-surface-sunken p-1"
      onKeyDown={onKeyDown}
    >
      {rows.map((row, index) => {
        const isSelected = index === selectedIndex;
        const rowIssues = issues.get(nodeIssueKey(row.path)) ?? [];
        const worst = rowIssues.some((issue) => issue.level === 'error') ? 'error' : rowIssues.length > 0 ? 'warning' : null;
        const IssueIcon = worst === 'error' ? CircleAlert : TriangleAlert;
        const value = summary(row.node);
        return (
          <li
            key={pathKey(row.path)}
            role="treeitem"
            aria-level={row.depth + 1}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            data-path={pathKey(row.path)}
            onClick={() => onSelect(row.path)}
            className={cn(
              'relative flex min-h-8 min-w-0 cursor-pointer items-center gap-1.5 rounded-md pr-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected ? 'bg-accent-soft' : 'hover:bg-muted',
            )}
            style={{ paddingLeft: 6 + row.depth * INDENT }}
          >
            {Array.from({ length: row.depth }, (_, level) => (
              <span
                key={level}
                aria-hidden
                className="absolute inset-y-0 w-px bg-line"
                style={{ left: 6 + level * INDENT + INDENT / 2 - 1 }}
              />
            ))}
            <NodeIcon type={row.node.type} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-micro text-text-muted">{slotLabel(root, row.path)}</span>
              <span className={cn('truncate text-label', isSelected ? 'font-semibold text-text' : 'font-medium text-text')}>
                {typeLabel(row.node.type)}
                <NodeValue value={value} />
              </span>
            </span>
            {worst && (
              <Tip label={rowIssues.map((issue) => issue.message).join('\n')}>
                <span
                  role="img"
                  aria-label={rowIssues[0].message}
                  className={cn('inline-grid size-4 flex-none place-items-center', worst === 'error' ? 'text-danger' : 'text-warning')}
                >
                  <IssueIcon className="size-3.5" aria-hidden />
                </span>
              </Tip>
            )}
          </li>
        );
      })}
    </ul>
  );
}
