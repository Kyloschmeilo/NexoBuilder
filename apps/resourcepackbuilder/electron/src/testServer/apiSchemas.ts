/**
 * The parts of the PaperMC "fill" API (https://fill.papermc.io) and the Eclipse Adoptium API (https://api.adoptium.net)
 * the test server relies on. Responses are checked against these instead of being guessed at.
 */
import { z } from 'zod';

const sha256 = z.string().regex(/^[0-9a-fA-F]{64}$/);
const httpsUrl = z.url({ protocol: /^https$/ });

/** GET /v3/projects/paper: the versions, grouped by major version. */
export const paperProjectSchema = z.object({
  versions: z.record(z.string(), z.array(z.string())),
});

/** One build of GET /v3/projects/paper/versions/{version}/builds (other builds in the list may differ). */
export const paperBuildSchema = z.object({
  id: z.number().int().nonnegative(),
  channel: z.string(),
  downloads: z.object({
    'server:default': z.object({
      name: z.string(),
      url: httpsUrl,
      checksums: z.object({ sha256 }),
    }),
  }),
});
export type PaperBuild = z.infer<typeof paperBuildSchema>;

export const paperBuildsSchema = z.array(z.unknown());

/** GET /v3/projects/paper/versions/{version}: only the minimum Java version is used. */
export const paperVersionSchema = z.object({
  version: z.object({ java: z.object({ version: z.object({ minimum: z.number().int().positive() }) }) }),
});

/** GET /v3/assets/latest/{feature}/hotspot: the newest JRE package for this platform. */
export const adoptiumAssetsSchema = z.array(
  z.object({
    binary: z.object({
      package: z.object({
        name: z.string().regex(/^[\w.+-]+$/),
        link: httpsUrl,
        checksum: sha256,
      }),
    }),
  }),
);

/** GET /v3/checksum/…: "<sha256>  <file name>". */
export const adoptiumChecksumSchema = z
  .string()
  .transform((text) => /^([0-9a-fA-F]{64})\b/.exec(text.trim())?.[1] ?? null)
  .pipe(sha256);
