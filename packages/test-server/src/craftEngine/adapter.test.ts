import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseServerLogLine } from '../serverLog';
import { CRAFT_ENGINE_SERVER_ADAPTER as ce } from './adapter';
import { patchCraftEngineConfig } from './config';

/** config.yml as it ships in the CraftEngine JAR. */
const JAR_CONFIG = readFileSync(fileURLToPath(new URL('./__fixtures__/config.yml', import.meta.url)), 'utf8');
/** Console lines of a real test server run (paths shortened); "> …" lines are the commands sent. */
const LOG = readFileSync(fileURLToPath(new URL('./__fixtures__/log.txt', import.meta.url)), 'utf8').split(/\r?\n/);

const selfHost = (text: string) => (parse(text) as { 'resource-pack': Record<string, Record<string, unknown>> })['resource-pack'];

describe('patchCraftEngineConfig', () => {
  it('creates a small file when there is none', () => {
    for (const current of [null, '', '  \n']) {
      const patched = patchCraftEngineConfig(current, { packPort: 8082 });
      expect(patched).toContain('Created by ResourcepackBuilder');
      expect(parse(patched)).toMatchObject({ 'forced-locale': 'en' });
      expect(selfHost(patched)).toEqual({
        'self-host': { ip: '127.0.0.1', port: 8082, one_time_token: false },
        delivery: { 'send-on-join': true, 'kick-if-declined': false },
      });
    }
  });

  it('sets the values in the real config.yml and keeps everything else, comments included', () => {
    const patched = patchCraftEngineConfig(JAR_CONFIG, { packPort: 8090 });
    const pack = selfHost(patched);
    expect(pack['self-host']).toMatchObject({ ip: '127.0.0.1', port: 8090, one_time_token: false, protocol: 'http' });
    expect(pack.delivery).toMatchObject({ 'send-on-join': true, 'kick-if-declined': false, 'kick-if-failed-to-apply': false });
    // Every other value stays as it was
    const expected = parse(JAR_CONFIG) as { 'forced-locale': string; 'resource-pack': Record<string, Record<string, unknown>> };
    expected['forced-locale'] = 'en';
    Object.assign(expected['resource-pack']['self-host'], { ip: '127.0.0.1', port: 8090, one_time_token: false });
    Object.assign(expected['resource-pack'].delivery, { 'kick-if-declined': false });
    expect(parse(patched)).toEqual(expected);
    // Every comment survives (the YAML library may change the spacing in front of it)
    const comments = (text: string) => text.match(/#.*$/gm)?.map((comment) => comment.trim()) ?? [];
    expect(comments(patched)).toEqual(comments(JAR_CONFIG));
  });

  it('returns the text unchanged when everything is already set', () => {
    const once = patchCraftEngineConfig(JAR_CONFIG, { packPort: 8082 });
    expect(patchCraftEngineConfig(once, { packPort: 8082 })).toBe(once);
    // CraftEngine may write the values as text
    const asText = once.replace('port: 8082', 'port: "8082"').replace('one_time_token: false', 'one_time_token: "false"');
    expect(patchCraftEngineConfig(asText, { packPort: 8082 })).toBe(asText);
    expect(patchCraftEngineConfig(once, { packPort: 9000 })).toContain('port: 9000');
  });

  it('rewrites a broken file with only its own values', () => {
    const patched = patchCraftEngineConfig('resource-pack: [unclosed', { packPort: 8082 });
    expect(selfHost(patched)['self-host']).toEqual({ ip: '127.0.0.1', port: 8082, one_time_token: false });
  });
});

describe('the CraftEngine adapter', () => {
  it('gives items as "ce item give <player> <id> <amount>"', () => {
    expect(ce.giveCommand('testpack:ruby', 2, 'Steve')).toBe('ce item give Steve testpack:ruby 2');
    expect(ce.giveCommand('testpack:ruby', 0, 'Steve')).toBe('ce item give Steve testpack:ruby 1');
    expect(ce.giveCommand('testpack:ruby', 50_000, 'Steve')).toBe('ce item give Steve testpack:ruby 9999');
    expect(() => ce.giveCommand('ruby 64 @a', 1, 'Steve')).toThrow(RangeError);
    expect(() => ce.giveCommand('ruby', 1, '@a')).toThrow(RangeError);
  });

  it('reloads with "ce reload all" and recognises the user\'s reloads that rebuild the pack', () => {
    expect(ce.reloadCommand).toBe('ce reload all');
    for (const command of ['ce reload all', '/ce reload all', 'craftengine reload pack', ' CE RELOAD PACK ']) {
      expect(ce.isReloadCommand(command), command).toBe(true);
    }
    // "ce reload" is "ce reload config": the configs only, no pack (see the fixture log)
    for (const command of [
      'ce reload',
      'ce reload config',
      'ce reload recipe',
      'ce reload host',
      'ce reload allx',
      'ce item give Steve a:b',
      'nexo reload all',
      'reload',
      'ce reloadx',
    ]) {
      expect(ce.isReloadCommand(command), command).toBe(false);
    }
  });

  it('sends the pack again with "ce feature send-pack <player>"', () => {
    expect(ce.resendPackCommand('Steve')).toBe('ce feature send-pack Steve');
    expect(() => ce.resendPackCommand('@a')).toThrow(RangeError);
  });

  it('only lets the project write its own pack under resources/', () => {
    const project = { packName: 'test_pack' };
    expect(ce.syncPathSegments('resources/test_pack/pack.yml', project)).toEqual(['resources', 'test_pack', 'pack.yml']);
    expect(ce.syncPathSegments('resources/test_pack/configuration/items/a.yml', project)).not.toBeNull();
    expect(ce.syncPathSegments('resources/test_pack/resourcepack/assets/x.png', project)).not.toBeNull();
    for (const path of [
      'config.yml',
      'resources/other/pack.yml',
      'resources/test_pack/configuration/',
      'resources/test_pack/configuration/../../x',
      'resources/test_pack/configuration/./a.yml',
      'resources/test_pack/configuration//a.yml',
      'resources/test_pack/configuration/a\\..\\..\\x.yml',
      'resources/test_pack/x.yml',
      '/resources/test_pack/pack.yml',
      'resources/test_pack/pack.yml/../../../config.yml',
    ]) {
      expect(ce.syncPathSegments(path, project), path).toBeNull();
    }
    expect(ce.syncPathSegments('resources/../pack.yml', { packName: '..' })).toBeNull();
    expect(ce.syncPathSegments('resources/a/b/pack.yml', { packName: 'a/b' })).toBeNull();
  });

  it("never touches CraftEngine's own packs", () => {
    for (const packName of ['default', 'default_assets', 'internal', 'Internal', 'internal.', 'default_assets.', 'CON', 'nul.x']) {
      expect(ce.syncPathSegments(`resources/${packName}/pack.yml`, { packName }), packName).toBeNull();
    }
  });

  it('reads the pack build from the lines of a real run', () => {
    // CraftEngine 26.9.2 on Paper 26.3: startup, "ce reload all", "ce reload pack", "ce reload", warnings about the
    // pack's files, a failed build (ZIP locked) and a reload while another one runs
    const events = LOG.map((line) => parseServerLogLine(ce, line)).filter((event) => event !== null);
    const building = { type: 'packBuilding' };
    const ready = { type: 'packReady', url: null };
    const failed = { type: 'packFailed', message: null };
    expect(events).toEqual([
      { type: 'started' },
      ...[building, ready], // ce reload all
      ...[building, ready], // ce reload pack
      ...[building, ready], // ce reload pack with two WARN lines about the pack's files
      ...[building, failed, failed], // ce reload all with the ZIP locked
      ...[building, ready], // ce reload all + ce reload pack ("busy")
    ]);
    // The steps in between and the command replies tell nothing about the pack's state
    for (const line of LOG.filter((l) =>
      /Generated resource pack in|Resource pack generated|Configs reloaded|command\.resource\.busy/.test(l),
    )) {
      expect(parseServerLogLine(ce, line), line).toBeNull();
    }
    expect(ce.reportsPackBuild).toBe(true);
    // CraftEngine builds nothing on startup; the app sends "ce reload all" once the server is up
    expect(ce.buildsPackOnStart).toBe(false);
  });
});
