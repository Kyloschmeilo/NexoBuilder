/**
 * Checks an item model tree against the catalog, for both targets: unknown types and properties, keys Minecraft
 * needs, branches without a model, select cases without or with duplicate values, thresholds that are no numbers,
 * the item's own model (`@model`) without one, and features the project's Minecraft version does not have yet (or
 * no longer has). Each issue names the node by its path (the `context.itemModelNode` frame).
 */
import { compareVersions } from '@resourcepackbuilder/minecraft';
import {
  isPlainObject,
  type IssueCode,
  type IssueContext,
  type IssueLevel,
  type MessageArgs,
  MODEL_TOKEN,
} from '@resourcepackbuilder/utils';
import type { ConfigValue } from '../types';
import {
  fullId,
  ITEM_MODEL_ROOT_VERSIONS,
  ITEM_MODEL_TRANSFORMATION_VERSION,
  itemModelProperty,
  itemModelSpecialType,
  itemModelTintType,
  itemModelTypeDef,
  shortId,
  type ItemModelParam,
  type ItemModelVariantDef,
} from './catalog';
import { itemModelChildren } from './tree';
import { ITEM_MODEL_ROOT_KEYS, type ItemModelDefinition, type ItemModelNode, type ItemModelPath } from './types';

/** An issue of a tree: level, code (`issues` namespace) and the frame of the node it is about. */
export interface ItemModelIssue {
  level: IssueLevel;
  code: IssueCode;
  args?: MessageArgs;
  context: IssueContext[];
}

/** What the validation needs to know about the item and its project. */
export interface ItemModelValidationContext {
  /** The project's Minecraft version */
  minecraftVersion: string;
  /** Whether the item has a main model for `@model` to stand for */
  hasMainModel: boolean;
}

/** A path as the issue shows it: `model › cases[1] › model` (`model` for the root node). */
export function formatItemModelPath(path: ItemModelPath): string {
  if (path.length === 0) return 'model';
  const parts: string[] = [];
  for (const step of path) {
    if (typeof step === 'number') parts[parts.length - 1] = `${parts[parts.length - 1]}[${step}]`;
    else parts.push(step);
  }
  return ['model', ...parts].join(' › ');
}

