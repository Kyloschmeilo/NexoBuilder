/**
 * The one-line summary a collapsed feature row shows for its value ("On", "nutrition 4, saturation 2.4", "3 entries").
 * Pure: the words come in through {@link SummaryText}.
 */
import { type Field, findChoice } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';

/** The words of a summary, translated by the caller. */
export interface SummaryText {
  on: string;
  off: string;
  notSet: string;
  /** "3 entries" */
  entries: (count: number) => string;
  /** Translates an option label (a message key of the form). */
  option: (key: string) => string;
}

/** Object summaries name at most this many keys. */
const MAX_KEYS = 3;
/** Lists name at most this many values. */
const MAX_VALUES = 3;

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (isPlainObject(value) && Object.keys(value).length === 0);

/** A scalar as text (objects and lists are counted). */
function scalar(value: unknown, text: SummaryText): string {
  if (typeof value === 'boolean') return value ? text.on : text.off;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return text.entries(value.length);
  if (isPlainObject(value)) return text.entries(Object.keys(value).length);
  return text.notSet;
}

/** A list of values: the first few, then "+n". */
function list(values: unknown[], text: SummaryText): string {
  const shown = values.slice(0, MAX_VALUES).map((value) => scalar(value, text));
  return values.length > MAX_VALUES ? `${shown.join(', ')} +${values.length - MAX_VALUES}` : shown.join(', ');
}

/** The summary of a field's value; "Not set" for an empty value. */
export function featureSummary(field: Field, value: unknown, text: SummaryText): string {
  if (field.type === 'presence') return value === undefined ? text.notSet : text.on;
  if (isEmpty(value)) return field.type === 'object' && field.emptyValue && value !== undefined ? text.on : text.notSet;
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? (value ? text.on : text.off) : scalar(value, text);
    case 'select': {
      const option = field.options.find((o) => o.value === value);
      return option?.label ? text.option(option.label) : scalar(value, text);
    }
    case 'stringList':
    case 'multiSelect':
      return Array.isArray(value) ? list(value, text) : scalar(value, text);
    case 'object': {
      if (!isPlainObject(value)) return scalar(value, text);
      const parts = Object.entries(value)
        .filter(([, entry]) => !isEmpty(entry))
        .map(([key, entry]) => `${key} ${Array.isArray(entry) || isPlainObject(entry) ? scalar(entry, text) : String(entry)}`);
      if (!parts.length) return text.on;
      return parts.length > MAX_KEYS ? `${parts.slice(0, MAX_KEYS).join(', ')} +${parts.length - MAX_KEYS}` : parts.join(', ');
    }
    case 'choice': {
      const choice = findChoice(field, value);
      return choice ? featureSummary(choice.field, value, text) : scalar(value, text);
    }
    case 'objectList':
    case 'typedList':
      return Array.isArray(value) ? text.entries(value.length) : text.entries(1);
    case 'map':
      return isPlainObject(value) ? text.entries(Object.keys(value).length) : scalar(value, text);
    default:
      return scalar(value, text);
  }
}
