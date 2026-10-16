import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { buildObjectUrl, validateConfig, type S3ClientConfig } from './config';
import { S3Error, toS3Error, type ErrorTarget } from './errors';
import { assertBucketName, contentTypeFor, listedKey, type ObjectKey } from './keys';

/** Bodies larger than this are uploaded as multipart uploads by {@link S3Storage.upload}. */
export const MULTIPART_THRESHOLD = 8 * 1024 * 1024;
const PART_SIZE = 8 * 1024 * 1024;
const PART_QUEUE_SIZE = 4;
const DELETE_BATCH_SIZE = 1000;
const CONNECTION_TIMEOUT_MS = 10_000;

export interface S3ObjectInfo {
  key: ObjectKey;
  size: number;
  /** Milliseconds since the epoch. */
  lastModified: number;
  /** ETag without the surrounding quotes. */
  etag: string;
}

export interface PutOptions {
  /** Defaults to {@link contentTypeFor} the key. */
  contentType?: string;
  /** Sets the `public-read` ACL; buckets without ACL support fail with `aclNotSupported`. */
  publicRead?: boolean;
}

export interface PutResult {
  key: ObjectKey;
  etag: string;
  size: number;
}

export type Body = string | Uint8Array;

export interface S3Storage {
  /** All objects under `prefix` (pagination handled), keys are full object keys. */
  listObjects(bucket: string, prefix: string): Promise<S3ObjectInfo[]>;
  /** UTF-8 content of an object, `null` when it does not exist. */
  getObjectText(bucket: string, key: ObjectKey): Promise<string | null>;
  /** Raw content of an object, `null` when it does not exist. */
  getObjectBytes(bucket: string, key: ObjectKey): Promise<Uint8Array | null>;
  /** Single-request upload. The service does not return a modification time; use {@link headObject} when needed. */
  putObject(bucket: string, key: ObjectKey, body: Body, options?: PutOptions): Promise<PutResult>;
  /** Multipart upload in 8 MB parts. */
  uploadLarge(bucket: string, key: ObjectKey, body: Body, options?: PutOptions): Promise<PutResult>;
  /** {@link putObject} up to {@link MULTIPART_THRESHOLD}, {@link uploadLarge} above. */
  upload(bucket: string, key: ObjectKey, body: Body, options?: PutOptions): Promise<PutResult>;
  /** Object metadata, `null` when it does not exist. */
  headObject(bucket: string, key: ObjectKey): Promise<S3ObjectInfo | null>;
  /** Deleting a missing object succeeds. */
  deleteObject(bucket: string, key: ObjectKey): Promise<void>;
  /** Deletes in batches of 1000; fails with the first per-key error the service reports. */
  deleteObjects(bucket: string, keys: readonly ObjectKey[]): Promise<void>;
  /**
   * Checks credentials and reachability. Without a bucket this lists the buckets, which needs account-wide
   * permission (`s3:ListAllMyBuckets`): R2 tokens scoped to single buckets and restricted MinIO users get
   * `accessDenied`, so pass the bucket for those. With a bucket: `HeadBucket`, then `ListObjectsV2` with one key (which
   * also gives the precise reason when `HeadBucket` was denied).
   */
  testConnection(bucket?: string): Promise<void>;
  /** See {@link buildObjectUrl}. */
  objectUrl(bucket: string, key: ObjectKey, publicUrlBase?: string): string;
  /** Closes the underlying sockets. */
  destroy(): void;
}

const encoder = new TextEncoder();

function toBytes(body: Body): Uint8Array {
  return typeof body === 'string' ? encoder.encode(body) : body;
}

function unquote(etag: string | undefined): string {
  return (etag ?? '').replace(/^"|"$/g, '');
}

async function attempt<T>(target: ErrorTarget, request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw toS3Error(error, target);
  }
}

/** `null` instead of a `noSuchKey` error. */
async function orNullWhenMissing<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await attempt('object', request);
  } catch (error) {
    if (error instanceof S3Error && error.code === 'noSuchKey') return null;
    throw error;
  }
}

