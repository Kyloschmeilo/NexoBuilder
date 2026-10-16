import { z } from 'zod';
import { S3Error } from './errors';

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

function invalid(message: string): S3Error {
  return new S3Error('invalidConfig', { message });
}

/** Why `endpoint` cannot be used, or null. HTTPS is required unless the host is the local machine (MinIO during development). */
function endpointProblem(endpoint: string): string | null {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return 'The endpoint is not a valid URL.';
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    return 'The endpoint must use HTTPS (plain HTTP is only allowed for localhost).';
  }
  if (url.username || url.password || url.search || url.hash) return 'The endpoint must not contain credentials, a query or a fragment.';
  return null;
}

/** Parses the endpoint; throws an `invalidConfig` {@link S3Error} when it cannot be used. */
export function parseEndpoint(endpoint: string): URL {
  const problem = endpointProblem(endpoint);
  if (problem) throw invalid(problem);
  return new URL(endpoint);
}

/** Why a public URL base (CDN or R2 public bucket domain) cannot be used, or null. */
function publicUrlBaseProblem(base: string): string | null {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return 'The public URL is not a valid URL.';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'The public URL must use HTTP or HTTPS.';
  if (url.username || url.password || url.search || url.hash) return 'The public URL must not contain credentials, a query or a fragment.';
  return null;
}

const KEYS_REQUIRED = 'The access key and secret key are required.';
const checked = (problem: (value: string) => string | null) => (value: string, ctx: z.RefinementCtx) => {
  const message = problem(value);
  if (message) ctx.addIssue({ code: 'custom', message });
};

/**
 * A client configuration as entered by the user (or stored): every field is checked, the region and access key are
 * trimmed. Error messages never contain the values, so the secret is not echoed.
 */
export const S3ClientConfigSchema = z.object({
  endpoint: z.string().superRefine(checked(endpointProblem)).optional(),
  region: z.string({ error: 'The region is required.' }).trim().min(1, 'The region is required.'),
  forcePathStyle: z.boolean().default(false),
  accessKeyId: z.string({ error: KEYS_REQUIRED }).trim().min(1, KEYS_REQUIRED),
  secretAccessKey: z.string({ error: KEYS_REQUIRED }).min(1, KEYS_REQUIRED),
}) satisfies z.ZodType<S3ClientConfig, unknown>;

/** A public URL base for {@link buildObjectUrl}. */
export const PublicUrlBaseSchema = z.string().superRefine(checked(publicUrlBaseProblem));

/** Parses `schema`; the first problem becomes an `invalidConfig` {@link S3Error}. */
function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? 'The storage configuration is invalid.');
  return parsed.data;
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
