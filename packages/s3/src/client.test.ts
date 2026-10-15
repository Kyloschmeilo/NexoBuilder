import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createS3Client, MULTIPART_THRESHOLD, type S3Storage } from './client';

const s3 = mockClient(S3Client);
let storage: S3Storage;

function streamOf(content: string | Uint8Array) {
  return sdkStreamMixin(Readable.from([typeof content === 'string' ? Buffer.from(content) : content]));
}

function serviceError(name: string, status: number) {
  return Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } });
}

beforeEach(() => {
  s3.reset();
  storage = createS3Client({ region: 'eu-central-1', forcePathStyle: false, accessKeyId: 'AKID', secretAccessKey: 'secret' });
});

afterEach(() => storage.destroy());

describe('createS3Client', () => {
  it('validates the configuration', () => {
    expect(() => createS3Client({ region: '', forcePathStyle: false, accessKeyId: 'a', secretAccessKey: 'b' })).toThrow(
      expect.objectContaining({ code: 'invalidConfig' }),
    );
  });

  it('rejects invalid bucket names before sending', async () => {
    await expect(storage.getObjectText('Bad_Bucket', 'a')).rejects.toMatchObject({ code: 'invalidConfig' });
    expect(s3.calls()).toHaveLength(0);
  });
});

describe('listObjects', () => {
  it('follows continuation tokens', async () => {
    const date = new Date('2026-10-16T10:00:00Z');
    s3.on(ListObjectsV2Command, { ContinuationToken: undefined })
      .resolves({
        IsTruncated: true,
        NextContinuationToken: 't1',
        Contents: [{ Key: 'p/a.json', Size: 3, LastModified: date, ETag: '"e1"' }],
      })
      .on(ListObjectsV2Command, { ContinuationToken: 't1' })
      .resolves({ IsTruncated: false, Contents: [{ Key: 'p/b.png', Size: 5, LastModified: date, ETag: '"e2"' }] });

    const objects = await storage.listObjects('packs', 'p/');

    expect(objects).toEqual([
      { key: 'p/a.json', size: 3, lastModified: date.getTime(), etag: 'e1' },
      { key: 'p/b.png', size: 5, lastModified: date.getTime(), etag: 'e2' },
    ]);
    const calls = s3.commandCalls(ListObjectsV2Command);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.args[0].input).toMatchObject({ Bucket: 'packs', Prefix: 'p/' });
  });

  it('returns an empty list for an empty prefix', async () => {
    s3.on(ListObjectsV2Command).resolves({});
    expect(await storage.listObjects('packs', '')).toEqual([]);
  });

  it('maps a missing bucket', async () => {
    s3.on(ListObjectsV2Command).rejects(serviceError('NoSuchBucket', 404));
    await expect(storage.listObjects('packs', '')).rejects.toMatchObject({ code: 'noSuchBucket' });
  });
});

describe('getObjectText / getObjectBytes', () => {
  it('reads text and bytes', async () => {
    s3.on(GetObjectCommand, { Key: 'a.json' }).resolves({ Body: streamOf('{"ä":1}') });
    s3.on(GetObjectCommand, { Key: 'a.png' }).resolves({ Body: streamOf(new Uint8Array([1, 2, 3])) });

    expect(await storage.getObjectText('packs', 'a.json')).toBe('{"ä":1}');
    expect(Array.from((await storage.getObjectBytes('packs', 'a.png')) ?? [])).toEqual([1, 2, 3]);
  });

  it('returns null for missing objects', async () => {
    s3.on(GetObjectCommand).rejects(serviceError('NoSuchKey', 404));
    expect(await storage.getObjectText('packs', 'missing')).toBeNull();
    expect(await storage.getObjectBytes('packs', 'missing')).toBeNull();
  });

  it('still fails for a missing bucket or denied access', async () => {
    s3.on(GetObjectCommand).rejectsOnce(serviceError('NoSuchBucket', 404)).rejectsOnce(serviceError('AccessDenied', 403));
    await expect(storage.getObjectText('packs', 'a')).rejects.toMatchObject({ code: 'noSuchBucket' });
    await expect(storage.getObjectBytes('packs', 'a')).rejects.toMatchObject({ code: 'accessDenied' });
  });
});

