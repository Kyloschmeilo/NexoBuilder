/**
 * Paths in the item model tree as the editor uses them: the rows of the outline (every node with its depth), the slot
 * a node sits in (root, a branch, a case, an entry, a composite model, the fallback), and removing or moving a node
 * within its parent's list.
 */
import {
  type ConfigValue,
  itemModelChildren,
  type ItemModelNode,
  type ItemModelPath,
  updateItemModelAt,
} from '@resourcepackbuilder/core/project';

/** The lists whose entries hold child nodes. */
export type ChildListKey = 'cases' | 'entries' | 'models';

/** Where a node sits below its parent. */
export type NodeSlot =
  | { kind: 'root' }
  | { kind: 'branch'; parent: ItemModelPath; branch: 'on_true' | 'on_false' }
  | { kind: 'fallback'; parent: ItemModelPath }
  | {
      kind: 'case' | 'entry' | 'model';
      parent: ItemModelPath;
      list: ChildListKey;
      index: number;
      /** Path of the list entry: the case or entry object, or the composite's model itself. */
      entry: ItemModelPath;
    };

/** One row of the outline. */
export interface OutlineRow {
  path: ItemModelPath;
  node: ItemModelNode;
  /** 0 for the root. */
  depth: number;
}

/** The slot of the node at `path`. */
export function nodeSlot(path: ItemModelPath): NodeSlot {
  const last = path.at(-1);
  if (last === undefined) return { kind: 'root' };
  if (last === 'on_true' || last === 'on_false') return { kind: 'branch', parent: path.slice(0, -1), branch: last };
  if (last === 'fallback') return { kind: 'fallback', parent: path.slice(0, -1) };
  if (typeof last === 'number' && path.at(-2) === 'models') {
    return { kind: 'model', parent: path.slice(0, -2), list: 'models', index: last, entry: path };
  }
  const index = path.at(-2);
  const list = path.at(-3);
  if (last === 'model' && typeof index === 'number' && (list === 'cases' || list === 'entries')) {
    return { kind: list === 'cases' ? 'case' : 'entry', parent: path.slice(0, -3), list, index, entry: path.slice(0, -1) };
  }
  return { kind: 'root' };
}

/** Every node of the tree in display order (depth first, children in the order they show). */
export function outlineRows(root: ItemModelNode): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const walk = (node: ItemModelNode, path: ItemModelPath, depth: number) => {
    rows.push({ path, node, depth });
    for (const child of itemModelChildren(node)) walk(child.node, [...path, ...child.path], depth + 1);
  };
  walk(root, [], 0);
  return rows;
}

/** Whether two paths are the same. */
export const samePath = (a: ItemModelPath, b: ItemModelPath): boolean => a.length === b.length && a.every((step, i) => step === b[i]);

/** A stable string of a path (`model`, `model.cases.0.model`), for React keys and undo steps. */
export const pathKey = (path: ItemModelPath): string => ['model', ...path].join('.');

/** The list a slot's entry belongs to, or an empty one. */
function listAt(root: ItemModelNode, parent: ItemModelPath, list: ChildListKey): ConfigValue[] {
  let value: ConfigValue | undefined = root;
  for (const step of [...parent, list]) {
    if (typeof step === 'number') value = Array.isArray(value) ? value[step] : undefined;
    else value = value && typeof value === 'object' && !Array.isArray(value) ? value[step] : undefined;
  }
  return Array.isArray(value) ? value : [];
}

/** How many entries the list of a slot has (0 for slots outside a list). */
export function slotListLength(root: ItemModelNode, slot: NodeSlot): number {
  return 'list' in slot ? listAt(root, slot.parent, slot.list).length : 0;
}

/**
 * The tree without the node at `path`: a case, entry or composite model leaves its list, a branch or fallback its key.
 * The root cannot be removed (the tree is returned unchanged).
 */
export function removeNodeAt(root: ItemModelNode, path: ItemModelPath): ItemModelNode {
  const slot = nodeSlot(path);
  switch (slot.kind) {
    case 'root':
      return root;
    case 'branch':
    case 'fallback':
      return updateItemModelAt(root, path, () => undefined);
    default:
      return updateItemModelAt(root, slot.entry, () => undefined);
  }
}

/**
 * The tree with the list entry of the node at `path` moved to index `to` of its list, and the node's new path. Nodes
 * outside a list, and moves outside the list, leave the tree as it is.
 */
export function moveNodeAt(root: ItemModelNode, path: ItemModelPath, to: number): { root: ItemModelNode; path: ItemModelPath } {
  const slot = nodeSlot(path);
  if (!('list' in slot)) return { root, path };
  const list = listAt(root, slot.parent, slot.list);
  if (to < 0 || to >= list.length || to === slot.index) return { root, path };
  const next = [...list];
  const [entry] = next.splice(slot.index, 1);
  next.splice(to, 0, entry);
  const moved = updateItemModelAt(root, [...slot.parent, slot.list], () => next);
  const newPath = slot.kind === 'model' ? [...slot.parent, slot.list, to] : [...slot.parent, slot.list, to, 'model'];
  return { root: moved, path: newPath };
}
