/**
 * The field tree (fields.ts) as zod schemas. The field DSL stays the source for the UI (labels, help, options);
 * this module derives from it what a value of a field may be:
 *  - the leaf values pruning writes into the YAML (`NumberValue`, `BooleanValue`: numbers and booleans that were
 *    stored as text are converted, everything else of the wrong type is left out)
 *  - `fieldToSchema(field)`: the checks reported on export, with each ZodIssue path mapped to issue frames
 */
import { z } from 'zod';
import { fieldFrame, listEntryFrame, mapKeyFrame } from '../project/issueFrames';
import { labelArg, type IssueContext, type MessageArgs } from '@resourcepackbuilder/utils';
import { type Field, validateTextFormat } from './fields';

const NUMBER_TEXT = /^\s*-?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?\s*$/;

/** A number field's value: a finite number, or text holding one (from YAML or old data). */
export const NumberValue = z.union([z.number(), z.string().regex(NUMBER_TEXT).transform(Number).pipe(z.number())]);

/** A boolean field's value: a boolean, or the text "true"/"false". */
export const BooleanValue = z.union([
  z.boolean(),
  z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(['true', 'false']))
    .transform((text) => text === 'true'),
]);

/** What issues of a field check carry (the code is a message key in `issues`). */
interface FieldIssueParams {
  code: string;
  args?: MessageArgs;
}

function report(ctx: z.RefinementCtx, code: string, args?: MessageArgs): void {
  const params: FieldIssueParams = args ? { code, args } : { code };
  ctx.addIssue({ code: 'custom', message: code, params });
}

/** Unset values (undefined, null, blank text) are never reported – pruning removes them. */
const isUnset = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
const optionalField = (schema: z.ZodType) => z.preprocess((value) => (isUnset(value) ? undefined : value), schema.optional());

function textSchema(field: Extract<Field, { type: 'text' }>): z.ZodType {
  // Text fields also hold numbers or lists written via YAML – only text is checked against the format
  return z.unknown().superRefine((value, ctx) => {
    if (typeof value !== 'string') return;
    const error = validateTextFormat(field.format, value);
    if (error) report(ctx, 'plan.fieldFormat', { value, error: labelArg(error) });
  });
}

function numberSchema(field: Extract<Field, { type: 'number' }>): z.ZodType {
  return NumberValue.pipe(
    z.number().superRefine((value, ctx) => {
      if (field.min !== undefined && value < field.min) report(ctx, 'plan.fieldTooSmall', { value, min: field.min });
      if (field.max !== undefined && value > field.max) report(ctx, 'plan.fieldTooLarge', { value, max: field.max });
      if (field.integer && !Number.isInteger(value)) report(ctx, 'plan.fieldNotInteger');
    }),
  );
}

/** A text value that should be one of `options` (only checked when the field allows no custom values). */
function optionCheck(options: { value: string }[], allowCustom: boolean | undefined) {
  const values = new Set(options.map((o) => o.value));
  return (value: string, ctx: z.RefinementCtx) => {
    if (!allowCustom && value && !values.has(value)) report(ctx, 'plan.fieldNotAnOption', { value });
  };
}

/** A select value: text is checked against the options, other values written via YAML are kept as they are. */
function selectSchema(field: Extract<Field, { type: 'select' }>): z.ZodType {
  const check = optionCheck(field.options, field.allowCustom);
  return z.unknown().superRefine((value, ctx) => {
    if (typeof value === 'string') check(value, ctx);
  });
}

function objectSchema(fields: Field[], emptyValue?: true): z.ZodType {
  // Remaining keys ("*") and keys of no field are not checked
  const shape = Object.fromEntries(fields.filter((f) => f.key !== '*').map((f) => [f.key, fieldToSchema(f)]));
  const object = z.looseObject(shape);
  // `true` stands for the empty object (see ObjectField.emptyValue)
  return emptyValue ? z.preprocess((value) => (value === true ? {} : value), object) : object;
}

function buildSchema(field: Field): z.ZodType {
  switch (field.type) {
    case 'text':
      return textSchema(field);
    case 'number':
      return numberSchema(field);
    case 'boolean':
      return BooleanValue;
    case 'select':
      return selectSchema(field);
    case 'multiSelect':
      // Pruning keeps only the text entries of a list
      return z.array(z.string().superRefine(optionCheck(field.options, false)));
    case 'object':
      return objectSchema(field.fields, field.emptyValue);
    case 'objectList':
      return z.array(objectSchema(field.fields));
    case 'map': {
      const reserved = new Set(field.reservedKeys ?? []);
      const value = fieldToSchema(field.value);
      // Reserved keys belong to other fields of the same object
      return z
        .record(z.string(), z.unknown())
        .transform((map) => Object.fromEntries(Object.entries(map).filter(([key]) => !reserved.has(key))))
        .pipe(z.record(z.string(), value));
    }
    case 'stringList':
    case 'yaml':
    case 'presence':
    case 'texture':
      return z.unknown();
  }
}

const SCHEMAS = new WeakMap<Field, z.ZodType>();

/** The schema of a field's value (cached per field); unset values always pass. */
export function fieldToSchema(field: Field): z.ZodType {
  let schema = SCHEMAS.get(field);
  if (!schema) {
    schema = optionalField(buildSchema(field));
    SCHEMAS.set(field, schema);
  }
  return schema;
}

/** The field a path inside the value of `field` leads to, with the frames naming that place. */
function locate(field: Field, path: readonly PropertyKey[]): { field: Field; frames: IssueContext[] } {
  const frames: IssueContext[] = [];
  let current = field;
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    if (current.type === 'map') {
      frames.push(mapKeyFrame(String(segment)));
      current = current.value;
      continue;
    }
    let fields: Field[];
    if (current.type === 'objectList') {
      frames.push(listEntryFrame(Number(segment) + 1));
      if (++i >= path.length) break;
      fields = current.fields;
    } else if (current.type === 'object') {
      fields = current.fields;
    } else {
      break; // e.g. an entry of a multi-select list: reported at the field itself
    }
    const child = fields.find((f) => f.key === path[i]);
    if (!child) break;
    frames.push(fieldFrame(child.label));
    current = child;
  }
  return { field: current, frames };
}

export interface FieldValueIssue {
  code: string;
  args?: MessageArgs;
  /** Where inside the value: field labels, list positions and map keys */
  context: IssueContext[];
}

/** An issue zod itself raised (a value of the wrong type, which pruning leaves out). */
function typeIssue(field: Field, input: unknown, context: IssueContext[]): FieldValueIssue {
  const value = typeof input === 'string' || typeof input === 'number' ? input : JSON.stringify(input);
  if (field.type === 'number') return { code: 'plan.fieldNotANumber', args: { value }, context };
  if (field.type === 'boolean') return { code: 'plan.fieldNotABoolean', args: { value }, context };
  return { code: 'plan.fieldInvalidValue', context };
}

/** Checks a value of `field` (formats, number ranges, options, types) – the issues reported on export. */
export function checkFieldValue(value: unknown, field: Field): FieldValueIssue[] {
  const parsed = fieldToSchema(field).safeParse(value, { reportInput: true });
  return (parsed.error?.issues ?? []).map((issue) => {
    const { field: at, frames } = locate(field, issue.path);
    if (issue.code !== 'custom') return typeIssue(at, issue.input, frames);
    const { code, args } = issue.params as FieldIssueParams;
    return { code, ...(args && { args }), context: frames };
  });
}