describe('putObject', () => {
  it('uploads with the derived content type and returns the unquoted etag', async () => {
    s3.on(PutObjectCommand).resolves({ ETag: '"abc"' });

    const result = await storage.putObject('packs', 'p/pack.mcmeta', '{"pack":{}}');

    expect(result).toEqual({ key: 'p/pack.mcmeta', etag: 'abc', size: 11 });
    const input = s3.commandCalls(PutObjectCommand)[0]?.args[0].input;
    expect(input).toMatchObject({ Bucket: 'packs', Key: 'p/pack.mcmeta', ContentType: 'application/json' });
    expect(input?.ACL).toBeUndefined();
  });

  it('sets public-read and an explicit content type', async () => {
    s3.on(PutObjectCommand).resolves({ ETag: '"abc"' });
    await storage.putObject('packs', 'a.bin', new Uint8Array(4), { contentType: 'application/zip', publicRead: true });
    expect(s3.commandCalls(PutObjectCommand)[0]?.args[0].input).toMatchObject({ ACL: 'public-read', ContentType: 'application/zip' });
  });

  it('maps buckets without ACL support', async () => {
    s3.on(PutObjectCommand).rejects(serviceError('AccessControlListNotSupported', 400));
    await expect(storage.putObject('packs', 'a.zip', 'x', { publicRead: true })).rejects.toMatchObject({ code: 'aclNotSupported' });
  });

  it('maps invalid credentials', async () => {
    s3.on(PutObjectCommand).rejects(serviceError('SignatureDoesNotMatch', 403));
    await expect(storage.putObject('packs', 'a.zip', 'x')).rejects.toMatchObject({ code: 'invalidCredentials' });
  });
});

describe('upload', () => {
  it('uses a single PutObject up to the threshold', async () => {
    s3.on(PutObjectCommand).resolves({ ETag: '"small"' });
    const result = await storage.upload('packs', 'a.zip', new Uint8Array(MULTIPART_THRESHOLD));
    expect(result.etag).toBe('small');
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(1);
    expect(s3.commandCalls(CreateMultipartUploadCommand)).toHaveLength(0);
  });

  it('switches to a multipart upload above the threshold', async () => {
    s3.on(CreateMultipartUploadCommand).resolves({ UploadId: 'u1' });
    s3.on(UploadPartCommand).resolves({ ETag: '"part"' });
    s3.on(CompleteMultipartUploadCommand).resolves({ ETag: '"multi"' });

    const result = await storage.upload('packs', 'a.zip', new Uint8Array(MULTIPART_THRESHOLD + 1), { publicRead: true });

    expect(result).toEqual({ key: 'a.zip', etag: 'multi', size: MULTIPART_THRESHOLD + 1 });
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
    expect(s3.commandCalls(CreateMultipartUploadCommand)[0]?.args[0].input).toMatchObject({
      Bucket: 'packs',
      Key: 'a.zip',
      ACL: 'public-read',
      ContentType: 'application/zip',
    });
    expect(s3.commandCalls(UploadPartCommand)).toHaveLength(2);
  });

  it('maps multipart failures', async () => {
    s3.on(CreateMultipartUploadCommand).rejects(serviceError('AccessControlListNotSupported', 400));
    await expect(
      storage.uploadLarge('packs', 'a.zip', new Uint8Array(MULTIPART_THRESHOLD + 1), { publicRead: true }),
    ).rejects.toMatchObject({
      code: 'aclNotSupported',
    });
  });
});

describe('headObject', () => {
  it('returns metadata', async () => {
    const date = new Date('2026-01-01T00:00:00Z');
    s3.on(HeadObjectCommand).resolves({ ContentLength: 42, LastModified: date, ETag: '"e"' });
    expect(await storage.headObject('packs', 'a.zip')).toEqual({ key: 'a.zip', size: 42, lastModified: date.getTime(), etag: 'e' });
  });

  it('returns null for a bodyless 404', async () => {
    s3.on(HeadObjectCommand).rejects(serviceError('NotFound', 404));
    expect(await storage.headObject('packs', 'a.zip')).toBeNull();
  });
});

