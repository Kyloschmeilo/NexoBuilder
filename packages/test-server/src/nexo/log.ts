/** Nexo's resource pack builds as they appear in the server console (tested against real lines in serverLog.test.ts). */
import type { ServerLogEvent } from '../serverLog';

const NEXO = /Nexo/;
const PACK_BUILDING = /Generating resourcepack/i;
const PACK_READY = /Resourcepack uploaded and will be dispatched with publicAddress\s*(\S*)|ResourcePack uploaded:\s*(\S*)/i;
const PACK_FAILED = /Failed to build and send the finished ResourcePack:\s*(.*)|Upload failed:\s*(.*)|could not be uploaded(.*)/i;

/** What a Nexo console line tells about the resource pack, or null for any other line. */
export function parseNexoLogLine(line: string): ServerLogEvent | null {
  if (!NEXO.test(line)) return null;
  if (PACK_BUILDING.test(line)) return { type: 'packBuilding' };
  const ready = PACK_READY.exec(line);
  if (ready) return { type: 'packReady', url: ready[1] || ready[2] || null };
  const failed = PACK_FAILED.exec(line);
  if (failed) return { type: 'packFailed', message: (failed[1] || failed[2] || failed[3] || '').trim() || null };
  return null;
}
