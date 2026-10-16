/** Which Java a Paper server needs, and which Java an installation is. */
import { compareVersions } from '@resourcepackbuilder/minecraft';

/** Minimum Java version for a Minecraft version, in case the Paper API does not specify one. */
export function guessJavaFor(mcVersion: string): number {
  if (compareVersions(mcVersion, '26') >= 0) return 25;
  if (compareVersions(mcVersion, '1.20.5') >= 0) return 21;
  return 17;
}

/** The major version in the output of `java -version` ("1.8.0_402" → 8, "21.0.2" → 21), or null. */
export function parseJavaVersion(output: string): number | null {
  const match = /version "(\d+)(?:\.(\d+))?/.exec(output);
  if (!match) return null;
  const first = parseInt(match[1], 10);
  return first === 1 ? parseInt(match[2] ?? '0', 10) : first;
}
