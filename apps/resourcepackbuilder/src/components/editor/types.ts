import type { Field } from '@resourcepackbuilder/core/nexo/form/fields';

/** Props of every field editor. Values are stored unchanged in the config object; "not set" is undefined. */
export interface EditorProps<F extends Field = Field> {
  field: F;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Top-level field of a property: booleans without "not set", objects without a frame. */
  root?: boolean;
  /** The title is omitted (the context already names the field). */
  hideLabel?: boolean;
}