describe('deleteObject / deleteObjects', () => {
  it('deletes one object', async () => {
    s3.on(DeleteObjectCommand).resolves({});
    await storage.deleteObject('packs', 'a.zip');
    expect(s3.commandCalls(DeleteObjectCommand)[0]?.args[0].input).toEqual({ Bucket: 'packs', Key: 'a.zip' });
  });

  it('deletes in batches of 1000', async () => {
    s3.on(DeleteObjectsCommand).resolves({});
    const keys = Array.from({ length: 2001 }, (_, index) => `k${index}`);

    await storage.deleteObjects('packs', keys);

    const sizes = s3.commandCalls(DeleteObjectsCommand).map((call) => call.args[0].input.Delete?.Objects?.length);
    expect(sizes).toEqual([1000, 1000, 1]);
  });

  it('sends nothing for no keys', async () => {
    await storage.deleteObjects('packs', []);
    expect(s3.calls()).toHaveLength(0);
  });

  it('fails with the first per-key error', async () => {
    s3.on(DeleteObjectsCommand).resolves({ Errors: [{ Key: 'a', Code: 'AccessDenied' }] });
    await expect(storage.deleteObjects('packs', ['a'])).rejects.toMatchObject({ code: 'accessDenied' });
  });
});

describe('testConnection', () => {
  it('lists buckets without a bucket', async () => {
    s3.on(ListBucketsCommand).resolves({ Buckets: [] });
    await storage.testConnection();
    expect(s3.commandCalls(ListBucketsCommand)).toHaveLength(1);
  });

  it('heads the bucket and lists one key', async () => {
    s3.on(HeadBucketCommand).resolves({});
    s3.on(ListObjectsV2Command).resolves({});
    await storage.testConnection('packs');
    expect(s3.commandCalls(HeadBucketCommand)).toHaveLength(1);
    expect(s3.commandCalls(ListObjectsV2Command)[0]?.args[0].input).toEqual({ Bucket: 'packs', MaxKeys: 1 });
  });

  it.each([
    [serviceError('NotFound', 404), 'noSuchBucket'],
    [serviceError('InvalidAccessKeyId', 403), 'invalidCredentials'],
    [Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }), 'unreachable'],
  ])('maps HeadBucket failure %#', async (error, code) => {
    s3.on(HeadBucketCommand).rejects(error);
    await expect(storage.testConnection('packs')).rejects.toMatchObject({ code });
  });

  it.each([
    [serviceError('InvalidAccessKeyId', 403), 'invalidCredentials'],
    [serviceError('AccessDenied', 403), 'accessDenied'],
  ])('lets the listing explain a bodyless HeadBucket 403 (%#)', async (listingError, code) => {
    s3.on(HeadBucketCommand).rejects(serviceError('Unknown', 403));
    s3.on(ListObjectsV2Command).rejects(listingError);
    await expect(storage.testConnection('packs')).rejects.toMatchObject({ code });
  });

  it('accepts a denied HeadBucket when listing works', async () => {
    s3.on(HeadBucketCommand).rejects(serviceError('Unknown', 403));
    s3.on(ListObjectsV2Command).resolves({});
    await expect(storage.testConnection('packs')).resolves.toBeUndefined();
  });

  it('reports a listing failure after a successful HeadBucket', async () => {
    s3.on(HeadBucketCommand).resolves({});
    s3.on(ListObjectsV2Command).rejects(serviceError('AccessDenied', 403));
    await expect(storage.testConnection('packs')).rejects.toMatchObject({ code: 'accessDenied' });
  });
});

describe('objectUrl', () => {
  it('builds virtual-hosted URLs and validates the bucket', () => {
    expect(storage.objectUrl('packs', 'a.zip')).toBe('https://packs.s3.eu-central-1.amazonaws.com/a.zip');
    expect(() => storage.objectUrl('Bad_Bucket', 'a.zip')).toThrow(expect.objectContaining({ code: 'invalidConfig' }));
  });
});
