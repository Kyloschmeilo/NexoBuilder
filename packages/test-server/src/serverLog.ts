/**
 * Reads the test server's console: Paper's startup and port messages and Nexo's resource pack builds. Every pattern
 * that scrapes the server output lives here (tested against real log lines in serverLog.test.ts).
 */

export type ServerLogEvent =
  /** Paper finished starting ("Done (12.3s)! For help, type "help""). */
  | { type: 'started' }
  /** The Minecraft port is taken by another process. */
  | { type: 'portInUse' }
  /** Nexo started building the resource pack. */
  | { type: 'packBuilding' }
  /** Nexo finished the pack; `url` is where it is served, when the line names it. */
  | { type: 'packReady'; url: string | null }
  /** Nexo could not build or upload the pack; `message` is Nexo's own reason, when the line has one. */
  | { type: 'packFailed'; message: string | null };

const STARTED = /Done \([\d.,]+s\)! For help/;
const PORT_IN_USE = /FAILED TO BIND TO PORT/i;
const NEXO = /Nexo/;
const PACK_BUILDING = /Generating resourcepack/i;
const PACK_READY = /Resourcepack uploaded and will be dispatched with publicAddress\s*(\S*)|ResourcePack uploaded:\s*(\S*)/i;
const PACK_FAILED = /Failed to build and send the finished ResourcePack:\s*(.*)|Upload failed:\s*(.*)|could not be uploaded(.*)/i;

/** ANSI escape sequences (colours) in console output. */
// eslint-disable-next-line no-control-regex -- matches the escape character on purpose
const ANSI_ESCAPE = /\x1b\[[0-9;]*[A-Za-z]/g;

/** A console line without colour codes. */
export function stripAnsi(line: string): string {
  return line.replace(ANSI_ESCAPE, '');
}

/** What a console line tells about the server, or null for an ordinary line. */
export function parseServerLogLine(line: string): ServerLogEvent | null {
  if (NEXO.test(line)) {
    if (PACK_BUILDING.test(line)) return { type: 'packBuilding' };
    const ready = PACK_READY.exec(line);
    if (ready) return { type: 'packReady', url: ready[1] || ready[2] || null };
    const failed = PACK_FAILED.exec(line);
    if (failed) return { type: 'packFailed', message: (failed[1] || failed[2] || failed[3] || '').trim() || null };
  }
  if (STARTED.test(line)) return { type: 'started' };
  if (PORT_IN_USE.test(line)) return { type: 'portInUse' };
  return null;
}
