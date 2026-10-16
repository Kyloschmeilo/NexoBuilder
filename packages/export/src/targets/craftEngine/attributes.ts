/**
 * Checks of CraftEngine's attribute system: the project's definitions, operations, equipment sets and damage rules,
 * and the modifiers and set pieces of the items. References are checked against the project's own entries; another
 * pack on the server may define them too, so unknown ones are warnings.
 */
import { isPlainObject, type Issue, type IssueContext, issueCode, issueReporter, type ReportIssue } from '@resourcepackbuilder/utils';
import {
  attributeEntryId,
  attributeEntryKey,
  attributeReference,
  CE_ATTRIBUTE_LISTS,
  CE_BUILTIN_ATTRIBUTE_OPERATIONS,
  CE_PROPERTIES,
  type AttributePart,
  projectAttributeEntries,
  projectAttributeKeys,
} from '@resourcepackbuilder/core/craftEngine';
import { checkFieldValue } from '@resourcepackbuilder/core/form';
import { attributeEntryFrame, listEntryFrame, mapKeyFrame, type Project, propertyFrame } from '@resourcepackbuilder/core/project';
import type { ItemExport } from '../../types';

type AttributeKeys = ReturnType<typeof projectAttributeKeys>;

/** A value CraftEngine's templates fill in (a `${argument}`) is only known once the template is applied. */
const isTemplated = (text: string) => text.includes('${');

const asList = (value: unknown): unknown[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Whether an operation id names a built-in operation or one of the project's. */
function knownOperation(keys: AttributeKeys, id: string): boolean {
  const key = attributeReference(id);
  return CE_BUILTIN_ATTRIBUTE_OPERATIONS.includes(key) || keys.operations.has(key);
}

/**
 * One modifier (of an item or an equipment set tier): CraftEngine needs its type, id, amount and operation (and the
 * slot on an item), and its attribute and operation should exist.
 */
function checkModifier(report: ReportIssue, modifier: unknown, keys: AttributeKeys, withSlot: boolean, frames: IssueContext[]): void {
  if (!isPlainObject(modifier)) return;
  for (const key of ['type', 'id', 'amount', 'operation', ...(withSlot ? ['slot'] : [])]) {
    const value = modifier[key];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      report('error', 'ce.attributeModifierFieldMissing', { field: key }, frames);
    }
  }
  const type = text(modifier.type);
  if (type && !isTemplated(type) && !keys.attributes.has(attributeReference(type))) {
    report('warning', 'ce.attributeUnknown', { attribute: attributeReference(type) }, frames);
  }
  const operation = text(modifier.operation);
  if (operation && !isTemplated(operation) && !knownOperation(keys, operation)) {
    report('warning', 'ce.attributeOperationUnknown', { operation: attributeReference(operation) }, frames);
  }
}

const PART_FRAMES = {
  definitions: 'attribute',
  operations: 'attributeOperation',
  equipmentSets: 'equipmentSet',
  damageRules: 'damageRule',
} as const satisfies Record<AttributePart, string>;

/**
 * The project's attribute system: definitions, operations and equipment sets each need an id of their own, an
 * attribute only names operations that exist and bounds both ends of a constraint, an operation has an expression, a
 * set has tiers by positive piece counts with complete modifiers, and a damage rule has a damage type and a formula or
 * effects. The values of all fields are checked through their lists' fields.
 */
