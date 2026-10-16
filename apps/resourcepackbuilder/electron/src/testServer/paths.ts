/**
 * Folders and files of the test server. Everything lives in `<userData>/testserver`; each pack target has its own
 * server in `<target>/server`, so the plugins never share a world or a plugins folder.
 */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { serverAdapterFor } from '@resourcepackbuilder/test-server';
import { app } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { testHooks } from '../testHooks';

export const rootDir = () => testHooks.testServerDir || path.join(app.getPath('userData'), 'testserver');
const targetDir = (target: PackTargetId) => path.join(rootDir(), target);
export const serverDir = (target: PackTargetId) => path.join(targetDir(target), 'server');
export const pluginsDir = (target: PackTargetId) => path.join(serverDir(target), 'plugins');
/** The plugin's own folder, e.g. `plugins/Nexo`. */
export const pluginDir = (target: PackTargetId) => path.join(serverDir(target), ...serverAdapterFor(target).pluginDir.split('/'));
export const downloadsDir = () => path.join(rootDir(), 'downloads');
export const javaDir = () => path.join(rootDir(), 'java');
/** The target's plugin JAR, copied here once and into `plugins/` on every start (`nexo-plugin` for Nexo, as before). */
export const pluginStore = (target: PackTargetId) => path.join(rootDir(), `${target}-plugin`);
export const configFile = () => path.join(rootDir(), 'testserver.json');
export const manifestFile = (target: PackTargetId) => path.join(targetDir(target), 'sync-manifest.json');

/**
 * Moves the single Nexo server of older versions (`server/` and `sync-manifest.json` directly in the root) to the
 * Nexo target's folder. Runs before anything touches the server folders; does nothing once moved.
 */
export async function moveLegacyServerDir(): Promise<void> {
  const moves: Array<[string, string]> = [
    [path.join(rootDir(), 'server'), serverDir('nexo')],
    [path.join(rootDir(), 'sync-manifest.json'), manifestFile('nexo')],
  ];
  for (const [from, to] of moves) {
    if (!fs.existsSync(from) || fs.existsSync(to)) continue;
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.rename(from, to);
  }
}
