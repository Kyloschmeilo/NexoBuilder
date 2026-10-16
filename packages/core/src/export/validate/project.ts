/** Project-wide checks: namespace, pack settings, folder names and item IDs. */
import { isPngDataUrl, itemIdSyntaxError, namespaceError, PACK_NAME_PATTERN } from '@resourcepackbuilder/minecraft';
import { createIssue, issueReporter, type Issue, type IssueCode, type MessageArgs } from '@resourcepackbuilder/utils';
import { itemFrame, itemTarget } from '../../project/issueFrames';
import { itemLabel } from '../../project/item';
import { folderSlug } from '../../project/tree';
import type { Item, Project } from '../../project/types';

const NAMESPACE_ISSUES = {
  invalid: { level: 'error', code: 'plan.namespaceInvalid' },
  minecraft: { level: 'error', code: 'plan.namespaceMinecraft' },
  nexo: { level: 'warning', code: 'plan.namespaceNexo' },
} as const;

export function validateProjectSettings(project: Project): Issue[] {
  const issues: Issue[] = [];
  const nsError = namespaceError(project.namespace);
  if (nsError) {
    const { level, code } = NAMESPACE_ISSUES[nsError];
    issues.push(createIssue(level, code, { namespace: project.namespace }));
  }
  if (!PACK_NAME_PATTERN.test(project.settings.packName)) {
    issues.push(createIssue('error', 'plan.packNameInvalid', { name: project.settings.packName }));
  }
  if (project.settings.packIcon && !isPngDataUrl(project.settings.packIcon)) {
    issues.push(createIssue('warning', 'plan.packIconNotPng'));
  }
  return issues;
}

/** Sibling folders whose names give the same folder name in the export, and empty folders. */
export function validateFolders(project: Project): Issue[] {
  const issues: Issue[] = [];
  const visited = new Set<string>();
  const checkSiblings = (ids: string[]) => {
    const seen = new Map<string, string>();
    for (const id of ids) {
      const folder = project.folders[id];
      if (!folder || visited.has(id)) continue;
      visited.add(id);
      const slug = folderSlug(folder);
      const other = seen.get(slug);
      if (other) {
        const args = { first: project.folders[other].name, second: folder.name, slug };
        issues.push(createIssue('error', 'plan.folderSlugClash', args, { target: { kind: 'folder', id } }));
      } else {
        seen.set(slug, id);
      }
      checkSiblings(folder.folderIds);
    }
  };
  checkSiblings(project.rootFolderIds);
  for (const folder of Object.values(project.folders)) {
    if (folder.itemIds.length === 0 && folder.folderIds.length === 0) {
      issues.push(createIssue('info', 'plan.folderEmpty', { folder: folder.name }, { target: { kind: 'folder', id: folder.id } }));
    }
  }
  return issues;
}

/** Missing, invalid and duplicate item IDs (an empty ID is only reported as missing). */
export function validateItemIds(items: Item[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, Item>();
  for (const item of items) {
    const add = issueReporter(issues, { target: itemTarget(item), context: [itemFrame(item)] });
    const report = (code: IssueCode, args?: MessageArgs) => add('error', code, args);
    const syntax = itemIdSyntaxError(item.nexoId);
    if (syntax === 'missing') {
      report('plan.itemIdMissing');
      continue;
    }
    if (syntax === 'invalid') report('plan.itemIdInvalid', { id: item.nexoId });
    const other = seen.get(item.nexoId);
    if (other) report('plan.itemIdDuplicate', { id: item.nexoId, other: itemLabel(other) });
    else seen.set(item.nexoId, item);
  }
  return issues;
}
