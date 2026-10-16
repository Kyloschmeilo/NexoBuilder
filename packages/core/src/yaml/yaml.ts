/**
 * YAML for the server plugins (Nexo, CraftEngine). Bukkit/Paper read YAML 1.1 (SnakeYAML) – there e.g. "yes", "no",
 * "on" or "1:30" are not strings. So we write in YAML 1.1 mode, so that such values
 * get quoted automatically.
 */
import { Document, isScalar, parse, visit, YAMLParseError, type Scalar } from 'yaml';
import { isPlainObject, type IssueCode } from '@resourcepackbuilder/utils';

const STRINGIFY_OPTIONS = { indent: 2, lineWidth: 0, minContentWidth: 0 } as const;

/** Strings with formatting are double-quoted, as in the plugins' docs. */
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
  /** The YAML library's error text (first line, English, not translated) – null if the text parses */
  error: string | null;
  /** The same error as a message in the `issues` namespace (line, column and the library's text as `detail`) */
  problem: YamlProblem | null;
}

export interface YamlProblem {
  code: Extract<IssueCode, `yaml.${string}`>;
  args: { line: number; column: number; detail: string };
}

/** Parses YAML the way Bukkit would (YAML 1.1). */
export function parseYaml(text: string): YamlParseResult {
  if (!text.trim()) return { value: null, error: null, problem: null };
  try {
    const value = parse(text, { version: '1.1', strict: true, uniqueKeys: true, prettyErrors: true }) as unknown;
    return { value, error: null, problem: null };
  } catch (err) {
    const error = err instanceof Error ? err.message.split('\n')[0] : String(err);
    return { value: null, error, problem: yamlProblem(err, error) };
  }
}

/** The translatable form of a parse error: where it is, plus the library's text as detail. */
function yamlProblem(err: unknown, detail: string): YamlProblem {
  const position = err instanceof YAMLParseError ? err.linePos?.[0] : undefined;
  const code = err instanceof YAMLParseError && err.code === 'DUPLICATE_KEY' ? 'yaml.duplicateKey' : 'yaml.syntax';
  return { code, args: { line: position?.line ?? 0, column: position?.col ?? 0, detail } };
}

/** Comment line at the top of every generated file. */
export function yamlHeader(description: string): string {
  return `# Created with ResourcepackBuilder – ${description}\n`;
}

/**
 * Problem with the item's additional YAML (YAML tab):
 * - `syntax`: the YAML does not parse; `message` is the YAML library's error text (English, not translated)
 * - `notAMapping`: the YAML is valid but not a key-value mapping (e.g. "Mechanics: ...")
 */
export type RawYamlError = { kind: 'syntax'; message: string } | { kind: 'notAMapping' };

/** The item's additional YAML as a mapping, or why it cannot be used; blank text is an empty overlay. */
export function parseRawYaml(text: string): { value: Record<string, unknown> | null; error: RawYamlError | null } {
  if (!text.trim()) return { value: null, error: null };
  const parsed = parseYaml(text);
  if (parsed.error) return { value: null, error: { kind: 'syntax', message: parsed.error } };
  if (parsed.value !== null && !isPlainObject(parsed.value)) return { value: null, error: { kind: 'notAMapping' } };
  return { value: isPlainObject(parsed.value) ? parsed.value : null, error: null };
}