/** Creates a client for one S3 account. Throws an `invalidConfig` {@link S3Error} for an unusable configuration. */
export function createS3Client(input: S3ClientConfig): S3Storage {
  const config = validateConfig(input);
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // Only send checksums S3 requires; several S3-compatible services reject the newer default checksum headers
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    requestHandler: { connectionTimeout: CONNECTION_TIMEOUT_MS },
  });

  function putInput(bucket: string, key: ObjectKey, body: Uint8Array, options: PutOptions) {
    assertBucketName(bucket);
    return {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType ?? contentTypeFor(key),
      ACL: options.publicRead ? ('public-read' as const) : undefined,
    };
  }

  const storage: S3Storage = {
    async listObjects(bucket, prefix) {
      assertBucketName(bucket);
      const objects: S3ObjectInfo[] = [];
      let continuationToken: string | undefined;
      do {
        const page = await attempt('bucket', () =>
          client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix || undefined, ContinuationToken: continuationToken })),
        );
        for (const object of page.Contents ?? []) {
          if (!object.Key) continue;
          objects.push({
            key: listedKey(object.Key),
            size: object.Size ?? 0,
            lastModified: object.LastModified?.getTime() ?? 0,
            etag: unquote(object.ETag),
          });
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);
      return objects;
    },

    async getObjectText(bucket, key) {
      assertBucketName(bucket);
      return orNullWhenMissing(async () => {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return response.Body ? response.Body.transformToString('utf-8') : '';
      });
    },

    async getObjectBytes(bucket, key) {
      assertBucketName(bucket);
      return orNullWhenMissing(async () => {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return response.Body ? response.Body.transformToByteArray() : new Uint8Array();
      });
    },

    async putObject(bucket, key, body, options = {}) {
      const bytes = toBytes(body);
      const input = putInput(bucket, key, bytes, options);
      const response = await attempt('object', () => client.send(new PutObjectCommand(input)));
      return { key, etag: unquote(response.ETag), size: bytes.byteLength };
    },

    async uploadLarge(bucket, key, body, options = {}) {
      const bytes = toBytes(body);
      const upload = new Upload({
        client,
        params: putInput(bucket, key, bytes, options),
        partSize: PART_SIZE,
        queueSize: PART_QUEUE_SIZE,
        leavePartsOnError: false,
      });
      const response = await attempt('object', () => upload.done());
      return { key, etag: unquote(response.ETag), size: bytes.byteLength };
    },

    async upload(bucket, key, body, options) {
      const bytes = toBytes(body);
      return bytes.byteLength > MULTIPART_THRESHOLD
        ? storage.uploadLarge(bucket, key, bytes, options)
        : storage.putObject(bucket, key, bytes, options);
    },

    async headObject(bucket, key) {
      assertBucketName(bucket);
      return orNullWhenMissing(async () => {
        const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return {
          key,
          size: response.ContentLength ?? 0,
          lastModified: response.LastModified?.getTime() ?? 0,
          etag: unquote(response.ETag),
        };
      });
    },

    async deleteObject(bucket, key) {
      assertBucketName(bucket);
      await attempt('object', () => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })));
    },

    async deleteObjects(bucket, keys) {
      assertBucketName(bucket);
      for (let start = 0; start < keys.length; start += DELETE_BATCH_SIZE) {
        const batch = keys.slice(start, start + DELETE_BATCH_SIZE);
        const response = await attempt('bucket', () =>
          client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((key) => ({ Key: key })), Quiet: true } })),
        );
        const [failure] = response.Errors ?? [];
        if (failure) throw toS3Error({ name: failure.Code }, 'object');
      }
    },

    async testConnection(bucket) {
      if (bucket === undefined) {
        await attempt('bucket', () => client.send(new ListBucketsCommand({})));
        return;
      }
      assertBucketName(bucket);
      try {
        await attempt('bucket', () => client.send(new HeadBucketCommand({ Bucket: bucket })));
      } catch (error) {
        // HEAD responses have no body, so a 403 cannot tell rejected credentials from missing permissions;
        // the listing below reports the precise reason (or succeeds when only HeadBucket is not permitted)
        if (!(error instanceof S3Error && error.code === 'accessDenied')) throw error;
      }
      await attempt('bucket', () => client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 })));
    },

    objectUrl(bucket, key, publicUrlBase) {
      assertBucketName(bucket);
      return buildObjectUrl(config, bucket, key, publicUrlBase);
    },

    destroy() {
      client.destroy();
    },
  };
  return storage;
}
