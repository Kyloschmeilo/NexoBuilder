/**
 * Renders a form field of core's Nexo property schema with the editor for its type. Values are stored
 * unchanged in the config object; "not set" is undefined. Human-readable strings of the schema are
 * `schema` message keys and are translated by the editors.
 */
import type { ComponentType } from 'react';
import type { Field } from '@resourcepackbuilder/core/nexo/fields';
import { BooleanEditor } from './editors/BooleanEditor';
import { MapEditor } from './editors/MapEditor';
import { MultiSelectEditor } from './editors/MultiSelectEditor';
import { NumberEditor } from './editors/NumberEditor';
import { ObjectEditor } from './editors/ObjectEditor';
import { ObjectListEditor } from './editors/ObjectListEditor';
import { PresenceEditor } from './editors/PresenceEditor';
import { SelectEditor } from './editors/SelectEditor';
import { StringListEditor } from './editors/StringListEditor';
import { TextEditor } from './editors/TextEditor';
import { TextureEditor } from './editors/TextureEditor';
import { YamlEditor } from './editors/YamlEditor';
import type { EditorProps } from './types';
import { isFieldVisible } from './values';

type FieldByType = { [F in Field as F['type']]: F };

const EDITORS: { [T in keyof FieldByType]: ComponentType<EditorProps<FieldByType[T]>> } = {
  text: TextEditor,
  number: NumberEditor,
  boolean: BooleanEditor,
  select: SelectEditor,
  stringList: StringListEditor,
  multiSelect: MultiSelectEditor,
  object: ObjectEditor,
  objectList: ObjectListEditor,
  map: MapEditor,
  yaml: YamlEditor,
  presence: PresenceEditor,
  texture: TextureEditor,
};

function Editor<T extends keyof FieldByType>(props: EditorProps<FieldByType[T]> & { field: { type: T } }) {
  const Component: ComponentType<EditorProps<FieldByType[T]>> = EDITORS[props.field.type];
  return <Component {...props} />;
}

interface FieldRendererProps extends EditorProps {
  /** The object the field belongs to (evaluates `showIf`). */
  siblings?: Record<string, unknown>;
}

export function FieldRenderer({ siblings, ...props }: FieldRendererProps) {
  if (!isFieldVisible(props.field, siblings)) return null;
  return <Editor {...props} />;
}
