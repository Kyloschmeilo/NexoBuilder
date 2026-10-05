/**
 * Minecraft-Versionen, die von Nexo unterstützt werden (siehe docs.nexomc.com → Version Support),
 * mit dem jeweiligen Resourcepack-Format.
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

/** Ab diesem Pack-Format gelten min_format/max_format (Minecraft 1.21.9+). */
const MIN_MAX_FORMAT_SINCE = 65;
/** Obergrenze, damit neuere Clients keine „veraltet“-Warnung anzeigen. */
const MAX_FORMAT = 999;

export function getMcVersion(id: string): McVersion {
  return MC_VERSIONS.find((v) => v.id === id) ?? MC_VERSIONS[MC_VERSIONS.length - 1];
}

/**
 * Erstellt den Inhalt der pack.mcmeta passend zur Zielversion.
 * Regeln laut Minecraft-Wiki / vanilla-mcdoc:
 *  - supported_formats darf NICHT gesetzt werden, wenn min_format ≥ 65 (1.21.9+) ist.
 *  - pack_format wird für ältere Clients weiterhin angegeben.
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

/** Versionsgrenzen für Modell-Features (abgeleitet aus Blockbench / Minecraft-Changelogs). */
export const MODEL_FEATURE_VERSIONS = {
  /** Beliebige Winkel zwischen -45° und 45° (vorher nur 22,5°-Schritte) */
  freeAngle: '1.21.6',
  /** Rotation auf mehreren Achsen bzw. Winkel über 45° */
  multiAxisRotation: '1.21.11',
  /** shade_direction_override an Elementen */
  shadeDirectionOverride: '26.3',
} as const;
