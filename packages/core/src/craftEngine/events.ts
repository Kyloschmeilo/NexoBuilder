/**
 * CraftEngine events: what an item, a block or a furniture runs when a trigger fires. CraftEngine reads them from
 * `event(s)` at the root of each definition (AbstractItemManager, AbstractBlockManager, AbstractFurnitureManager),
 * in two forms (CommonFunctions.parseEvents):
 *  - the list form the editor and the export write: `- { on: right_click, conditions: […], functions: […] }`, where
 *    `on` may also be a list of triggers and an entry may be a single function (`type` instead of `functions`);
 *  - the map form `right_click: [functions]`, which the export turns into the list form.
 * The export writes the item's events in its own entry and those of its block or furniture under `blocks:` or
 * `furniture:`, so each sits at the root of its definition.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject } from '../project/types';
import { craftEngineBlock } from './block';
import { craftEngineFurniture } from './furniture';
import type { LogicObjectKind } from './logic';

/** The keys CraftEngine reads events from, in the order it tries them (`event(s)`) */
const EVENT_KEYS = ['event', 'events'] as const;
/** Order of the keys of an event in the list form */
const EVENT_ORDER = ['on', 'conditions', 'functions'];

/** The property (and config path) of each object's events in the editor */
export const CE_EVENT_PROPERTY_IDS: Record<LogicObjectKind, string> = {
  item: 'events',
  block: 'block.events',
  furniture: 'furniture.events',
};

/** The event properties an item can use: its own, and those of the block or furniture it places. */
export function eventPropertyIds(config: ConfigObject): string[] {
  const ids = [CE_EVENT_PROPERTY_IDS.item];
  if (craftEngineBlock(config)) ids.push(CE_EVENT_PROPERTY_IDS.block);
  else if (craftEngineFurniture(config)) ids.push(CE_EVENT_PROPERTY_IDS.furniture);
  return ids;
}

/**
 * Events in the list form: a map `trigger: functions` becomes one event per trigger (a single function counts as a
 * list of one), keeping the order; the keys of a listed event are ordered `on`, `conditions`, `functions`. Any other
 * value is returned as it is (the export reports it).
 */
export function eventList(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((event) => (isPlainObject(event) ? orderedEvent(event) : event));
  if (!isPlainObject(value)) return value;
  return Object.entries(value).map(([on, functions]) => ({
    on,
    functions: Array.isArray(functions) ? functions : functions === null || functions === undefined ? [] : [functions],
  }));
}

function orderedEvent(event: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of EVENT_ORDER) if (event[key] !== undefined) result[key] = event[key];
  return { ...result, ...event };
}

/** A copy of a definition (item, block, furniture) with its events in the list form, each key where it was. */
export function withEventList<T extends Record<string, unknown>>(definition: T): T {
  const result: Record<string, unknown> = { ...definition };
  for (const key of EVENT_KEYS) if (result[key] !== undefined && result[key] !== null) result[key] = eventList(result[key]);
  return result as T;
}

/** The events CraftEngine reads from a definition (`event` before `events`), undefined without any. */
export function definitionEvents(definition: Record<string, unknown>): unknown {
  return definition.event ?? definition.events ?? undefined;
}
