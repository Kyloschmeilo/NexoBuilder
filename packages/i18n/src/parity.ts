/** One way two message catalogues can fail to match at a given message path. */
export type MessageParityReason = 'missing_in_target' | 'missing_in_source' | 'argument_mismatch';

/** One mismatch found between a source and a target message catalogue. */
export interface MessageParityError {
  /** The dotted path of the message, such as `"greeting.hello"`. */
  readonly path: string;
  /** Why the message at this path does not match. */
  readonly reason: MessageParityReason;
}

/**
 * Extracts the names of every ICU argument referenced by a message string,
 * such as `{name}` in `"Hello {name}!"` or `count` in `"{count, plural, ...}"`.
 *
 * The message is parsed: the branches of a plural or select argument
 * (`one {...}`, `=0 {...}`, `other {...}`) are read as nested messages, so
 * their selectors are never taken for arguments while text elsewhere that
 * merely looks like a selector (`"the other {count}"`) still is. Text quoted
 * with apostrophes (`'{'`) holds no arguments.
 *
 * @param message the ICU message string
 * @returns the argument names referenced, without duplicates
 */
function icuArgumentNames(message: string): Set<string> {
  const names = new Set<string>();
  let i = 0;

  /** Skips whitespace. */
  const skipSpace = (): void => {
    while (i < message.length && /\s/.test(message[i] ?? '')) i++;
  };

  /** Reads characters up to (not including) one of `stops`. */
  const readUntil = (stops: string): string => {
    const begin = i;
    while (i < message.length && !stops.includes(message[i] ?? '')) i++;
    return message.slice(begin, i);
  };

  /** Skips a quoted section starting at an apostrophe; returns whether one was skipped. */
  const skipQuote = (): boolean => {
    const next = message[i + 1];
    if (next === "'") {
      i += 2;
      return true;
    }
    if (next !== '{' && next !== '}' && next !== '#' && next !== '|') return false;
    const close = message.indexOf("'", i + 1);
    i = close === -1 ? message.length : close + 1;
    return true;
  };

  /** Reads message text up to the `}` that closes it (or the end), collecting its arguments. */
  const readMessage = (): void => {
    while (i < message.length) {
      const char = message[i];
      if (char === "'" && skipQuote()) continue;
      if (char === '}') return;
      if (char === '{') readArgument();
      else i++;
    }
  };

  /** Reads an argument starting at its `{`, including the branches of a plural or select. */
  const readArgument = (): void => {
    i++;
    skipSpace();
    const name = readUntil(',}').trim();
    if (/^[a-zA-Z0-9_]+$/.test(name)) names.add(name);
    if (message[i] === '}') {
      i++;
      return;
    }
    i++;
    const type = readUntil(',}').trim();
    if (type !== 'plural' && type !== 'select' && type !== 'selectordinal') {
      // number, date, time: the style may hold braces of its own
      let depth = 1;
      while (i < message.length && depth > 0) {
        const char = message[i++];
        if (char === '{') depth++;
        else if (char === '}') depth--;
      }
      return;
    }
    if (message[i] === ',') i++;
    while (i < message.length) {
      skipSpace();
      if (message[i] === '}') {
        i++;
        return;
      }
      // A selector (`one`, `=0`, after an optional `offset:1`) and its branch
      readUntil('{}');
      if (message[i] !== '{') continue;
      i++;
      readMessage();
      i++;
    }
  };

  while (i < message.length) {
    readMessage();
    // A `}` without its `{` is plain text
    i++;
  }
  return names;
}

/**
 * Flattens a nested message tree into dotted paths mapped to the ICU argument
 * names referenced by each leaf message string.
 *
 * @param tree the message tree to flatten
 * @param prefix the dotted path prefix already consumed, used during recursion
 * @returns every leaf message path mapped to its ICU argument names
 * @throws when a leaf value is neither a string nor a nested object
 */
function flattenMessages(tree: Record<string, unknown>, prefix = ''): Map<string, Set<string>> {
  const flattened = new Map<string, Set<string>>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      flattened.set(path, icuArgumentNames(value));
    } else if (typeof value === 'object' && value !== null) {
      for (const [nestedPath, args] of flattenMessages(value as Record<string, unknown>, path)) {
        flattened.set(nestedPath, args);
      }
    } else {
      throw new Error(`the message at "${path}" is neither a string nor a nested object`);
    }
  }
  return flattened;
}

/**
 * Compares two sets for equal membership.
 *
 * @param a the first set
 * @param b the second set
 * @returns whether both sets contain exactly the same members
 */
function sameMembers(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const member of a) {
    if (!b.has(member)) {
      return false;
    }
  }
  return true;
}

/**
 * Compares a source message catalogue (English) against a target catalogue
 * (for example German): every key present in one must be present in the
 * other, and every message's ICU arguments must match exactly.
 *
 * @param source the source catalogue
 * @param target the target catalogue
 * @returns every mismatch found, empty when the catalogues are in parity
 */
export function messageParityErrors(source: Record<string, unknown>, target: Record<string, unknown>): readonly MessageParityError[] {
  const sourceMessages = flattenMessages(source);
  const targetMessages = flattenMessages(target);
  const errors: MessageParityError[] = [];

  for (const [path, args] of sourceMessages) {
    const targetArgs = targetMessages.get(path);
    if (targetArgs === undefined) {
      errors.push({ path, reason: 'missing_in_target' });
      continue;
    }
    if (!sameMembers(args, targetArgs)) {
      errors.push({ path, reason: 'argument_mismatch' });
    }
  }
  for (const path of targetMessages.keys()) {
    if (!sourceMessages.has(path)) {
      errors.push({ path, reason: 'missing_in_source' });
    }
  }
  return errors;
}
