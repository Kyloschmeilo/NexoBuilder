import { S3Error } from './errors';

const BUCKET_NAME = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const IP_ADDRESS = /^\d{1,3}(\.\d{1,3}){3}$/;

/** S3 bucket naming rules (3–63 chars, lowercase letters, digits, dots and hyphens, not an IP address). */
export function isValidBucketName(name: string): boolean {
  return BUCKET_NAME.test(name) && !name.includes('..') && !name.includes('.-') && !name.includes('-.') && !IP_ADDRESS.test(name);
}

export function assertBucketName(name: string): void {
  if (!isValidBucketName(name)) throw new S3Error('invalidConfig', { message: 'Invalid bucket name.' });
}

/** Splits a slash-separated path into segments, rejecting anything that could leave the prefix it is joined to. */
function safeSegments(path: string, what: string): string[] {
  const invalid = () => new S3Error('invalidConfig', { message: `Invalid ${what}.` });
  if (path.includes('\\') || /^[a-zA-Z]:/.test(path) || path.includes('\0')) throw invalid();
  const segments = path.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) throw invalid();
  return segments;
}

/**
 * Joins a prefix and a relative path into an object key confined to that prefix. Leading and trailing slashes of the
 * prefix are ignored (an empty prefix means the bucket root); the relative path must not be absolute, contain
 * backslashes, empty segments, `.` or `..`.
 */
export function joinKey(prefix: string, relativePath: string): string {
  const trimmedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const prefixSegments = trimmedPrefix ? safeSegments(trimmedPrefix, 'prefix') : [];
  return [...prefixSegments, ...safeSegments(relativePath, 'path')].join('/');
}

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  json: 'application/json',
  mcmeta: 'application/json',
  ogg: 'audio/ogg',
  zip: 'application/zip',
  yml: 'application/yaml',
  yaml: 'application/yaml',
  txt: 'text/plain; charset=utf-8',
};

/** Content type for a resource pack file, by extension; `application/octet-stream` when unknown. */
export function contentTypeFor(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return (dot > 0 && CONTENT_TYPES[name.slice(dot + 1).toLowerCase()]) || 'application/octet-stream';
}
