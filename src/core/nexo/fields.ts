/**
 * Beschreibung von Formularfeldern. Die Oberfläche rendert diese Felder generisch,
 * die Werte landen 1:1 im Konfigurationsobjekt des Items (= späteres YAML).
 */
import type { Option } from './options';

interface BaseField {
  /** Schlüssel innerhalb des übergeordneten Objekts. "*" = alle übrigen Schlüssel (nur bei map) */
  key: string;
  label: string;
  help?: string;
  /** Feld nur anzeigen, wenn ein Geschwisterfeld einen dieser Werte hat */
  showIf?: { key: string; values: Array<string | boolean | number> };
  /** Benötigte Minecraft-Version für dieses Feld */
  minVersion?: string;
}

export interface TextField extends BaseField {
  type: 'text';
  placeholder?: string;
  suggestions?: Option[];
  /** Zusätzliche Bedeutung für Darstellung und Prüfung */
  format?: 'minimessage' | 'duration' | 'vector' | 'resource' | 'color' | 'range';
  multiline?: boolean;
}

export interface NumberField extends BaseField {
  type: 'number';
  integer?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

/** Drei Zustände: nicht gesetzt / true / false */
export interface BooleanField extends BaseField {
  type: 'boolean';
  /** Standardwert von Nexo, wenn nicht gesetzt (nur zur Anzeige) */
  defaultHint?: boolean;
}

export interface SelectField extends BaseField {
  type: 'select';
  options: Option[];
  allowCustom?: boolean;
  placeholder?: string;
}

/** Liste von Texten. Mit `singleAsString` wird bei genau einem Eintrag ein einzelner Wert geschrieben. */
export interface StringListField extends BaseField {
  type: 'stringList';
  placeholder?: string;
  suggestions?: Option[];
  format?: TextField['format'];
  singleAsString?: boolean;
}

export interface MultiSelectField extends BaseField {
  type: 'multiSelect';
  options: Option[];
}

export interface ObjectField extends BaseField {
  type: 'object';
  fields: Field[];
  /** Wird statt eines leeren Objekts geschrieben (z.B. `preview_placement: true`) */
  emptyValue?: true;
}

export interface ObjectListField extends BaseField {
  type: 'objectList';
  fields: Field[];
  itemLabel: string;
  /** Feld, dessen Wert als Titel eines Eintrags angezeigt wird */
  titleKey?: string;
  newItem?: () => Record<string, unknown>;
}

export interface MapField extends BaseField {
  type: 'map';
  keyLabel: string;
  keyOptions?: Option[];
  keyPlaceholder?: string;
  /** Feld für den Wert eines Eintrags (key wird ignoriert) */
  value: Field;
  /** Schlüssel, die von anderen Feldern im selben Objekt belegt sind */
  reservedKeys?: string[];
  newValue?: () => unknown;
}

export interface YamlField extends BaseField {
  type: 'yaml';
  placeholder?: string;
}

/** Checkbox, die bei Aktivierung ein leeres Objekt `{}` schreibt (z.B. CLEAR_ALL_EFFECTS). */
export interface PresenceField extends BaseField {
  type: 'presence';
}

/** Upload einer zusätzlichen PNG (z.B. Rüstungs-Textur). Der Wert ist "@asset:<id>". */
export interface TextureField extends BaseField {
  type: 'texture';
  /** Erwartete Größe als Hinweis, z.B. "64×32" */
  sizeHint?: string;
}

export type Field =
  | TextField
  | NumberField
  | BooleanField
  | SelectField
  | StringListField
  | MultiSelectField
  | ObjectField
  | ObjectListField
  | MapField
  | YamlField
  | PresenceField
  | TextureField;

/* ------------------------------------------------------------------ Validierung von Einzelwerten */

const DURATION = /^\d+(\.\d+)?(t|ms|s|m|h|d|w|mo)?$/;
const VECTOR = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const COLOR = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
const RANGE = /^-?\d+(\.\d+)?(\.\.-?\d+(\.\d+)?)?$/;

export function validateTextFormat(format: TextField['format'], value: string): string | null {
  // "@model" = Modell des Items (wird beim Export ersetzt)
  if (!value || value === '@model') return null;
  switch (format) {
    case 'duration':
      return DURATION.test(value.trim()) ? null : 'Erwartet eine Dauer wie 20t, 1.5s, 2m';
    case 'vector':
      return VECTOR.test(value) ? null : 'Erwartet x,y,z – z.B. 0,0.5,0';
    case 'color': {
      const m = COLOR.exec(value);
      if (!m) return 'Erwartet R, G, B – z.B. 255, 128, 0';
      return [m[1], m[2], m[3]].every((n) => Number(n) <= 255) ? null : 'Werte müssen zwischen 0 und 255 liegen';
    }
    case 'range':
      return RANGE.test(value.trim()) ? null : 'Erwartet eine Zahl oder einen Bereich wie 1..3';
    case 'resource':
      return /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/.test(value.trim()) ? null : 'Erwartet einen Schlüssel wie namespace:pfad (nur Kleinbuchstaben)';
    default:
      return null;
  }
}
