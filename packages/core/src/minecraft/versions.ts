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

export const DEFAULT_MC_VERSION = '26.3';

/** From this pack format on, min_format/max_format apply (Minecraft 1.21.9+). */
const MIN_MAX_FORMAT_SINCE = 65;
/** Upper bound so that newer clients do not show an "outdated" warning. */
const MAX_FORMAT = 999;

export function getMcVersion(id: string): McVersion {
  return MC_VERSIONS.find((v) => v.id === id) ?? MC_VERSIONS[MC_VERSIONS.length - 1];
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

/** Version limits for model features (derived from Blockbench / Minecraft changelogs). */
export const MODEL_FEATURE_VERSIONS = {
  /** Arbitrary angles between -45° and 45° (previously only 22.5° steps) */
  freeAngle: '1.21.6',
  /** Rotation on multiple axes or angles above 45° */
  multiAxisRotation: '1.21.11',
  /** shade_direction_override on elements */
  shadeDirectionOverride: '26.3',
} as const;
