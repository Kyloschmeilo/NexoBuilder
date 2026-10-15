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

/** Parses the endpoint; HTTPS is required unless the host is the local machine (MinIO during development). */
export function parseEndpoint(endpoint: string): URL {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw invalid('The endpoint is not a valid URL.');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    throw invalid('The endpoint must use HTTPS (plain HTTP is only allowed for localhost).');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw invalid('The endpoint must not contain credentials, a query or a fragment.');
  }
  return url;
}

/** Throws an `invalidConfig` {@link S3Error} when the configuration cannot work. */
export function validateConfig(config: S3ClientConfig): void {
  if (!config.region.trim()) throw invalid('The region is required.');
  if (!config.accessKeyId.trim() || !config.secretAccessKey) throw invalid('The access key and secret key are required.');
  if (config.endpoint !== undefined) parseEndpoint(config.endpoint);
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
  if (publicUrlBase) return `${publicUrlBase.replace(/\/+$/, '')}/${path}`;
  const endpoint = config.endpoint ? parseEndpoint(config.endpoint) : new URL(`https://s3.${config.region}.amazonaws.com`);
  const base = endpoint.pathname.replace(/\/+$/, '');
  if (config.forcePathStyle) return `${endpoint.origin}${base}/${bucket}/${path}`;
  return `${endpoint.protocol}//${bucket}.${endpoint.host}${base}/${path}`;
}
