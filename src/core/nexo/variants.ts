/**
 * Zusätzliche Modelle eines Items für bestimmte Zustände (Nexo „Special Item Appearance“):
 * Bogen spannen, Armbrust geladen, Schild blocken, Angel ausgeworfen, Beschädigung, gefärbt …
 * Die Schlüssel entsprechen den Pack-Optionen aus der Nexo-Doku (configuration/items/item-appearance).
 */
import type { ImportedModel, Item } from '../types';

/** Varianten, die Nexo über Pack.<slot> selbst ins ItemModel einbaut */
export type PackVariantSlot =
  | 'pulling_models'
  | 'charged_model'
  | 'firework_model'
  | 'blocking_model'
  | 'cast_model'
  | 'throwing_model'
  | 'damaged_models'
  | 'dyeable_model'
  | 'composite_models';

export type ConnectSlot = 'connect_straight' | 'connect_left' | 'connect_right' | 'connect_inner' | 'connect_outer';
export type PlacementSlot = 'placement_floor' | 'placement_wall' | 'placement_roof';
/** Modell eines Möbel-Zustands: "state:<name>" */
export type StateSlot = `state:${string}`;

export type VariantSlot = PackVariantSlot | 'gui_model' | ConnectSlot | PlacementSlot | 'light_on' | 'stack_models' | StateSlot;

/**
 * pack:       Nexo baut das Modell über Pack.<slot> ein
 * definition: NexoBuilder schreibt ein eigenes ItemModel (assets/<ns>/items/…) für das Item
 * furniture:  Modell für Möbel-Funktionen (verbinden, Platzierung, Licht, Zustände)
 * block:      zusätzliche Block-Modelle (Stapel-Stufen)
 */
export type VariantKind = 'pack' | 'definition' | 'furniture' | 'block';

export interface VariantDef {
  slot: VariantSlot;
  kind: VariantKind;
  label: string;
  description: string;
  /** Mehrere Modelle (Liste) statt eines einzelnen */
  multiple: boolean;
  /** Teil des Dateinamens im Pack, z.B. "<id>-pulling_0" */
  suffix: string;
  /** Erster Index bei Listen (pulling_0 … bzw. damaged_1 …) */
  firstIndex?: number;
  /** Materialien, bei denen Minecraft diesen Zustand kennt */
  materials?: string[];
  hint?: string;
}

export const VARIANTS: VariantDef[] = [
  {
    slot: 'pulling_models',
    kind: 'pack',
    label: 'Pulling Models',
    description: 'Bogen/Armbrust: Modelle, während gespannt wird – meist 3 Stufen.',
    multiple: true,
    suffix: 'pulling',
    firstIndex: 0,
    materials: ['BOW', 'CROSSBOW'],
  },
  {
    slot: 'charged_model',
    kind: 'pack',
    label: 'Charged Model',
    description: 'Armbrust: gespannt mit Pfeil.',
    multiple: false,
    suffix: 'charged',
    materials: ['CROSSBOW'],
  },
  {
    slot: 'firework_model',
    kind: 'pack',
    label: 'Firework Model',
    description: 'Armbrust: mit Feuerwerksrakete geladen (optional).',
    multiple: false,
    suffix: 'firework',
    materials: ['CROSSBOW'],
  },
  {
    slot: 'blocking_model',
    kind: 'pack',
    label: 'Blocking Model',
    description: 'Schild: während geblockt wird.',
    multiple: false,
    suffix: 'blocking',
    materials: ['SHIELD'],
    hint: 'Alternativ zum Material SHIELD kann ab 1.21.5 die Component „Blocks Attacks“ verwendet werden.',
  },
  {
    slot: 'cast_model',
    kind: 'pack',
    label: 'Cast Model',
    description: 'Angel: Schnur ausgeworfen.',
    multiple: false,
    suffix: 'cast',
    materials: ['FISHING_ROD'],
  },
  {
    slot: 'throwing_model',
    kind: 'pack',
    label: 'Throwing Model',
    description: 'Dreizack: beim Ausholen zum Werfen – meist das gedrehte Hauptmodell.',
    multiple: false,
    suffix: 'throwing',
    materials: ['TRIDENT'],
    hint: 'Flug-Aussehen, Schaden und Sounds stellst du unter „Mechanics → Trident“ ein.',
  },
  {
    slot: 'damaged_models',
    kind: 'pack',
    label: 'Damaged Models',
    description: 'Modelle, die mit sinkender Haltbarkeit nacheinander angezeigt werden.',
    multiple: true,
    suffix: 'damaged',
    firstIndex: 1,
    hint: 'Das Item braucht Haltbarkeit (Material mit Haltbarkeit oder die Component „Max Damage“).',
  },
  {
    slot: 'dyeable_model',
    kind: 'pack',
    label: 'Dyeable Model',
    description: 'Modell, das angezeigt wird, wenn das Item eingefärbt wurde (/nexo dye).',
    multiple: false,
    suffix: 'dyeable',
    hint: 'Für die Färbung müssen die Flächen im Modell „Tint“ aktiviert haben (Blockbench: Paint-Tab → Tint).',
  },
  {
    slot: 'composite_models',
    kind: 'pack',
    label: 'Composite Models',
    description: 'Mehrere Modelle, die übereinander gezeichnet werden (z.B. Hintergrund, Item, Overlay).',
    multiple: true,
    suffix: 'composite',
    firstIndex: 1,
  },
  {
    slot: 'gui_model',
    kind: 'definition',
    label: 'GUI Model',
    description: 'Anderes Modell im Inventar (z.B. flaches 2D-Bild), während in der Hand, auf dem Kopf oder als Furniture das Hauptmodell zu sehen ist.',
    multiple: false,
    suffix: 'gui',
    hint: 'NexoBuilder erzeugt dafür ein eigenes ItemModel (ab Minecraft 1.21.4). Pulling, Blocking & Co. wirken dann nicht mehr.',
  },
];

