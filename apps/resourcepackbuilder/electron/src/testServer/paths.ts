/** Folders and files of the test server. Everything lives in `<userData>/testserver`. */
import { app } from 'electron';
import path from 'node:path';
import { testHooks } from '../testHooks';

export const rootDir = () => testHooks.testServerDir || path.join(app.getPath('userData'), 'testserver');
export const serverDir = () => path.join(rootDir(), 'server');
export const pluginsDir = () => path.join(serverDir(), 'plugins');
export const nexoDir = () => path.join(pluginsDir(), 'Nexo');
export const downloadsDir = () => path.join(rootDir(), 'downloads');
export const javaDir = () => path.join(rootDir(), 'java');
/** The user's Nexo JAR, copied here once and into `plugins/` on every start. */
export const pluginStore = () => path.join(rootDir(), 'nexo-plugin');
export const configFile = () => path.join(rootDir(), 'testserver.json');
export const manifestFile = () => path.join(rootDir(), 'sync-manifest.json');
