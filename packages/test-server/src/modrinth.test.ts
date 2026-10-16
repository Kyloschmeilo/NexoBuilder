import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { craftEngineVersionsUrl, modrinthVersionsSchema, pickCraftEngineVersion, type ModrinthVersion } from './modrinth';

/** A trimmed answer of the Modrinth version list (both builds of 26.9.2, the Paper builds of 26.9.1, two alphas). */
const FIXTURE: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL('./craftEngine/__fixtures__/modrinth-versions.json', import.meta.url)), 'utf8'),
);
const versions = modrinthVersionsSchema.parse(FIXTURE);

describe('the Modrinth version list', () => {
  it('asks Modrinth for the Paper build of a Minecraft version', () => {
    const url = new URL(craftEngineVersionsUrl('1.21.11'));
    expect(url.origin + url.pathname).toBe('https://api.modrinth.com/v2/project/craftengine/version');
    expect(url.searchParams.get('loaders')).toBe('["paper"]');
    expect(url.searchParams.get('game_versions')).toBe('["1.21.11"]');
  });

  it('parses the real answer and drops entries that do not fit', () => {
    expect(versions).toHaveLength(5);
    expect(modrinthVersionsSchema.parse([...(FIXTURE as unknown[]), { version_number: 1 }, null])).toHaveLength(5);
    expect(modrinthVersionsSchema.safeParse({}).success).toBe(false);
  });
});

describe('pickCraftEngineVersion', () => {
  it('picks the newest Paper build (betas count, the Bukkit build never does)', () => {
    expect(pickCraftEngineVersion(versions, '26.3')).toEqual({
      version: '26.9.2',
      url: expect.stringMatching(/^https:\/\/cdn\.modrinth\.com\/.*\/craft-engine-paper-plugin-26\.9\.2\.jar$/),
      filename: 'craft-engine-paper-plugin-26.9.2.jar',
      sha512: expect.stringMatching(/^[0-9a-f]{128}$/),
    });
    expect(pickCraftEngineVersion(versions, '1.21.8')?.version).toBe('26.9.2');
  });

  it('only picks versions that list the Paper version', () => {
    const without2692 = versions.filter((v) => v.version_number !== '26.9.2');
    expect(pickCraftEngineVersion(without2692, '26.2')?.version).toBe('26.9.1');
    expect(pickCraftEngineVersion(without2692, '26.3')).toBeNull();
    expect(pickCraftEngineVersion(without2692, '1.21.11')?.version).toBe('26.9.1');
    expect(pickCraftEngineVersion(versions, '1.19.4')).toBeNull();
    expect(pickCraftEngineVersion([], '26.3')).toBeNull();
  });

  it('prefers a release over a newer beta, and a beta over a newer alpha', () => {
    const paper = versions.find((v) => v.version_number === '26.9.1' && v.loaders.includes('paper')) as ModrinthVersion;
    const asRelease: ModrinthVersion = {
      ...paper,
      version_number: '26.0',
      version_type: 'release',
      date_published: '2026-01-01T00:00:00Z',
    };
    expect(pickCraftEngineVersion([...versions, asRelease], '26.2')?.version).toBe('26.0');
    const newAlpha: ModrinthVersion = { ...paper, version_number: '27.0', version_type: 'alpha', date_published: '2027-01-01T00:00:00Z' };
    expect(pickCraftEngineVersion([...versions, newAlpha], '26.2')?.version).toBe('26.9.2');
    expect(pickCraftEngineVersion([newAlpha], '26.2')?.version).toBe('27.0');
  });

  it('skips versions without a matching JAR file', () => {
    const paper = versions.find((v) => v.version_number === '26.9.2' && v.loaders.includes('paper')) as ModrinthVersion;
    const renamed = (paper.files as Array<Record<string, unknown>>).map((file) => ({ ...file, filename: '../evil.jar' }));
    const noHash = (paper.files as Array<Record<string, unknown>>).map((file) => ({ ...file, hashes: { sha1: 'x' } }));
    expect(pickCraftEngineVersion([{ ...paper, files: renamed }], '26.3')).toBeNull();
    expect(pickCraftEngineVersion([{ ...paper, files: noHash }], '26.3')).toBeNull();
  });

  it("only downloads from CraftEngine's folder on Modrinth's CDN", () => {
    const paper = versions.find((v) => v.version_number === '26.9.2' && v.loaders.includes('paper')) as ModrinthVersion;
    const file = (paper.files as Array<Record<string, unknown>>)[0];
    const at = (url: string) => pickCraftEngineVersion([{ ...paper, files: [{ ...file, url }] }], '26.3');
    expect(at('https://cdn.modrinth.com/data/tRX6FMfQ/versions/x/craft-engine-paper-plugin-26.9.2.jar')).not.toBeNull();
    for (const url of [
      'https://evil.example/data/tRX6FMfQ/versions/x/craft-engine-paper-plugin-26.9.2.jar',
      'https://cdn.modrinth.com.evil.example/data/tRX6FMfQ/x.jar',
      'https://cdn.modrinth.com:8443/data/tRX6FMfQ/x.jar',
      'https://user@cdn.modrinth.com/data/tRX6FMfQ/x.jar',
      'https://cdn.modrinth.com/data/OtherProj/versions/x/craft-engine-paper-plugin-26.9.2.jar',
      'https://cdn.modrinth.com/data/tRX6FMfQ/../OtherProj/x.jar',
      'http://cdn.modrinth.com/data/tRX6FMfQ/x.jar',
    ]) {
      expect(at(url), url).toBeNull();
    }
  });
});
