// @ts-check
/** Folders and files of the test server. Everything lives in `<userData>/testserver`. */
const { app } = require('electron');
const path = require('node:path');
const { testHooks } = require('../testHooks.cjs');

const rootDir = () => testHooks.testServerDir || path.join(app.getPath('userData'), 'testserver');
const serverDir = () => path.join(rootDir(), 'server');
const pluginsDir = () => path.join(serverDir(), 'plugins');
const nexoDir = () => path.join(pluginsDir(), 'Nexo');
const downloadsDir = () => path.join(rootDir(), 'downloads');
const javaDir = () => path.join(rootDir(), 'java');
/** The user's Nexo JAR, copied here once and into `plugins/` on every start. */
const pluginStore = () => path.join(rootDir(), 'nexo-plugin');
const configFile = () => path.join(rootDir(), 'testserver.json');
const manifestFile = () => path.join(rootDir(), 'sync-manifest.json');

module.exports = { rootDir, serverDir, pluginsDir, nexoDir, downloadsDir, javaDir, pluginStore, configFile, manifestFile };