const isEmpty = (value: ConfigValue | undefined) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/** Checks a whole definition. */
export function validateItemModelDefinition(definition: ItemModelDefinition, context: ItemModelValidationContext): ItemModelIssue[] {
  const issues: ItemModelIssue[] = [];
  const atLeast = (version: string) => compareVersions(context.minecraftVersion, version) >= 0;
  const report = (path: ItemModelPath, level: IssueLevel, code: IssueCode, args?: MessageArgs) =>
    issues.push({
      level,
      code,
      ...(args && { args }),
      context: [{ code: 'context.itemModelNode', args: { path: formatItemModelPath(path) } }],
    });

  /** A feature (property, special model, tint source or key) the project's version does not have, or no longer has. */
  const checkVersion = (path: ItemModelPath, feature: string, minVersion?: string, removedIn?: string) => {
    if (minVersion && !atLeast(minVersion))
      report(path, 'warning', 'plan.itemModelNeedsVersion', { feature, version: minVersion, target: context.minecraftVersion });
    if (removedIn && atLeast(removedIn)) report(path, 'warning', 'plan.itemModelRemoved', { feature, version: removedIn });
  };

  /** The keys a variant (property, special model, tint source) needs, and the version of each key that is set. */
  const checkParams = (path: ItemModelPath, owner: Record<string, ConfigValue>, params: ItemModelParam[]) => {
    for (const param of params) {
      const value = owner[param.key];
      if (param.required && isEmpty(value)) report(path, 'error', 'plan.itemModelMissingKey', { key: param.key });
      else if (value !== undefined) checkVersion(path, param.key, param.minVersion);
    }
  };

  const checkVariant = (path: ItemModelPath, owner: Record<string, ConfigValue>, id: string, def: ItemModelVariantDef | undefined) => {
    if (!def) {
      report(path, 'warning', 'plan.itemModelUnknownVariant', { id });
      return;
    }
    checkVersion(path, shortId(def.id), def.minVersion, def.removedIn);
    checkParams(path, owner, def.params);
  };

  const checkRef = (path: ItemModelPath, key: string, value: ConfigValue | undefined) => {
    if (isEmpty(value)) report(path, 'error', 'plan.itemModelMissingKey', { key });
    else if (value === MODEL_TOKEN && !context.hasMainModel) report(path, 'error', 'plan.itemModelMainModelMissing');
  };

  /** A slot that must hold a node (a branch of a condition, the model of a case or an entry). */
  const checkSlot = (path: ItemModelPath, value: ConfigValue | undefined, key: string) => {
    if (!isPlainObject(value) || typeof value.type !== 'string') report(path, 'error', 'plan.itemModelMissingBranch', { branch: key });
  };

  const visit = (node: ItemModelNode, path: ItemModelPath) => {
    const type = fullId(node.type);
    const def = itemModelTypeDef(type);
    if (!def) {
      report(path, 'warning', 'plan.itemModelUnknownType', { type: node.type });
      return;
    }
    if (node.transformation !== undefined) {
      if (!def.transformation) report(path, 'warning', 'plan.itemModelTransformationIgnored', { type: shortId(type) });
      else checkVersion(path, 'transformation', ITEM_MODEL_TRANSFORMATION_VERSION);
    }
    for (const param of def.params) {
      if (param.kind === 'resource') checkRef(path, param.key, node[param.key]);
    }
    if (def.property) {
      const property = node.property;
      if (typeof property !== 'string' || property.trim() === '') report(path, 'error', 'plan.itemModelMissingKey', { key: 'property' });
      else checkVariant(path, node, property, itemModelProperty(def.property, property));
    }
    switch (type) {
      case 'minecraft:model': {
        const tints = node.tints;
        if (Array.isArray(tints)) {
          tints.forEach((tint, i) => {
            const tintPath = [...path, 'tints', i];
            if (!isPlainObject(tint) || typeof tint.type !== 'string')
              report(tintPath, 'error', 'plan.itemModelMissingKey', { key: 'type' });
            else checkVariant(tintPath, tint, tint.type, itemModelTintType(tint.type));
          });
        }
        break;
      }
      case 'minecraft:composite':
        if (!Array.isArray(node.models) || node.models.length === 0) report(path, 'warning', 'plan.itemModelEmptyList', { key: 'models' });
        break;
      case 'minecraft:condition':
        checkSlot([...path, 'on_true'], node.on_true, 'on_true');
        checkSlot([...path, 'on_false'], node.on_false, 'on_false');
        break;
      case 'minecraft:select': {
        const cases = Array.isArray(node.cases) ? node.cases : [];
        if (cases.length === 0) report(path, 'warning', 'plan.itemModelEmptyList', { key: 'cases' });
        const seen = new Set<string>();
        cases.forEach((entry, i) => {
          const casePath = [...path, 'cases', i];
          const when = isPlainObject(entry) ? entry.when : undefined;
          const values = (Array.isArray(when) ? when : when === undefined ? [] : [when]).map((v) => String(v));
          if (values.length === 0 || values.some((v) => v.trim() === '')) report(casePath, 'error', 'plan.itemModelCaseWithoutWhen');
          for (const value of values) {
            if (seen.has(value)) report(casePath, 'error', 'plan.itemModelDuplicateWhen', { value });
            seen.add(value);
          }
          checkSlot([...casePath, 'model'], isPlainObject(entry) ? entry.model : undefined, 'model');
        });
        break;
      }
      case 'minecraft:range_dispatch': {
        const entries = Array.isArray(node.entries) ? node.entries : [];
        if (entries.length === 0) report(path, 'warning', 'plan.itemModelEmptyList', { key: 'entries' });
        entries.forEach((entry, i) => {
          const entryPath = [...path, 'entries', i];
          const threshold = isPlainObject(entry) ? entry.threshold : undefined;
          if (typeof threshold !== 'number' || !Number.isFinite(threshold)) report(entryPath, 'error', 'plan.itemModelThresholdInvalid');
          checkSlot([...entryPath, 'model'], isPlainObject(entry) ? entry.model : undefined, 'model');
        });
        if (node.scale !== undefined && typeof node.scale !== 'number') report(path, 'error', 'plan.itemModelNotANumber', { key: 'scale' });
        break;
      }
      case 'minecraft:special': {
        const special = node.model;
        if (!isPlainObject(special) || typeof special.type !== 'string')
          report(path, 'error', 'plan.itemModelMissingKey', { key: 'model' });
        else checkVariant([...path, 'model'], special, special.type, itemModelSpecialType(special.type));
        break;
      }
    }
    for (const child of itemModelChildren(node)) visit(child.node, [...path, ...child.path]);
  };

  visit(definition.model, []);
  for (const key of ITEM_MODEL_ROOT_KEYS) {
    const version = ITEM_MODEL_ROOT_VERSIONS[key];
    if (definition[key] !== undefined && version) checkVersion([], key, version);
  }
  return issues;
}
