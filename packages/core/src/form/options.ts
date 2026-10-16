/** Options of select fields. The lists themselves belong to a target (e.g. nexo/form/options.ts). */
import { keySegment } from '@resourcepackbuilder/utils';

export interface Option {
  value: string;
  /** Message key in the form's namespace; without a label the value itself is shown */
  label?: string;
}

/** Options shown as their value. */
export const plainOptions = (values: readonly string[]): Option[] => values.map((value) => ({ value }));

/** Options labeled by the message keys `<scope>.<camel(value)>.label` in the form's namespace. */
export const labeledOptions = (scope: string, values: string[]): Option[] =>
  values.map((value) => ({ value, label: `${scope}.${keySegment(value)}.label` }));
