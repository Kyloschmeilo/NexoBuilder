/** Context frames ("where") of export issues; each code is a message key in the `issues` namespace. */
import { labelArg, type IssueContext, type IssueTarget } from '../issues';
import type { VariantDef } from '../nexo/variants';
import { itemLabel } from '../project/labels';
import type { Item, Project } from '../project/types';

export function itemTarget(item: Item): IssueTarget {
  return { kind: 'item', id: item.id };
}

export function itemFrame(item: Item): IssueContext {
  return { code: 'context.item', args: { item: itemLabel(item) } };
}

export function projectFrame(project: Project): IssueContext {
  return { code: 'context.project', args: { project: project.name } };
}

/** A configuration property; `label` is a message key in the `schema` namespace. */
export function propertyFrame(label: string): IssueContext {
  return { code: 'context.property', args: { property: labelArg(label) } };
}

/** A field inside a property; `label` is a message key in the `schema` namespace. */
export function fieldFrame(label: string): IssueContext {
  return { code: 'context.field', args: { field: labelArg(label) } };
}

/** Entry `index` (counted from 1) of a list. */
export function listEntryFrame(index: number): IssueContext {
  return { code: 'context.listEntry', args: { index } };
}

export function mapKeyFrame(key: string): IssueContext {
  return { code: 'context.mapKey', args: { key } };
}

/** A variant slot, or with `suffix` (the end of its path) one model of it. */
export function variantFrame(def: VariantDef, suffix?: string): IssueContext {
  const variant = labelArg(def.label, def.params);
  return suffix === undefined ? { code: 'context.variant', args: { variant } } : { code: 'context.variantModel', args: { variant, suffix } };
}

/** An armor layer; `label` is a message key in the `schema` namespace. */
export function armorLayerFrame(label: string): IssueContext {
  return { code: 'context.armorLayer', args: { layer: labelArg(label) } };
}