/** Modelle für Möbel-Funktionen – werden im Modell-Tab bei aktiver Möbel-Mechanik angezeigt */
export const FURNITURE_MODEL_SLOTS: VariantDef[] = [
  { slot: 'connect_straight', kind: 'furniture', label: 'Straight', description: 'Mittelstück zwischen linkem und rechtem Ende', multiple: false, suffix: 'straight' },
  { slot: 'connect_left', kind: 'furniture', label: 'Left', description: 'Linkes Ende', multiple: false, suffix: 'left' },
  { slot: 'connect_right', kind: 'furniture', label: 'Right', description: 'Rechtes Ende', multiple: false, suffix: 'right' },
  { slot: 'connect_inner', kind: 'furniture', label: 'Inner', description: 'Ecke nach innen', multiple: false, suffix: 'inner' },
  { slot: 'connect_outer', kind: 'furniture', label: 'Outer', description: 'Ecke nach außen', multiple: false, suffix: 'outer' },
  { slot: 'placement_floor', kind: 'furniture', label: 'Floor', description: 'Auf einen Block gestellt', multiple: false, suffix: 'floor' },
  { slot: 'placement_wall', kind: 'furniture', label: 'Wall', description: 'An die Seite eines Blocks gesetzt', multiple: false, suffix: 'wall' },
  { slot: 'placement_roof', kind: 'furniture', label: 'Roof', description: 'Unter einen Block gehängt', multiple: false, suffix: 'roof' },
  { slot: 'light_on', kind: 'furniture', label: 'Toggled (Light On)', description: 'Modell, wenn das Licht eingeschaltet ist', multiple: false, suffix: 'light_on' },
];

export const CONNECT_SLOTS: Array<{ slot: ConnectSlot; state: string }> = [
  { slot: 'connect_straight', state: 'straight' },
  { slot: 'connect_left', state: 'left' },
  { slot: 'connect_right', state: 'right' },
  { slot: 'connect_inner', state: 'inner' },
  { slot: 'connect_outer', state: 'outer' },
];

export const PLACEMENT_SLOTS: Array<{ slot: PlacementSlot; placement: 'floor' | 'wall' | 'roof' }> = [
  { slot: 'placement_floor', placement: 'floor' },
  { slot: 'placement_wall', placement: 'wall' },
  { slot: 'placement_roof', placement: 'roof' },
];

/** Stapel-Stufen eines StringBlocks (Mechanics.custom_block.stackable) */
export const STACK_MODELS: VariantDef = {
  slot: 'stack_models',
  kind: 'block',
  label: 'Stackable',
  description: 'Weitere Modelle, wenn derselbe Block mehrfach auf eine Stelle gesetzt wird (wie Blütenteppich).',
  multiple: true,
  suffix: 'stack',
  firstIndex: 1,
};

export function stateSlot(name: string): StateSlot {
  return `state:${name}`;
}

export function stateDef(name: string): VariantDef {
  return {
    slot: stateSlot(name),
    kind: 'furniture',
    label: name,
    description: `Modell im Zustand „${name}“`,
    multiple: false,
    suffix: `state_${name.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'zustand'}`,
  };
}

export const VARIANT_BY_SLOT = new Map(VARIANTS.map((v) => [v.slot, v]));

export function getVariantModels(item: Item, slot: VariantSlot): ImportedModel[] {
  return item.variants?.[slot] ?? [];
}

/** Alle Modell-Plätze mit Modellen (auch Möbel-, Zustands- und Block-Modelle) */
export function allVariantDefs(item: Item): VariantDef[] {
  const defs: VariantDef[] = [...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS];
  for (const slot of Object.keys(item.variants ?? {})) {
    if (slot.startsWith('state:')) defs.push(stateDef(slot.slice('state:'.length)));
  }
  return defs;
}

export function activeVariantSlots(item: Item): VariantSlot[] {
  return VARIANTS.map((v) => v.slot).filter((slot) => item.variants?.[slot] !== undefined);
}

/** Pfad-Zusatz eines Varianten-Modells, z.B. "pulling_0" oder "blocking". */
export function variantPathSuffix(def: VariantDef, index: number): string {
  return def.multiple ? `${def.suffix}_${index + (def.firstIndex ?? 0)}` : def.suffix;
}
