/**
 * The typed values of CraftEngine's attribute system (experimental), checked against the plugin's registries:
 * - attribute bases (`BaseValueSources`; 3): an attribute's `base` is a number or one of these objects,
 * - sync values (`SyncValueProviders`; 3): the `value` a `sync` entry writes is an expression or one of these,
 * - damage formulas (`DamageFormulas`; 3): a damage rule's `formula` is an expression or one of these,
 * - damage effects (`DamageEffects`; 3): the `effects` of a damage rule; each also takes `conditions` and `functions`.
 * No type is Premium only.
 */
import { field } from '../../form/build';
import { plainOptions } from '../../form/options';
import { logicCatalog } from './catalog';
import { functionList, gate, numberProvider, resource } from './shared';

/** A vanilla attribute id as the base sources read it (`minecraft:armor`) */
const vanillaAttribute = () => field.text({ format: 'resource', placeholder: true, scope: 'logic.shared.vanillaAttribute' });
/** An expression over `value` applied after reading */
const transform = () => field.text({ placeholder: true, help: true, scope: 'logic.shared.transform' });
const fallback = () => field.number({ help: true, scope: 'logic.shared.fallback' });

export const CE_ATTRIBUTE_BASES = logicCatalog('attributeBases', [
  { type: 'constant', fields: { value: field.number() } },
  {
    type: 'vanilla',
    fields: {
      attribute: vanillaAttribute(),
      fallback: fallback(),
      transform: transform(),
      update_interval: field.number({ integer: true, min: 1 }),
    },
  },
  { type: 'by_entity_type', fields: { attribute: vanillaAttribute(), fallback: fallback(), transform: transform() } },
]);

export const CE_ATTRIBUTE_SYNC_VALUES = logicCatalog('attributeSyncValues', [
  { type: 'expression', fields: { expression: field.text({ placeholder: true }) } },
  { type: 'delta' },
  { type: 'ratio' },
]);

export const CE_DAMAGE_FORMULAS = logicCatalog('damageFormulas', [
  { type: 'expression', fields: { expression: field.text({ placeholder: true }) } },
  { type: 'composition', fields: { parts: field.map(field.text({ placeholder: true }), { keyPlaceholder: true, newValue: () => '' }) } },
  { type: 'js', fields: { script: field.text({ placeholder: true }), function: field.text({ placeholder: true }), args: field.yaml() } },
]);

/** Fields every damage effect has: conditions checked first, functions run after it */
const effectGate = () => ({ conditions: gate(), functions: functionList() });

export const CE_DAMAGE_EFFECTS = logicCatalog('damageEffects', [
  { type: 'life_steal', fields: { ratio: numberProvider(), amount: numberProvider(), ...effectGate() } },
  {
    type: 'potion_effect',
    fields: {
      target: field.select(plainOptions(['victim', 'attacker', 'causing_entity', 'direct_entity'])),
      potion_effect: resource(),
      duration: numberProvider(),
      amplifier: numberProvider(),
      ambient: field.boolean(),
      particles: field.boolean(),
      show_icon: field.boolean(),
      ...effectGate(),
    },
  },
  { type: 'function', fields: effectGate() },
]);
