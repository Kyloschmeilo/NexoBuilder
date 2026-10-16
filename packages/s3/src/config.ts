import { z } from 'zod';
import { invalidConfig, isS3ConfigProblem, S3Error, type S3ConfigProblem } from './errors';

export interface S3ClientConfig {
  /** Custom endpoint for S3-compatible services (R2, MinIO, …); omitted for AWS S3. */
  endpoint?: string;
  region: string;
  /** Address buckets as `endpoint/bucket` instead of `bucket.endpoint` (needed by MinIO and most self-hosted services). */
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Why `endpoint` cannot be used, or null. HTTPS is required unless the host is the local machine (MinIO during development). */
function endpointProblem(endpoint: string): S3ConfigProblem | null {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return 'endpointInvalid';
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) return 'endpointNotHttps';
  if (url.username || url.password || url.search || url.hash) return 'endpointHasExtras';
  return null;
}

/** Parses the endpoint; throws an `invalidConfig` {@link S3Error} when it cannot be used. */
export function parseEndpoint(endpoint: string): URL {
  const problem = endpointProblem(endpoint);
  if (problem) throw invalidConfig(problem);
  return new URL(endpoint);
}

/** Why a public URL base (CDN or R2 public bucket domain) cannot be used, or null. */
function publicUrlBaseProblem(base: string): S3ConfigProblem | null {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return 'publicUrlInvalid';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'publicUrlNotHttp';
  if (url.username || url.password || url.search || url.hash) return 'publicUrlHasExtras';
  return null;
}

/** A refinement whose issue message is the problem code (turned into an {@link S3Error} by parseOrThrow). */
const checked = (problem: (value: string) => S3ConfigProblem | null) => (value: string, ctx: z.RefinementCtx) => {
  const message = problem(value);
  if (message) ctx.addIssue({ code: 'custom', message });
};
const REGION_MISSING: S3ConfigProblem = 'regionMissing';
const KEYS_MISSING: S3ConfigProblem = 'keysMissing';

/**
 * A client configuration as entered by the user (or stored): every field is checked, the region and access key are
 * trimmed. Issue messages are problem codes and never contain the values, so the secret is not echoed.
 */
export const S3ClientConfigSchema = z.object({
  endpoint: z
    .string({ error: 'endpointInvalid' satisfies S3ConfigProblem })
    .superRefine(checked(endpointProblem))
    .optional(),
  region: z.string({ error: REGION_MISSING }).trim().min(1, REGION_MISSING),
  forcePathStyle: z.boolean().default(false),
  accessKeyId: z.string({ error: KEYS_MISSING }).trim().min(1, KEYS_MISSING),
  secretAccessKey: z.string({ error: KEYS_MISSING }).min(1, KEYS_MISSING),
}) satisfies z.ZodType<S3ClientConfig, unknown>;

/** A public URL base for {@link buildObjectUrl}. */
export const PublicUrlBaseSchema = z.string().superRefine(checked(publicUrlBaseProblem));

/** Parses `schema`; the first problem becomes an `invalidConfig` {@link S3Error}. */
function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  const message = parsed.error.issues[0]?.message ?? '';
  throw isS3ConfigProblem(message) ? invalidConfig(message) : new S3Error('invalidConfig');
}

/** The checked configuration; throws an `invalidConfig` {@link S3Error} when it cannot work. */
export function validateConfig(config: unknown): S3ClientConfig {
  return parseOrThrow(S3ClientConfigSchema, config);
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/**
 * URL of an object: `publicUrlBase/key` when given (CDN or R2 public bucket domain), otherwise the path-style or
 * virtual-hosted URL of the endpoint (or AWS S3 for the region).
 */
export function buildObjectUrl(config: S3ClientConfig, bucket: string, key: string, publicUrlBase?: string): string {
  const path = encodeKey(key);
  if (publicUrlBase) return `${parseOrThrow(PublicUrlBaseSchema, publicUrlBase).replace(/\/+$/, '')}/${path}`;
  const endpoint = config.endpoint ? parseEndpoint(config.endpoint) : new URL(`https://s3.${config.region}.amazonaws.com`);
  const base = endpoint.pathname.replace(/\/+$/, '');
  if (config.forcePathStyle) return `${endpoint.origin}${base}/${bucket}/${path}`;
  return `${endpoint.protocol}//${bucket}.${endpoint.host}${base}/${path}`;
}
