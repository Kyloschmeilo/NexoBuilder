/**
 * The event triggers (`EventTrigger`, checked against the plugin's registry; 12) with the objects that fire them,
 * taken from where the plugin runs each trigger's functions. `fall` is registered but nothing fires it. Besides the
 * aliases, each object kind reads `break` as its own break trigger. No trigger is Premium only.
 */
import { logicCatalog } from './catalog';

export const CE_TRIGGERS = logicCatalog('triggers', [
  { type: 'right_click', objectKinds: ['item', 'block', 'furniture'], aliases: ['use_on', 'use', 'use_item_on'] },
  { type: 'left_click', objectKinds: ['item', 'block', 'furniture'] },
  { type: 'attack', objectKinds: ['item'], aliases: ['hit'] },
  { type: 'consume', objectKinds: ['item'], aliases: ['eat', 'drink'] },
  { type: 'pick_up', objectKinds: ['item'], aliases: ['pick'] },
  { type: 'shoot', objectKinds: ['item'] },
  { type: 'item_break', objectKinds: ['item'] },
  { type: 'block_break', objectKinds: ['item', 'block'], aliases: ['dig'] },
  { type: 'place', objectKinds: ['block', 'furniture'], aliases: ['build'] },
  { type: 'step', objectKinds: ['block'] },
  { type: 'furniture_break', objectKinds: ['furniture'] },
  { type: 'fall', objectKinds: [] },
]);

/** The triggers an object kind fires, in catalog order. */
export const triggersFor = (kind: 'item' | 'block' | 'furniture') => CE_TRIGGERS.filter((t) => t.objectKinds?.includes(kind));
