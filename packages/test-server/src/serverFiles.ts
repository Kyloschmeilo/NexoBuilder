/**
 * Contents of the test server's own files: eula.txt, server.properties and Paper's paper-global.yml. Pure text in,
 * text out – the desktop program reads and writes the files.
 */
import { isMap, isScalar, parseDocument } from 'yaml';

export const EULA_TEXT = '# The Minecraft EULA (https://aka.ms/MinecraftEULA) was accepted in ResourcepackBuilder.\neula=true\n';

/** server.properties of a new test server: a flat creative world in peace. */
export const DEFAULT_SERVER_PROPERTIES = [
  '# Created by the ResourcepackBuilder test server – feel free to adjust',
  'motd=ResourcepackBuilder test server',
  'server-port=25565',
  'online-mode=true',
  'gamemode=creative',
  'difficulty=peaceful',
  'level-type=minecraft\\:flat',
  'generator-settings={"biome"\\:"minecraft\\:plains","layers"\\:[{"block"\\:"minecraft\\:bedrock","height"\\:1},{"block"\\:"minecraft\\:dirt","height"\\:2},{"block"\\:"minecraft\\:grass_block","height"\\:1}]}',
  'generate-structures=false',
  'spawn-protection=0',
  'max-players=8',
  'view-distance=8',
  'simulation-distance=6',
  'allow-flight=true',
  'enable-command-block=true',
  '',
].join('\n');

/* ------------------------------------------------------------------ .properties */

/** A key/value line of a .properties file ("key=value", "key: value" or "key value"); comments start with # or !. */
const PROPERTY_LINE = /^\s*((?:\\.|[^\s=:\\])+)\s*[=:\s]\s*(.*)$/;

function unescapeProperty(text: string): string {
  return text.replace(/\\(.)/g, (_match, char: string) => ({ t: '\t', n: '\n', r: '\r', f: '\f' })[char] ?? char);
}

function escapeProperty(text: string, isKey: boolean): string {
  let escaped = text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  if (isKey) escaped = escaped.replace(/([=: #!])/g, '\\$1');
  return escaped;
}

function isComment(line: string): boolean {
  return /^\s*([#!]|$)/.test(line);
}

/** The key/value pairs of a .properties text (continuation lines are not used by Minecraft and not supported). */
export function parseProperties(text: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    if (isComment(line)) continue;
    const match = PROPERTY_LINE.exec(line);
    if (match) result.set(unescapeProperty(match[1]), unescapeProperty(match[2]));
    else result.set(unescapeProperty(line.trim()), '');
  }
  return result;
}

/**
 * Sets `key` to `value` in a .properties text: the existing line is replaced in place, a missing key is appended.
 * Comments, order and every other line stay as they are.
 */
export function setProperty(text: string, key: string, value: string): string {
  const lines = text.split(/\r?\n/);
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const entry = `${escapeProperty(key, true)}=${escapeProperty(value, false)}`;
  const index = lines.findIndex((line) => {
    if (isComment(line)) return false;
    const match = PROPERTY_LINE.exec(line);
    return unescapeProperty(match ? match[1] : line.trim()) === key;
  });
  if (index >= 0) {
    lines[index] = entry;
    return lines.join(newline);
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  return [...lines, entry, ''].join(newline);
}

/* ------------------------------------------------------------------ paper-global.yml */

/**
 * Sets the values a plugin needs in paper-global.yml (`overrides`: path → value). Returns the new text, or null when
 * nothing had to change. Only settings Paper has already written are changed (it writes them on its first start);
 * comments and formatting are kept.
 */
export function patchPaperGlobal(text: string, overrides: ReadonlyArray<[string[], unknown]>): string | null {
  if (overrides.length === 0) return null;
  const doc = parseDocument(text);
  if (doc.errors.length > 0 || !isMap(doc.contents)) return null;
  let changed = false;
  for (const [path, value] of overrides) {
    const node = doc.getIn(path, true);
    if (isScalar(node) && node.value !== value) {
      node.value = value;
      changed = true;
    }
  }
  return changed ? doc.toString({ lineWidth: 0 }) : null;
}
