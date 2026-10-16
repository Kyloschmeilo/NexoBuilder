/** Reads the plugin descriptor (paper-plugin.yml or plugin.yml) of a Minecraft plugin JAR. */
import JSZip from 'jszip';
import { parse } from 'yaml';
import { isPlainObject } from '../object';

export interface PluginDescriptor {
  name: string;
  version: string;
}

/** Paper plugins have a paper-plugin.yml; Bukkit/Spigot plugins (and most Paper ones too) a plugin.yml. */
const DESCRIPTOR_FILES = ['paper-plugin.yml', 'plugin.yml'];

/** Name and version from a plugin JAR, or null if it is no readable archive or has no valid descriptor. */
export async function readPluginDescriptor(jar: Uint8Array): Promise<PluginDescriptor | null> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(jar);
  } catch {
    return null; // not a ZIP archive
  }
  for (const name of DESCRIPTOR_FILES) {
    const entry = zip.file(name);
    if (!entry) continue;
    try {
      return parsePluginDescriptor(await entry.async('string'));
    } catch {
      return null; // corrupt entry
    }
  }
  return null;
}

/** Name and version from the text of a plugin descriptor, or null if it lacks them. */
export function parsePluginDescriptor(text: string): PluginDescriptor | null {
  let data: unknown;
  try {
    // failsafe: every value stays text ("version: 1.10" would otherwise become the number 1.1)
    data = parse(text, { schema: 'failsafe' });
  } catch {
    return null;
  }
  if (!isPlainObject(data) || typeof data.name !== 'string' || !data.name.trim()) return null;
  return { name: data.name.trim(), version: typeof data.version === 'string' ? data.version.trim() : '' };
}
