/** Stable error codes the app translates; never derived from free-form SDK messages. */
export type S3ErrorCode =
  'invalidCredentials' | 'accessDenied' | 'noSuchBucket' | 'noSuchKey' | 'unreachable' | 'aclNotSupported' | 'invalidConfig' | 'unknown';

const MESSAGES: Record<S3ErrorCode, string> = {
  invalidCredentials: 'The access key or secret key was rejected.',
  accessDenied: 'Access denied.',
  noSuchBucket: 'The bucket does not exist.',
  noSuchKey: 'The object does not exist.',
  unreachable: 'The storage endpoint could not be reached.',
  aclNotSupported: 'The bucket does not support object ACLs (public-read).',
  invalidConfig: 'The storage configuration is invalid.',
  unknown: 'The storage request failed.',
};

/**
 * Error thrown by every operation of this package. The message only contains our own text plus the SDK error name,
 * HTTP status or network error code, never credentials or request details.
 */
export class S3Error extends Error {
  readonly code: S3ErrorCode;
  /** Error name reported by the SDK or service (e.g. `SignatureDoesNotMatch`, `ENOTFOUND`). */
  readonly detail?: string;
  readonly httpStatus?: number;

  constructor(code: S3ErrorCode, options: { message?: string; detail?: string; httpStatus?: number } = {}) {
    const suffix = [options.detail, options.httpStatus === undefined ? undefined : `HTTP ${options.httpStatus}`].filter(Boolean).join(', ');
    super(`${options.message ?? MESSAGES[code]}${suffix ? ` (${suffix})` : ''}`);
    this.name = 'S3Error';
    this.code = code;
    this.detail = options.detail;
    this.httpStatus = options.httpStatus;
  }
}

/** Whether the failed request was about a bucket or an object; decides what a bare 404 means. */
export type ErrorTarget = 'bucket' | 'object';

const CREDENTIAL_ERRORS = new Set([
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'InvalidToken',
  'ExpiredToken',
  'TokenRefreshRequired',
  'InvalidClientTokenId',
  'Unauthorized',
]);
const CONFIG_ERRORS = new Set([
  'InvalidBucketName',
  'AuthorizationHeaderMalformed',
  'PermanentRedirect',
  'IllegalLocationConstraintException',
  'InvalidRegion',
]);
// Node socket and TLS errors: the endpoint is down, unknown or not trusted
const NETWORK_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);
const NETWORK_NAMES = new Set(['TimeoutError', 'RequestTimeout', 'NetworkingError']);

function stringProp(value: object, key: string): string | undefined {
  const prop: unknown = Reflect.get(value, key);
  return typeof prop === 'string' && prop ? prop : undefined;
}

function httpStatusOf(value: object): number | undefined {
  const metadata: unknown = Reflect.get(value, '$metadata');
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  const status: unknown = Reflect.get(metadata, 'httpStatusCode');
  return typeof status === 'number' ? status : undefined;
}

function codeFor(name: string | undefined, networkCode: string | undefined, status: number | undefined, target: ErrorTarget): S3ErrorCode {
  if (networkCode && (NETWORK_CODES.has(networkCode) || networkCode.startsWith('ERR_SSL') || networkCode.startsWith('ERR_TLS'))) {
    return 'unreachable';
  }
  if (name) {
    if (name === 'AccessControlListNotSupported') return 'aclNotSupported';
    if (CREDENTIAL_ERRORS.has(name)) return 'invalidCredentials';
    if (name === 'NoSuchBucket') return 'noSuchBucket';
    if (name === 'NoSuchKey') return 'noSuchKey';
    if (name === 'AccessDenied' || name === 'Forbidden' || name === 'AllAccessDisabled') return 'accessDenied';
    if (CONFIG_ERRORS.has(name)) return 'invalidConfig';
    if (NETWORK_NAMES.has(name)) return 'unreachable';
  }
  if (status === 401) return 'invalidCredentials';
  if (status === 403) return 'accessDenied';
  if (status === 404 || name === 'NotFound') return target === 'bucket' ? 'noSuchBucket' : 'noSuchKey';
  if (status === 301) return 'invalidConfig';
  return 'unknown';
}

/** Maps any error thrown by the AWS SDK (or Node's network stack) to an {@link S3Error}. */
export function toS3Error(error: unknown, target: ErrorTarget = 'object'): S3Error {
  if (error instanceof S3Error) return error;
  if (typeof error !== 'object' || error === null) return new S3Error('unknown');
  // Service errors carry the S3 error code as `name` (and `Code`); Node network errors carry `code`
  const name = stringProp(error, 'Code') ?? stringProp(error, 'name');
  const networkCode = stringProp(error, 'code');
  const status = httpStatusOf(error);
  const code = codeFor(name, networkCode, status, target);
  const detail = networkCode ?? (name === 'Error' || name === 'Unknown' ? undefined : name);
  return new S3Error(code, { detail, httpStatus: status });
}
