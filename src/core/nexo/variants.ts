/**
 * Zusätzliche Modelle eines Items für bestimmte Zustände (Nexo „Special Item Appearance“):
 * Bogen spannen, Armbrust geladen, Schild blocken, Angel ausgeworfen, Beschädigung, gefärbt …
 * Die Schlüssel entsprechen den Pack-Optionen aus der Nexo-Doku (configuration/items/item-appearance).
 */
import type { ImportedModel, Item } from '../types';

export type VariantSlot =
  | 'pulling_models'
  | 'charged_model'
  | 'firework_model'
  | 'blocking_model'
  | 'cast_model'
  | 'damaged_models'
  | 'dyeable_model'
  | 'composite_models';

export interface VariantDef {
  slot: VariantSlot;
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
    label: 'Spann-Stufen (Bogen / Armbrust)',
    description: 'Modelle, während der Bogen bzw. die Armbrust gespannt wird – meist 3 Stufen.',
    multiple: true,
    suffix: 'pulling',
    firstIndex: 0,
    materials: ['BOW', 'CROSSBOW'],
  },
  {
    slot: 'charged_model',
    label: 'Geladen (Armbrust)',
    description: 'Modell der gespannten Armbrust mit Pfeil.',
    multiple: false,
    suffix: 'charged',
    materials: ['CROSSBOW'],
  },
  {
    slot: 'firework_model',
    label: 'Mit Feuerwerk geladen (Armbrust)',
    description: 'Modell der Armbrust, wenn eine Feuerwerksrakete geladen ist (optional).',
    multiple: false,
    suffix: 'firework',
    materials: ['CROSSBOW'],
  },
  {
    slot: 'blocking_model',
    label: 'Blocken (Schild)',
    description: 'Modell, während mit dem Schild geblockt wird.',
    multiple: false,
    suffix: 'blocking',
    materials: ['SHIELD'],
    hint: 'Alternativ zum Material SHIELD kann ab 1.21.5 die Komponente „Blockt Angriffe“ verwendet werden.',
  },
  {
    slot: 'cast_model',
    label: 'Ausgeworfen (Angel)',
    description: 'Modell der Angel, wenn die Schnur ausgeworfen ist.',
    multiple: false,
    suffix: 'cast',
    materials: ['FISHING_ROD'],
  },
  {
    slot: 'damaged_models',
    label: 'Beschädigt (nach Haltbarkeit)',
    description: 'Modelle, die mit sinkender Haltbarkeit nacheinander angezeigt werden.',
    multiple: true,
    suffix: 'damaged',
    firstIndex: 1,
    hint: 'Das Item braucht Haltbarkeit (Material mit Haltbarkeit oder die Komponente „Haltbarkeit“).',
  },
  {
    slot: 'dyeable_model',
    label: 'Gefärbt',
    description: 'Modell, das angezeigt wird, wenn das Item eingefärbt wurde (/nexo dye).',
    multiple: false,
    suffix: 'dyeable',
    hint: 'Für die Färbung müssen die Flächen im Modell „Tint“ aktiviert haben (Blockbench: Paint-Tab → Tint).',
  },
  {
    slot: 'composite_models',
    label: 'Zusätzliche Modelle (übereinander)',
    description: 'Mehrere Modelle, die übereinander gezeichnet werden (z.B. Hintergrund, Item, Overlay).',
    multiple: true,
    suffix: 'composite',
    firstIndex: 1,
  },
];

export const VARIANT_BY_SLOT = new Map(VARIANTS.map((v) => [v.slot, v]));

export function getVariantModels(item: Item, slot: VariantSlot): ImportedModel[] {
  return item.variants?.[slot] ?? [];
}

export function activeVariantSlots(item: Item): VariantSlot[] {
  return VARIANTS.map((v) => v.slot).filter((slot) => item.variants?.[slot] !== undefined);
}

/** Pfad-Zusatz eines Varianten-Modells, z.B. "pulling_0" oder "blocking". */
export function variantPathSuffix(def: VariantDef, index: number): string {
  return def.multiple ? `${def.suffix}_${index + (def.firstIndex ?? 0)}` : def.suffix;
}
