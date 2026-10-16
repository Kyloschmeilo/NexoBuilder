/**
 * CraftEngine's resource pack builds as they appear in the server console. Provisional: written from the plugin's
 * English messages (translations/en.yml), not yet checked against the lines of a real run.
 */
import type { ServerLogEvent } from '../serverLog';

/** "Generating resource pack..." (resource_pack.generation_started) */
const PACK_BUILDING = /Generating resource pack\.\.\./i;
/** "Successfully uploaded resource pack in 12 ms" (host.upload_finished), the last log line of the default workflow */
const PACK_READY = /Successfully uploaded resource pack in \d+\s*ms/i;
/**
 * "Failed to run reload_pack workflows" (logged by /ce reload) and "Failed to generate the resource pack. Please check
 * console logs" (command.reload.pack.failure, the reply to the console)
 */
const PACK_FAILED = /Failed to run reload_pack workflows|Failed to generate the resource pack/i;

/** What a CraftEngine console line tells about the resource pack, or null for any other line. */
export function parseCraftEngineLogLine(line: string): ServerLogEvent | null {
  if (PACK_BUILDING.test(line)) return { type: 'packBuilding' };
  if (PACK_READY.test(line)) return { type: 'packReady', url: null };
  // The reason follows on the next lines (a stack trace), if at all
  if (PACK_FAILED.test(line)) return { type: 'packFailed', message: null };
  return null;
}
