import { DEFAULT_TEST_SERVER_CONFIG } from '@resourcepackbuilder/test-server';
import { describe, expect, it } from 'vitest';
import { DESKTOP_API } from './api';
import { DesktopError, rehydrateDesktopError, toDesktopErrorPayload } from './errors';
import { invokeSchemas, testServerConfigPatchSchema, testServerConfigSchema } from './schemas';

describe('the channel definitions', () => {
  const defs = Object.values(DESKTOP_API).flatMap((group) => Object.values(group));

  it('use every channel once', () => {
    const channels = defs.map((def) => def.channel);
    expect(new Set(channels).size).toBe(channels.length);
  });

  it('have an argument schema for every invoke channel and nothing else', () => {
    const invokeChannels = defs.filter((def) => def.kind === 'invoke').map((def) => def.channel);
    expect(Object.keys(invokeSchemas).sort()).toEqual(invokeChannels.sort());
  });
});

describe('invoke arguments', () => {
  it('accept what the UI sends', () => {
    expect(invokeSchemas['share:write'].safeParse(['C:\\share', 'items/a.json', '{}']).success).toBe(true);
    const files = [
      { path: 'items/a.yml', data: 'a: 1' },
      { path: 'pack/x.png', data: new Uint8Array([1, 2]) },
    ];
    expect(invokeSchemas['testserver:sync'].safeParse([files, { reload: true }]).success).toBe(true);
    expect(invokeSchemas['share:user-name'].safeParse([]).success).toBe(true);
  });

  it('refuse wrong types, missing and extra arguments', () => {
    expect(invokeSchemas['share:write'].safeParse(['C:\\share', 'items/a.json', 42]).success).toBe(false);
    expect(invokeSchemas['share:list'].safeParse([]).success).toBe(false);
    expect(invokeSchemas['share:list'].safeParse(['']).success).toBe(false);
    expect(invokeSchemas['share:user-name'].safeParse(['x']).success).toBe(false);
    expect(invokeSchemas['app:set-locale'].safeParse(['fr']).success).toBe(false);
    expect(invokeSchemas['testserver:sync'].safeParse([[{ path: 'a', data: 1 }], { reload: true }]).success).toBe(false);
  });
});

describe('test-server settings', () => {
  it('accept the defaults', () => {
    expect(testServerConfigSchema.parse(DEFAULT_TEST_SERVER_CONFIG)).toEqual(DEFAULT_TEST_SERVER_CONFIG);
  });

  it.each([
    { nexoJar: { file: '../../x', name: 'Nexo', version: '1' } },
    { playerName: '@a' },
    { ramGb: 512 },
    { paperVersion: '1.21 -Xmx99G' },
    { port: '25565' },
  ])('refuse saved settings with %j', (patch) => {
    expect(testServerConfigSchema.safeParse({ ...DEFAULT_TEST_SERVER_CONFIG, ...patch }).success).toBe(false);
  });

  it('correct changes from the UI', () => {
    const patch = testServerConfigPatchSchema.parse({
      paperVersion: '../x',
      ramGb: 99,
      port: '25570',
      playerName: 'St eve@',
      eulaAccepted: 'yes',
      nexoJar: { file: '../../x' },
    });
    expect(patch).toEqual({ paperVersion: null, ramGb: 16, port: 25570, playerName: 'Steve', eulaAccepted: false });
  });
});

describe('desktop errors', () => {
  it('survive the trip as a payload', () => {
    const payload = toDesktopErrorPayload(new DesktopError('invalidFile', { file: 'x' }));
    const error = rehydrateDesktopError(structuredClone(payload));
    expect(error).toBeInstanceOf(DesktopError);
    expect(error).toMatchObject({ code: 'invalidFile', args: { file: 'x' } });
  });

  it('keep the message of other errors', () => {
    expect(toDesktopErrorPayload(new Error('disk full'))).toEqual({ code: 'unexpected', args: { message: 'disk full' } });
  });
});
