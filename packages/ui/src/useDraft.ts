import { useState } from 'react';

/**
 * Local text of an input that edits a typed value, so intermediate states ("-", "1.", half-typed YAML) can
 * be typed. When `value` changes from outside (undo, another editor) the draft follows – unless it already
 * means that value, so the user's own formatting survives their edits.
 *
 * @param parse the value a text means, or `undefined` when the text is not (yet) valid
 * @param format the text of a value
 */
export function useDraft<T>(value: T, parse: (text: string) => { value: T } | undefined, format: (value: T) => string) {
  const [draft, setDraft] = useState(() => format(value));
  const [synced, setSynced] = useState(value);
  if (!Object.is(synced, value)) {
    // Adjusting state while rendering (instead of in an effect) avoids a frame with the stale draft.
    setSynced(value);
    const parsed = parse(draft);
    if (!parsed || format(parsed.value) !== format(value)) setDraft(format(value));
  }
  return {
    draft,
    setDraft,
    /** Drops the draft in favour of the current value (e.g. on blur). */
    reset: () => setDraft(format(value)),
  };
}
