/** The text typed into a `commitOnBlur` input that is not committed yet (see TextInput). */

/** A typed text together with the value it was typed over. */
export interface TextDraft {
  text: string;
  base: string | undefined;
}

/**
 * The draft that is still pending for `value`. A change of `value` from outside (undo, another editor) drops the
 * draft, so the input shows the new value instead of hiding it behind old typing.
 */
export function pendingDraft(draft: TextDraft | null, value: string | undefined): string | null {
  return draft !== null && draft.base === value ? draft.text : null;
}

/**
 * Whether a key commits the draft. Enter does, except while a suggestion is highlighted: Enter then picks the
 * suggestion, and the pick commits its own value (committing the half-typed text first would apply it in between).
 */
export function commitsOnKey(key: string, draft: string | null, suggestionHighlighted: boolean): boolean {
  return key === 'Enter' && draft !== null && !suggestionHighlighted;
}
