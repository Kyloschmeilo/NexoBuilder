/** The editor's paths in the item model tree: outline rows, slots, and removing and moving nodes. */
import { describe, expect, it } from 'vitest';
import type { ItemModelNode } from '@resourcepackbuilder/core/project';
import { moveNodeAt, nodeSlot, outlineRows, pathKey, removeNodeAt, samePath, slotListLength } from './treePaths';

const empty = (tag: string): ItemModelNode => ({ type: 'minecraft:model', model: tag });

/** A select with two cases and a fallback, whose first case holds a condition with both branches. */
function tree(): ItemModelNode {
  return {
    type: 'minecraft:select',
    property: 'minecraft:display_context',
    cases: [
      { when: 'gui', model: { type: 'minecraft:condition', property: 'minecraft:broken', on_true: empty('t'), on_false: empty('f') } },
      { when: ['head', 'fixed'], model: empty('b') },
    ],
    fallback: empty('fallback'),
  };
}

describe('item model tree paths', () => {
  it('lists every node depth first with its depth', () => {
    const rows = outlineRows(tree());
    expect(rows.map((row) => [pathKey(row.path), row.depth])).toEqual([
      ['model', 0],
      ['model.cases.0.model', 1],
      ['model.cases.0.model.on_true', 2],
      ['model.cases.0.model.on_false', 2],
      ['model.cases.1.model', 1],
      ['model.fallback', 1],
    ]);
  });

  it('names the slot of a node', () => {
    expect(nodeSlot([])).toEqual({ kind: 'root' });
    expect(nodeSlot(['cases', 1, 'model'])).toEqual({ kind: 'case', parent: [], list: 'cases', index: 1, entry: ['cases', 1] });
    expect(nodeSlot(['cases', 0, 'model', 'on_false'])).toEqual({ kind: 'branch', parent: ['cases', 0, 'model'], branch: 'on_false' });
    expect(nodeSlot(['entries', 2, 'model'])).toMatchObject({ kind: 'entry', index: 2, entry: ['entries', 2] });
    expect(nodeSlot(['models', 3])).toEqual({ kind: 'model', parent: [], list: 'models', index: 3, entry: ['models', 3] });
    expect(nodeSlot(['fallback'])).toEqual({ kind: 'fallback', parent: [] });
    expect(slotListLength(tree(), nodeSlot(['cases', 1, 'model']))).toBe(2);
    expect(slotListLength(tree(), nodeSlot(['fallback']))).toBe(0);
  });

  it('removes a case with its value, a branch or the fallback, but never the root', () => {
    expect(removeNodeAt(tree(), ['cases', 0, 'model']).cases).toEqual([{ when: ['head', 'fixed'], model: empty('b') }]);
    const withoutBranch = removeNodeAt(tree(), ['cases', 0, 'model', 'on_true']);
    expect(Object.keys((withoutBranch.cases as Array<{ model: ItemModelNode }>)[0].model)).not.toContain('on_true');
    expect(removeNodeAt(tree(), ['fallback'])).not.toHaveProperty('fallback');
    expect(removeNodeAt(tree(), [])).toEqual(tree());
  });

  it('moves a list entry and returns its new path', () => {
    const moved = moveNodeAt(tree(), ['cases', 1, 'model'], 0);
    expect((moved.root.cases as Array<{ when: unknown }>).map((c) => c.when)).toEqual([['head', 'fixed'], 'gui']);
    expect(moved.path).toEqual(['cases', 0, 'model']);
    const composite: ItemModelNode = { type: 'minecraft:composite', models: [empty('a'), empty('b'), empty('c')] };
    const next = moveNodeAt(composite, ['models', 0], 2);
    expect((next.root.models as ItemModelNode[]).map((m) => m.model)).toEqual(['b', 'c', 'a']);
    expect(next.path).toEqual(['models', 2]);
    // Outside the list, or a node that is not in a list: nothing changes
    expect(moveNodeAt(composite, ['models', 0], 3)).toEqual({ root: composite, path: ['models', 0] });
    expect(moveNodeAt(tree(), ['fallback'], 0).path).toEqual(['fallback']);
  });

  it('compares paths', () => {
    expect(samePath(['cases', 0, 'model'], ['cases', 0, 'model'])).toBe(true);
    expect(samePath(['cases', 0], ['cases', 0, 'model'])).toBe(false);
  });
});
