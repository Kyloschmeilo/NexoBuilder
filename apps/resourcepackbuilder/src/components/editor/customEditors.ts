/**
 * Hand-written field editors by name. A field of the form schema that names one (`Field.editor`) is shown with it
 * instead of the generic editor of its type, wherever the field appears. Feature modules register theirs when they
 * load (e.g. the furniture module its hitbox, seat, bed and light editors).
 */
import { type ComponentType, createElement, type ReactNode } from 'react';
import type { EditorProps } from './types';

const editors = new Map<string, ComponentType<EditorProps>>();

/** Registers the editor shown for fields with `editor: name` (a later registration replaces an earlier one). */
export function registerFieldEditor(name: string, editor: ComponentType<EditorProps>): void {
  editors.set(name, editor);
}

/** The registered editor of that name, if any. */
export function customFieldEditor(name: string | undefined): ComponentType<EditorProps> | undefined {
  return name === undefined ? undefined : editors.get(name);
}

/** The field shown with the editor it names, or null when it names none (or none of that name is registered). */
export function renderCustomFieldEditor(props: EditorProps): ReactNode {
  const editor = customFieldEditor(props.field.editor);
  return editor ? createElement(editor, props) : null;
}
