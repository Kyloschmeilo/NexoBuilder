/**
 * Reads the test server's console: Paper's startup and port messages here, the plugin's resource pack builds through
 * its adapter. Every pattern that scrapes the server output lives here or in an adapter's log module (tested against
 * real log lines in serverLog.test.ts).
 */
import type { ServerAdapter } from './adapter';

export type ServerLogEvent =
  /** Paper finished starting ("Done (12.3s)! For help, type "help""). */
  | { type: 'started' }
  /** The Minecraft port is taken by another process. */
  | { type: 'portInUse' }
  /** The plugin started building the resource pack. */
  | { type: 'packBuilding' }
  /** The plugin finished the pack; `url` is where it is served, when the line names it. */
  | { type: 'packReady'; url: string | null }
  /** The plugin could not build or upload the pack; `message` is the plugin's own reason, when the line has one. */
  | { type: 'packFailed'; message: string | null };

const STARTED = /Done \([\d.,]+s\)! For help/;
const PORT_IN_USE = /FAILED TO BIND TO PORT/i;

/** ANSI escape sequences (colours) in console output. */
// eslint-disable-next-line no-control-regex -- matches the escape character on purpose
const ANSI_ESCAPE = /\x1b\[[0-9;]*[A-Za-z]/g;

/** A console line without colour codes. */
export function stripAnsi(line: string): string {
  return line.replace(ANSI_ESCAPE, '');
}

/** What a console line tells about the server running `adapter`'s plugin, or null for an ordinary line. */
export function parseServerLogLine(adapter: ServerAdapter, line: string): ServerLogEvent | null {
  const pluginEvent = adapter.parsePluginLogLine(line);
  if (pluginEvent) return pluginEvent;
  if (STARTED.test(line)) return { type: 'started' };
  if (PORT_IN_USE.test(line)) return { type: 'portInUse' };
  return null;
}
