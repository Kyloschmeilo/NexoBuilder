import type { MessageKey } from '@resourcepackbuilder/i18n';

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

/** Why a configuration, bucket name or key is unusable (the reason of an `invalidConfig` error). */
export type S3ConfigProblem =
  | 'regionMissing'
  | 'keysMissing'
  | 'endpointInvalid'
  | 'endpointNotHttps'
  | 'endpointHasExtras'
  | 'publicUrlInvalid'
  | 'publicUrlNotHttp'
  | 'publicUrlHasExtras'
  | 'bucketInvalid'
  | 'prefixInvalid'
  | 'pathInvalid';

/** English texts of the problems (for logs; the UI translates {@link S3Error.messageKey}). */
const PROBLEM_MESSAGES: Record<S3ConfigProblem, string> = {
  regionMissing: 'The region is required.',
  keysMissing: 'The access key and secret key are required.',
  endpointInvalid: 'The endpoint is not a valid URL.',
  endpointNotHttps: 'The endpoint must use HTTPS (plain HTTP is only allowed for localhost).',
  endpointHasExtras: 'The endpoint must not contain credentials, a query or a fragment.',
  publicUrlInvalid: 'The public URL is not a valid URL.',
  publicUrlNotHttp: 'The public URL must use HTTP or HTTPS.',
  publicUrlHasExtras: 'The public URL must not contain credentials, a query or a fragment.',
  bucketInvalid: 'Invalid bucket name.',
  prefixInvalid: 'Invalid prefix.',
  pathInvalid: 'Invalid path.',
};

export function isS3ConfigProblem(value: string): value is S3ConfigProblem {
  return Object.hasOwn(PROBLEM_MESSAGES, value);
}

/** The message of an S3 error in the `desktopErrors` namespace (the desktop program reports S3 errors to the UI). */
export type S3MessageKey = Extract<MessageKey<'desktopErrors'>, `s3.${string}`>;

/**
 * Error thrown by every operation of this package. The message only contains our own text plus the SDK error name,
 * HTTP status or network error code, never credentials or request details.
 */
export class S3Error extends Error {
  readonly code: S3ErrorCode;
  /** For `invalidConfig`: what exactly is wrong. */
  readonly problem?: S3ConfigProblem;
  /** Error name reported by the SDK or service (e.g. `SignatureDoesNotMatch`, `ENOTFOUND`). */
  readonly detail?: string;
  readonly httpStatus?: number;

  constructor(code: S3ErrorCode, options: { problem?: S3ConfigProblem; detail?: string; httpStatus?: number } = {}) {
    const suffix = [options.detail, options.httpStatus === undefined ? undefined : `HTTP ${options.httpStatus}`].filter(Boolean).join(', ');
    super(`${options.problem ? PROBLEM_MESSAGES[options.problem] : MESSAGES[code]}${suffix ? ` (${suffix})` : ''}`);
    this.name = 'S3Error';
    this.code = code;
    this.problem = options.problem;
    this.detail = options.detail;
    this.httpStatus = options.httpStatus;
  }

  /** The translatable message: `s3.config.<problem>` or `s3.<code>` in the `desktopErrors` namespace. */
  get messageKey(): S3MessageKey {
    return this.problem ? `s3.config.${this.problem}` : `s3.${this.code}`;
  }
}

/** An `invalidConfig` error for `problem`. */
export function invalidConfig(problem: S3ConfigProblem): S3Error {
  return new S3Error('invalidConfig', { problem });
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
