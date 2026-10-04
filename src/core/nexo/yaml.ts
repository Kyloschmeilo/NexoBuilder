/**
 * YAML-Ausgabe für Nexo. Bukkit/Paper lesen YAML 1.1 (SnakeYAML) – dort sind z.B. "yes", "no",
 * "on" oder "1:30" keine Texte. Deshalb wird im YAML-1.1-Modus geschrieben, damit solche Werte
 * automatisch in Anführungszeichen gesetzt werden.
 */
import { Document, isScalar, parse, visit, type Scalar } from 'yaml';

const STRINGIFY_OPTIONS = { indent: 2, lineWidth: 0, minContentWidth: 0 } as const;

/** Texte mit Formatierungen werden wie in der Nexo-Doku in doppelte Anführungszeichen gesetzt. */
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

/** Liest YAML so, wie es Bukkit auch tun würde (YAML 1.1). */
export function parseYaml(text: string): YamlParseResult {
  if (!text.trim()) return { value: null, error: null };
  try {
    const value = parse(text, { version: '1.1', strict: true, uniqueKeys: true, prettyErrors: true }) as unknown;
    return { value, error: null };
  } catch (err) {
    return { value: null, error: (err as Error).message.split('\n')[0] };
  }
}

/** Schreibt mehrere Items in eine Datei (jeweils durch eine Leerzeile getrennt). */
export function itemsToYaml(items: Array<{ id: string; config: Record<string, unknown> }>, header?: string): string {
  const parts = items.map(({ id, config }) => toYaml({ [id]: config }).trimEnd());
  const body = parts.join('\n\n') + '\n';
  return header ? `${header.trimEnd()}\n${body}` : body;
}
