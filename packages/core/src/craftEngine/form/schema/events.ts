import { field, properties } from '../../../form/build';
import { CE_EVENT_PROPERTY_IDS } from '../../events';
import type { LogicObjectKind } from '../../logic/catalog';
import { conditionList, functionList } from '../../logic/shared';
import { triggersFor } from '../../logic/triggers';
import { CE_DOCS } from './docs';

/** A new event: a right click (which items, blocks and furniture all fire) */
const newEvent = () => ({ on: 'right_click' });

/**
 * The events of an object kind in the list form (events.ts): the trigger, offered from those the kind fires (others
 * stay as written, the export reports them), the conditions and the functions. The three properties share their
 * field messages (`events.*`). The editor shows each event as a card of its trigger (`typedBy`).
 */
const events = (kind: LogicObjectKind) =>
  field.objectList(
    {
      on: field.select(
        triggersFor(kind).map((t) => ({ value: t.type, label: t.label })),
        { allowCustom: true, name: 'on' },
      ),
      conditions: { ...conditionList(), name: 'conditions', help: true },
      functions: { ...functionList(), name: 'functions', help: true },
    },
    { scope: 'events', titleKey: 'on', newItem: newEvent, typedBy: { key: 'on', catalog: 'triggers', types: () => triggersFor(kind) } },
  );

/**
 * The events of the item, of its block and of its furniture (`events` at the root of each definition, checked
 * against the managers of the 26.9 plugin). The Events tab shows the block's and the furniture's only while the item
 * places one (eventPropertyIds).
 */
export const CE_EVENT_PROPERTIES = properties(
  'events',
  Object.fromEntries(
    (['item', 'block', 'furniture'] as const).map((kind) => [
      CE_EVENT_PROPERTY_IDS[kind],
      { field: events(kind), defaultValue: () => [newEvent()], docs: CE_DOCS.events },
    ]),
  ),
);
