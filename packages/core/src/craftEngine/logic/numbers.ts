/**
 * The number provider types (`NumberProviders`, checked against the plugin's registry; 13). A number provider is
 * written as a number, as text (`1~3` is a uniform range, other text an expression) or as one of these typed objects.
 * No type is Premium only.
 */
import { field } from '../../form/build';
import { categorized, logicCatalog } from './catalog';
import { numberProvider } from './shared';

const bound = () => field.number();
const attempts = () => field.number({ integer: true, min: 1, help: true, scope: 'logic.shared.maxAttempts' });

/** The catalog categories (`logic.categories.numbers.<category>`) and the types listed under each */
const CATEGORIES = {
  fixed: ['constant', 'fixed', 'expression'],
  ranges: ['uniform', 'triangle', 'binomial', 'weighted'],
  distributions: ['normal', 'gaussian', 'log_normal', 'skew_normal', 'exponential', 'beta'],
};

export const CE_NUMBERS = logicCatalog(
  'numbers',
  categorized(
    [
      { type: 'constant', fields: { value: field.text() } },
      { type: 'fixed', fields: { value: field.text() } },
      { type: 'uniform', fields: { min: numberProvider(), max: numberProvider() } },
      { type: 'expression', fields: { expression: field.text({ placeholder: true }) } },
      { type: 'normal', fields: { min: bound(), max: bound(), mean: field.number(), std_dev: field.number(), max_attempts: attempts() } },
      { type: 'gaussian', fields: { min: bound(), max: bound(), mean: field.number(), std_dev: field.number(), max_attempts: attempts() } },
      {
        type: 'log_normal',
        fields: {
          min: bound(),
          max: bound(),
          mean: field.number(),
          std_dev: field.number(),
          location: field.number(),
          scale: field.number(),
          max_attempts: attempts(),
        },
      },
      {
        type: 'skew_normal',
        fields: {
          min: bound(),
          max: bound(),
          mean: field.number(),
          std_dev: field.number(),
          skewness: field.number(),
          max_attempts: attempts(),
        },
      },
      { type: 'binomial', fields: { extra: numberProvider(), probability: numberProvider() } },
      { type: 'weighted', fields: { weights: field.map(field.number({ min: 0 }), { keyPlaceholder: true, help: true }) } },
      { type: 'triangle', fields: { min: bound(), max: bound(), mode: field.number() } },
      {
        type: 'exponential',
        fields: { min: bound(), max: bound(), mean: field.number(), lambda: field.number(), max_attempts: attempts() },
      },
      { type: 'beta', fields: { min: bound(), max: bound(), alpha: field.number(), beta: field.number() } },
    ],
    CATEGORIES,
  ),
);
