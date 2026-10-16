/**
 * CraftEngine's resource pack builds as they appear in the server console. The lines are English because the test
 * server sets `forced-locale: en` (see config.ts); __fixtures__/log.txt holds them from a real run (CraftEngine 26.9.2
 * on Paper 26.3).
 */
import type { ServerLogEvent } from '../serverLog';

/** "Generating resource pack..." (resource_pack.generation_started), the first step of the reload_pack workflow */
const PACK_BUILDING = /Generating resource pack\.\.\./i;
/** "Successfully uploaded resource pack in 12 ms" (host.upload_finished): the pack is served from now on */
const PACK_READY = /Successfully uploaded resource pack in \d+\s*ms/i;
/**
 * "Failed to run reload_pack workflows" (logged by /ce reload, a stack trace follows), "Failed to generate the
 * resource pack. Please check console logs" (command.reload.pack.failure, the reply to the console) and "Failed to
 * reload configs" (command.reload.config.failure: "ce reload all" then builds no pack)
 */
const PACK_FAILED = /Failed to run reload_pack workflows|Failed to generate the resource pack|Failed to reload configs/i;

/** What a CraftEngine console line tells about the resource pack, or null for any other line. */
export function parseCraftEngineLogLine(line: string): ServerLogEvent | null {
  if (PACK_BUILDING.test(line)) return { type: 'packBuilding' };
  if (PACK_READY.test(line)) return { type: 'packReady', url: null };
  // The reason follows on the next lines (a stack trace), if at all
  if (PACK_FAILED.test(line)) return { type: 'packFailed', message: null };
  return null;
}
