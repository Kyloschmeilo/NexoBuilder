import { describe, expect, it } from 'vitest';
import { S3Error, toS3Error } from './errors';

function serviceError(name: string, status?: number) {
  return Object.assign(new Error('service message with SECRET'), {
    name,
    $metadata: status === undefined ? {} : { httpStatusCode: status },
  });
}

function networkError(code: string) {
  return Object.assign(new Error(`connect ${code} 10.0.0.1:443`), { code });
}

describe('toS3Error', () => {
  it.each([
    ['AccessControlListNotSupported', 400, 'aclNotSupported'],
    ['InvalidAccessKeyId', 403, 'invalidCredentials'],
    ['SignatureDoesNotMatch', 403, 'invalidCredentials'],
    ['ExpiredToken', 400, 'invalidCredentials'],
    ['NoSuchBucket', 404, 'noSuchBucket'],
    ['NoSuchKey', 404, 'noSuchKey'],
    ['AccessDenied', 403, 'accessDenied'],
    ['InvalidBucketName', 400, 'invalidConfig'],
    ['AuthorizationHeaderMalformed', 400, 'invalidConfig'],
    ['TimeoutError', undefined, 'unreachable'],
    ['InternalError', 500, 'unknown'],
  ] as const)('maps %s to %s', (name, status, code) => {
    expect(toS3Error(serviceError(name, status)).code).toBe(code);
  });

  it('prefers the S3 `Code` over the name', () => {
    expect(toS3Error(Object.assign(new Error('x'), { Code: 'NoSuchBucket' })).code).toBe('noSuchBucket');
  });

  it('falls back to the HTTP status for bodyless responses (HEAD requests)', () => {
    expect(toS3Error(serviceError('Unknown', 401)).code).toBe('invalidCredentials');
    expect(toS3Error(serviceError('Unknown', 403)).code).toBe('accessDenied');
    expect(toS3Error(serviceError('NotFound', 404), 'object').code).toBe('noSuchKey');
    expect(toS3Error(serviceError('NotFound', 404), 'bucket').code).toBe('noSuchBucket');
    expect(toS3Error(serviceError('Unknown', 301)).code).toBe('invalidConfig');
  });

  it.each([
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'ERR_SSL_WRONG_VERSION_NUMBER',
  ])('maps network error %s to unreachable', (code) => {
    const error = toS3Error(networkError(code));
    expect(error.code).toBe('unreachable');
    expect(error.detail).toBe(code);
  });

  it('never copies the SDK message', () => {
    const error = toS3Error(serviceError('SignatureDoesNotMatch', 403));
    expect(error).toBeInstanceOf(S3Error);
    expect(error.message).not.toContain('SECRET');
    expect(error.message).toContain('SignatureDoesNotMatch');
    expect(error.httpStatus).toBe(403);
  });

  it('keeps S3Errors and handles non-errors', () => {
    const original = new S3Error('noSuchKey');
    expect(toS3Error(original)).toBe(original);
    expect(toS3Error('boom').code).toBe('unknown');
    expect(toS3Error(null).code).toBe('unknown');
  });
});
