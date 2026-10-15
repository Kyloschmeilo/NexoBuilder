/**
 * YAML output for Nexo. Bukkit/Paper read YAML 1.1 (SnakeYAML) – there e.g. "yes", "no",
 * "on" or "1:30" are not strings. So we write in YAML 1.1 mode, so that such values
 * get quoted automatically.
 */
import { Document, isScalar, parse, visit, type Scalar } from 'yaml';

const STRINGIFY_OPTIONS = { indent: 2, lineWidth: 0, minContentWidth: 0 } as const;

/** Strings with formatting are double-quoted, as in the Nexo docs. */
const QUOTE_PATTERN = /[<>&§%]|^\s|\s$/;

export function toYaml(value: unknown): string {
  const doc = new Document(value, { version: '1.1' });
  visit(doc, {
    Pair(_, pair) {
      const node = pair.value;
      if (isScalar(node)) quoteIfNeeded(node);
    },
    Seq(_, seq) {
      for (const item of seq.items) if (isScalar(item)) quoteIfNeeded(item);
    },
  });
  return doc.toString(STRINGIFY_OPTIONS);
}

function quoteIfNeeded(node: Scalar) {
  if (typeof node.value === 'string' && QUOTE_PATTERN.test(node.value)) {
    node.type = 'QUOTE_DOUBLE';
  }
}

export interface YamlParseResult {
  value: unknown;
  error: string | null;
}

/** Parses YAML the way Bukkit would (YAML 1.1). */
export function parseYaml(text: string): YamlParseResult {
  if (!text.trim()) return { value: null, error: null };
  try {
    const value = parse(text, { version: '1.1', strict: true, uniqueKeys: true, prettyErrors: true }) as unknown;
    return { value, error: null };
  } catch (err) {
    return { value: null, error: (err as Error).message.split('\n')[0] };
  }
}

/** Writes several items into one file (separated by a blank line each). */
export function itemsToYaml(items: Array<{ id: string; config: Record<string, unknown> }>, header?: string): string {
  const parts = items.map(({ id, config }) => toYaml({ [id]: config }).trimEnd());
  const body = parts.join('\n\n') + '\n';
  return header ? `${header.trimEnd()}\n${body}` : body;
}
