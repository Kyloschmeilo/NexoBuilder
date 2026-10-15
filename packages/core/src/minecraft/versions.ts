/**
 * Minecraft versions supported by Nexo (see docs.nexomc.com → Version Support),
 * with their respective resource pack format.
 */
export interface McVersion {
  id: string;
  label: string;
  packFormat: number;
}

export const MC_VERSIONS: McVersion[] = [
  { id: '1.21.4', label: '1.21.4', packFormat: 46 },
  { id: '1.21.5', label: '1.21.5', packFormat: 55 },
  { id: '1.21.6', label: '1.21.6', packFormat: 63 },
  { id: '1.21.7', label: '1.21.7 – 1.21.8', packFormat: 64 },
  { id: '1.21.9', label: '1.21.9 – 1.21.10', packFormat: 69 },
  { id: '1.21.11', label: '1.21.11', packFormat: 75 },
  { id: '26.1', label: '26.1 – 26.1.2', packFormat: 84 },
  { id: '26.2', label: '26.2', packFormat: 88 },
  { id: '26.3', label: '26.3', packFormat: 97 },
];

const LATEST_MC_VERSION: McVersion = MC_VERSIONS[MC_VERSIONS.length - 1];
export const DEFAULT_MC_VERSION = LATEST_MC_VERSION.id;

/** From this pack format on, min_format/max_format apply (Minecraft 1.21.9+). */
const MIN_MAX_FORMAT_SINCE = 65;
/** Upper bound so that newer clients do not show an "outdated" warning. */
const MAX_FORMAT = 999;

/**
 * The known version with this ID. An unknown ID (e.g. a project saved by a newer app version)
 * deliberately falls back to the latest known version.
 */
export function getMcVersion(id: string): McVersion {
  return MC_VERSIONS.find((v) => v.id === id) ?? LATEST_MC_VERSION;
}

/** Compares version numbers like "1.21.11" and "26.1" (-1, 0 or 1). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function maxVersion(...versions: Array<string | undefined>): string | undefined {
  return versions.reduce<string | undefined>((max, v) => {
    if (!v) return max;
    if (!max) return v;
    return compareVersions(v, max) > 0 ? v : max;
  }, undefined);
}

export type VersionSupport = 'supported' | 'tooOld' | 'removed';

/** Whether something available from `minVersion` up to `maxVersion` exists on the target version. */
export function versionSupport(target: string, range: { minVersion?: string; maxVersion?: string }): VersionSupport {
  if (range.minVersion && compareVersions(target, range.minVersion) < 0) return 'tooOld';
  if (range.maxVersion && compareVersions(target, range.maxVersion) > 0) return 'removed';
  return 'supported';
}

/**
 * Creates the content of the pack.mcmeta matching the target version.
 * Rules according to the Minecraft Wiki / vanilla-mcdoc:
 *  - supported_formats must NOT be set if min_format ≥ 65 (1.21.9+).
 *  - pack_format is still specified for older clients.
 */
export function buildPackMcmeta(versionId: string, description: string): Record<string, unknown> {
  const format = getMcVersion(versionId).packFormat;
  const pack: Record<string, unknown> = {
    description,
    pack_format: format,
  };
  if (format < MIN_MAX_FORMAT_SINCE) {
    pack.supported_formats = [format, MAX_FORMAT];
  }
  pack.min_format = format;
  pack.max_format = MAX_FORMAT;
  return { pack };
}

/** Version limits of resource pack features (derived from Blockbench / Minecraft changelogs). */
export const FEATURE_VERSIONS = {
  /** Custom furniture item models (placements, light, states) */
  furnitureItemModels: '1.21.2',
  /** Item model definitions (assets/<ns>/items), used for GUI and connectable models */
  itemModelDefinitions: '1.21.4',
  /** Arbitrary angles between -45° and 45° (previously only 22.5° steps) */
  freeAngle: '1.21.6',
  /** Rotation on multiple axes or angles above 45° */
  multiAxisRotation: '1.21.11',
  /** shade_direction_override on elements */
  shadeDirectionOverride: '26.3',
} as const;
