/**
 * The event triggers (`EventTrigger`, checked against the plugin's registry; 12) with the objects that fire them,
 * taken from where the plugin runs each trigger's functions. `fall` is registered but nothing fires it. Besides the
 * aliases, each object kind reads `break` as its own break trigger. No trigger is Premium only.
 */
import { categorized, logicCatalog, type LogicObjectKind, type LogicType } from './catalog';

/** The catalog categories (`logic.categories.triggers.<category>`) and the triggers listed under each */
const CATEGORIES = {
  clicks: ['right_click', 'left_click', 'attack'],
  use: ['consume', 'pick_up', 'shoot'],
  breaking: ['item_break', 'block_break', 'furniture_break'],
  world: ['place', 'step', 'fall'],
};

export const CE_TRIGGERS = logicCatalog(
  'triggers',
  categorized(
    [
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
    ],
    CATEGORIES,
  ),
);

/** The triggers an object kind fires, in catalog order. */
export const triggersFor = (kind: LogicObjectKind) => CE_TRIGGERS.filter((t) => t.objectKinds?.includes(kind));

/** The trigger each object kind reads `break` as (the alias its manager's EventTriggerResolver adds). */
const BREAK_TRIGGER: Record<LogicObjectKind, string> = { item: 'item_break', block: 'block_break', furniture: 'furniture_break' };

/**
 * The trigger a name in an event's `on` stands for, as CraftEngine resolves it (EventTrigger.byId): in any case, by
 * its id (with or without the `craftengine` namespace) or an alias; `break` is the object kind's own break trigger.
 * Undefined for a name CraftEngine does not know.
 */
export function resolveTrigger(name: string, kind: LogicObjectKind): LogicType | undefined {
  const id = name.trim().toLowerCase();
  if (id === 'break') return CE_TRIGGERS.find((t) => t.type === BREAK_TRIGGER[kind]);
  const plain = id.startsWith('craftengine:') ? id.slice('craftengine:'.length) : id;
  return CE_TRIGGERS.find((t) => t.type === plain) ?? CE_TRIGGERS.find((t) => t.aliases?.includes(id));
}
