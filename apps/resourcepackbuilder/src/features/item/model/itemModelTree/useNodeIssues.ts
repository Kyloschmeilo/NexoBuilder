/** The export's problems with the item's model tree, grouped by the node they name. */
import { useMemo } from 'react';
import { formatItemModelPath, type ItemModelPath } from '@resourcepackbuilder/core/project';
import { type IssueLevel, issuesFor } from '@resourcepackbuilder/utils';
import { useRenderMessage } from '../../../../i18n/errors';
import { usePlan } from '../../../../shell/PlanProvider';

/** One problem of a node, translated. */
export interface NodeIssue {
  level: IssueLevel;
  message: string;
}

/** The key a node's problems are stored under (the path as the issues name it, `model › cases[0] › model`). */
export const nodeIssueKey = (path: ItemModelPath): string => formatItemModelPath(path);

/** Context frame that names the node of a tree problem. */
const NODE_FRAME = 'context.itemModelNode';

/** The item's tree problems (from the last export plan) by {@link nodeIssueKey}; info notes are left out. */
export function useNodeIssues(itemId: string): ReadonlyMap<string, NodeIssue[]> {
  const plan = usePlan();
  const render = useRenderMessage();
  return useMemo(() => {
    const byNode = new Map<string, NodeIssue[]>();
    if (!plan) return byNode;
    for (const issue of issuesFor(plan.issues, { kind: 'item', id: itemId })) {
      const frame = issue.context?.find((f) => f.code === NODE_FRAME);
      const path = frame?.args?.path;
      if (typeof path !== 'string' || issue.level === 'info') continue;
      const list = byNode.get(path) ?? [];
      list.push({ level: issue.level, message: render(issue.code, issue.args) });
      byNode.set(path, list);
    }
    return byNode;
  }, [plan, itemId, render]);
}
