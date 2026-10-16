import { describe, expect, it } from 'vitest';
import { buildObjectUrl, validateConfig, type S3ClientConfig } from './config';

const aws: S3ClientConfig = { region: 'eu-central-1', forcePathStyle: false, accessKeyId: 'AKID', secretAccessKey: 'secret' };

describe('validateConfig', () => {
  it('accepts AWS, HTTPS endpoints and local HTTP', () => {
    expect(() => validateConfig(aws)).not.toThrow();
    expect(() => validateConfig({ ...aws, endpoint: 'https://acc.r2.cloudflarestorage.com' })).not.toThrow();
    expect(() => validateConfig({ ...aws, endpoint: 'http://localhost:9000' })).not.toThrow();
    expect(() => validateConfig({ ...aws, endpoint: 'http://127.0.0.1:9000' })).not.toThrow();
  });

  it.each([
    { ...aws, region: ' ' },
    { ...aws, accessKeyId: '' },
    { ...aws, secretAccessKey: '' },
    { ...aws, endpoint: 'http://minio.example.com' },
    { ...aws, endpoint: 'ftp://localhost' },
    { ...aws, endpoint: 'not a url' },
    { ...aws, endpoint: 'https://user:pass@s3.example.com' },
  ])('rejects %j', (config) => {
    expect(() => validateConfig(config)).toThrow(expect.objectContaining({ code: 'invalidConfig' }));
  });

  it.each([{}, null, 'config', { ...aws, region: undefined }, { ...aws, accessKeyId: 5 }, { ...aws, endpoint: 42 }])(
    'rejects malformed input %j without crashing',
    (config) => {
      expect(() => validateConfig(config)).toThrow(expect.objectContaining({ code: 'invalidConfig' }));
    },
  );

  it('returns the checked configuration with trimmed region and key', () => {
    expect(validateConfig({ region: ' eu-central-1 ', accessKeyId: ' AKID ', secretAccessKey: 's' })).toEqual({
      region: 'eu-central-1',
      forcePathStyle: false,
      accessKeyId: 'AKID',
      secretAccessKey: 's',
    });
  });

  it('does not echo the secret', () => {
    try {
      validateConfig({ ...aws, secretAccessKey: 'TOPSECRET', endpoint: 'http://TOPSECRET.example.com' });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain('TOPSECRET');
    }
  });
});

describe('buildObjectUrl', () => {
  it('uses virtual-hosted AWS URLs by default', () => {
    expect(buildObjectUrl(aws, 'packs', 'a/my pack.zip')).toBe('https://packs.s3.eu-central-1.amazonaws.com/a/my%20pack.zip');
  });

  it('uses path-style AWS URLs when forced', () => {
    expect(buildObjectUrl({ ...aws, forcePathStyle: true }, 'packs', 'a.zip')).toBe('https://s3.eu-central-1.amazonaws.com/packs/a.zip');
  });

  it('builds custom endpoint URLs in both styles', () => {
    const minio = { ...aws, endpoint: 'http://localhost:9000/', forcePathStyle: true };
    expect(buildObjectUrl(minio, 'packs', 'x/a.zip')).toBe('http://localhost:9000/packs/x/a.zip');
    const hosted = { ...aws, endpoint: 'https://storage.example.com' };
    expect(buildObjectUrl(hosted, 'packs', 'a.zip')).toBe('https://packs.storage.example.com/a.zip');
  });

  it('prefers the public URL base', () => {
    expect(buildObjectUrl(aws, 'packs', 'a/b#1.zip', 'https://cdn.example.com/files/')).toBe('https://cdn.example.com/files/a/b%231.zip');
  });

  it.each(['cdn.example.com', 'javascript:alert(1)', 'https://cdn.example.com/?x=1', 'https://u:p@cdn.example.com'])(
    'rejects the public URL base %s',
    (base) => {
      expect(() => buildObjectUrl(aws, 'packs', 'a.zip', base)).toThrow(expect.objectContaining({ code: 'invalidConfig' }));
    },
  );
});