export function attributeProjectIssues(project: Project): Issue[] {
  const issues: Issue[] = [];
  const keys = projectAttributeKeys(project);
  for (const part of Object.keys(PART_FRAMES) as AttributePart[]) {
    const taken = new Set<string>();
    projectAttributeEntries(project, part).forEach((entry, i) => {
      const id = part === 'damageRules' ? text(entry.damage_type) : attributeEntryId(entry);
      const report = issueReporter(issues, { context: [attributeEntryFrame(PART_FRAMES[part], id, i + 1)] });
      if (part === 'damageRules') {
        if (!id) report('error', 'ce.damageRuleTypeMissing');
        if (entry.formula === undefined && entry.effects === undefined) report('error', 'ce.damageRuleEmpty');
      } else if (!id) {
        report('error', 'ce.attributeEntryIdMissing');
      } else {
        const key = attributeEntryKey(project, id);
        if (taken.has(key)) report('error', 'ce.attributeEntryIdDuplicate', { id: key });
        taken.add(key);
      }
      if (part === 'definitions') checkDefinition(report, entry, keys);
      if (part === 'operations' && !text(entry.expression)) report('error', 'ce.attributeOperationExpressionMissing');
      if (part === 'equipmentSets') checkEquipmentSet(report, entry, keys);
      // The frame of the list entry is replaced by that of the entry
      for (const found of checkFieldValue([entry], CE_ATTRIBUTE_LISTS[part])) {
        report('warning', issueCode(found.code), found.args, found.context.slice(1));
      }
    });
  }
  return issues;
}

function checkDefinition(report: ReportIssue, entry: Record<string, unknown>, keys: AttributeKeys): void {
  for (const operation of asList(entry.operations)) {
    const id = text(operation);
    if (id && !isTemplated(id) && !knownOperation(keys, id)) {
      report('warning', 'ce.attributeOperationUnknown', { operation: attributeReference(id) });
    }
  }
  // With a constraint, CraftEngine takes a missing min as the smallest positive number (no negative values)
  const constraint = entry.constraint;
  if (isPlainObject(constraint) && (constraint.min === undefined) !== (constraint.max === undefined)) {
    report('warning', 'ce.attributeConstraintOneSided');
  }
}

function checkEquipmentSet(report: ReportIssue, entry: Record<string, unknown>, keys: AttributeKeys): void {
  const pieces = entry.pieces;
  if (!isPlainObject(pieces) || Object.keys(pieces).length === 0) {
    report('error', 'ce.equipmentSetPiecesMissing');
    return;
  }
  for (const [tier, value] of Object.entries(pieces)) {
    if (!/^[1-9]\d*$/.test(tier.trim())) report('error', 'ce.equipmentSetTierInvalid', { tier });
    if (!isPlainObject(value)) continue;
    asList(value.attribute).forEach((modifier, i) => {
      checkModifier(report, modifier, keys, false, [mapKeyFrame(tier), listEntryFrame(i + 1)]);
    });
  }
}

const MODIFIERS_PROPERTY = CE_PROPERTIES.find((p) => p.id === 'settings.attribute_modifiers');
const SET_PART_PROPERTY = CE_PROPERTIES.find((p) => p.id === 'settings.equipment_set_part');

/**
 * An item's part in the attribute system as the export writes it: its modifiers are complete and name attributes and
 * operations that exist, the sets it is a piece of exist.
 */
export function validateCraftEngineAttributes(itemExport: ItemExport, config: Record<string, unknown>): void {
  const settings = config.settings;
  if (!isPlainObject(settings)) return;
  const keys = projectAttributeKeys(itemExport.project);
  if (MODIFIERS_PROPERTY && settings.attribute_modifiers !== undefined) {
    const frame = propertyFrame(MODIFIERS_PROPERTY.label);
    asList(settings.attribute_modifiers).forEach((modifier, i) => {
      checkModifier(itemExport.report, modifier, keys, true, [frame, listEntryFrame(i + 1)]);
    });
  }
  if (SET_PART_PROPERTY && settings.equipment_set_part !== undefined) {
    const frame = propertyFrame(SET_PART_PROPERTY.label);
    for (const part of asList(settings.equipment_set_part)) {
      if (!isPlainObject(part)) continue;
      for (const set of asList(part.sets)) {
        const id = text(set);
        if (id && !isTemplated(id) && !keys.equipmentSets.has(attributeReference(id))) {
          itemExport.report('warning', 'ce.equipmentSetUnknown', { set: attributeReference(id) }, [frame]);
        }
      }
    }
  }
}
