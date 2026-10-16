/** The message keys a form references, for the tests that check them against the catalogues. */
import type { Field } from './fields';
import type { Option } from './options';
import type { FormSchema } from './types';

export function optionMessageKeys(list: Option[] | undefined): string[] {
  return (list ?? []).flatMap((o) => (o.label ? [o.label] : []));
}

/** All message keys a field (and its nested fields) references. */
export function fieldMessageKeys(field: Field): string[] {
  const keys = [field.label, field.help, field.placeholder].filter((k): k is string => !!k);
  if ('suggestions' in field) keys.push(...optionMessageKeys(field.suggestions));
  switch (field.type) {
    case 'select':
    case 'multiSelect':
      keys.push(...optionMessageKeys(field.options));
      break;
    case 'object':
      keys.push(...field.fields.flatMap(fieldMessageKeys));
      break;
    case 'objectList':
      keys.push(field.itemLabel, ...field.fields.flatMap(fieldMessageKeys));
      break;
    case 'map':
      keys.push(field.keyLabel, ...optionMessageKeys(field.keyOptions), ...fieldMessageKeys(field.value));
      if (field.keyPlaceholder) keys.push(field.keyPlaceholder);
      break;
  }
  return keys;
}

/** The keys of the groups and properties of a form, in its `messages` namespace. */
export function formMessageKeys(schema: FormSchema): string[] {
  const keys: string[] = [];
  for (const group of schema.groups) keys.push(group.label, group.description);
  for (const property of schema.properties) {
    keys.push(property.label, property.description, ...fieldMessageKeys(property.field));
    if (property.hint) keys.push(property.hint);
  }
  return keys;
}
