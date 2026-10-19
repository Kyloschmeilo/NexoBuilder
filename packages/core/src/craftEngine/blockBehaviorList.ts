/**
 * The block's behaviors as one list, the way the Block section shows them: the main behavior (`block.behavior`, the
 * one a preset set up together with its states) first, then the further behaviors (`block.behaviors`). Each entry
 * keeps a reference to where it lives in the YAML, so edits and removals write back to the same key. Adding a
 * behavior with a preset to a block without a main behavior applies the preset (states, support behaviors, drops);
 * every other behavior is appended to the further behaviors.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue } from '../project/types';
import { type ApplyBlockBehaviorOptions, applyBlockBehavior, blockBehaviorForm } from './blockBehaviors';

/** Where a behavior lives: the key it is written under and its index there (0 for a single behavior). */
export interface BlockBehaviorRef {
  key: 'behavior' | 'behaviors';
  index: number;
}

/** One behavior of the block's list. */
export interface BlockBehaviorEntry {
  ref: BlockBehaviorRef;
  /** The entry as it is in the YAML (normally `{ type, … }`) */
  entry: unknown;
  /** The type without a leading `!`, undefined for an entry without a type */
  type: string | undefined;
  /** The main behavior: the single `block.behavior` (a preset's behavior lives there) */
  main: boolean;
}

const asList = (value: unknown): unknown[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const typeOf = (entry: unknown) => (isPlainObject(entry) && typeof entry.type === 'string' ? entry.type : undefined);

/** The block's behaviors: the main behavior first, then the further ones. */
export function blockBehaviorEntries(block: Record<string, unknown>): BlockBehaviorEntry[] {
  const single = block.behavior !== undefined && !Array.isArray(block.behavior);
  return [
    ...asList(block.behavior).map((entry, index) => ({
      ref: { key: 'behavior' as const, index },
      entry,
      type: typeOf(entry),
      main: single,
    })),
    ...asList(block.behaviors).map((entry, index) => ({
      ref: { key: 'behaviors' as const, index },
      entry,
      type: typeOf(entry),
      main: false,
    })),
  ];
}

/** The behavior types the block has (each type is listed once). */
export function blockBehaviorTypes(block: Record<string, unknown>): string[] {
  return [...new Set(blockBehaviorEntries(block).flatMap((entry) => (entry.type ? [entry.type] : [])))];
}

/**
 * The block with the behavior at `ref` replaced by `entry`, or removed (`undefined`). A single behavior stays a
 * single object; a list that becomes empty is removed together with its key.
 */
export function withBlockBehavior(block: ConfigObject, ref: BlockBehaviorRef, entry: ConfigValue | undefined): ConfigObject {
  const value = block[ref.key];
  if (value === undefined) return block;
  const { [ref.key]: _old, ...rest } = block;
  if (!Array.isArray(value)) {
    if (ref.index !== 0) return block;
    return entry === undefined ? rest : { ...rest, [ref.key]: entry };
  }
  if (ref.index < 0 || ref.index >= value.length) return block;
  const list = entry === undefined ? value.filter((_, i) => i !== ref.index) : value.map((old, i) => (i === ref.index ? entry : old));
  return list.length === 0 ? rest : { ...rest, [ref.key]: list };
}

/** Whether adding a behavior of this type applies its preset: it has one and the block has no main behavior yet. */
export function addsBlockBehaviorPreset(block: Record<string, unknown>, type: string): boolean {
  return block.behavior === undefined && blockBehaviorForm(type) !== undefined;
}

/**
 * The block with a behavior of `type` added. A type the block already has is not added again. With a preset and no
 * main behavior, the preset sets up the main behavior, its states, support behaviors and drops (applyBlockBehavior,
 * which keeps the user's further behaviors and own states unless `replaceStates`); otherwise `{ type }` is appended to
 * the further behaviors.
 */
export function addBlockBehavior(
  block: ConfigObject,
  type: string,
  itemKey: string,
  singleState: ConfigObject,
  options?: ApplyBlockBehaviorOptions,
): ConfigObject {
  if (blockBehaviorTypes(block).includes(type)) return block;
  if (addsBlockBehaviorPreset(block, type)) return applyBlockBehavior(block, type, itemKey, singleState, options);
  return { ...block, behaviors: [...(asList(block.behaviors) as ConfigValue[]), { type }] };
}

/** Whether a further behavior may become the main one: the main behavior is missing or has no preset. */
export function canPromoteBlockBehavior(block: Record<string, unknown>): boolean {
  return blockBehaviorForm(typeOf(block.behavior)) === undefined;
}

/**
 * Makes a further behavior with a preset the main behavior: the preset sets up its states, support behaviors and
 * drops, and the keys the user set on the entry win over the preset's. A main behavior without a preset moves to the
 * further behaviors (applyBlockBehavior). Nothing changes for a main behavior, a type without a preset, or while the
 * main behavior has a preset of its own (it would be replaced).
 */
export function promoteBlockBehavior(
  block: ConfigObject,
  ref: BlockBehaviorRef,
  itemKey: string,
  singleState: ConfigObject,
  options?: ApplyBlockBehaviorOptions,
): ConfigObject {
  if (ref.key !== 'behaviors' || !canPromoteBlockBehavior(block)) return block;
  const entry = asList(block.behaviors)[ref.index];
  const type = typeOf(entry);
  if (!type || !isPlainObject(entry) || !blockBehaviorForm(type)) return block;
  const applied = applyBlockBehavior(withBlockBehavior(block, ref, undefined), type, itemKey, singleState, options);
  const main = isPlainObject(applied.behavior) ? applied.behavior : { type };
  return { ...applied, behavior: { ...main, ...(entry as ConfigObject) } };
}
