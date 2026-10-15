// @ts-check
/** The user's Nexo plugin JAR: picked once, checked, and kept in the test server's plugin store. */
const { dialog } = require('electron');
const fsp = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { t } = require('../i18n.cjs');
const { testHooks } = require('../testHooks.cjs');
const { pluginStore } = require('./paths.cjs');
const { logInfo, saveConfig, setState, state } = require('./state.cjs');

/** @typedef {import('../../src/platform/desktopApi').NexoJarInfo} NexoJarInfo */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIZE = 22;
const CENTRAL_HEADER_SIZE = 46;
const LOCAL_HEADER_SIZE = 30;
/** End-of-central-directory record plus the longest possible archive comment. */
const EOCD_SEARCH = EOCD_SIZE + 0xffff;
const DEFLATE = 8;

/**
 * Reads the first of the `wanted` text files from a ZIP archive. Returns null for anything that is not a well-formed
 * archive containing one of them (every offset is checked against the buffer).
 *
 * @param {Buffer} buffer
 * @param {string[]} wanted
 * @returns {string | null}
 */
function readZipText(buffer, wanted) {
  const fits = (/** @type {number} */ offset, /** @type {number} */ length) => offset >= 0 && offset + length <= buffer.length;
  let eocd = -1;
  for (let i = buffer.length - EOCD_SIZE; i >= Math.max(0, buffer.length - EOCD_SEARCH); i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (!fits(offset, CENTRAL_HEADER_SIZE) || buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) return null;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    if (!fits(offset + CENTRAL_HEADER_SIZE, nameLength)) return null;
    const name = buffer.toString('utf8', offset + CENTRAL_HEADER_SIZE, offset + CENTRAL_HEADER_SIZE + nameLength);
    if (wanted.includes(name)) {
      if (!fits(localOffset, LOCAL_HEADER_SIZE)) return null;
      const start = localOffset + LOCAL_HEADER_SIZE + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
      if (!fits(start, compressedSize)) return null;
      const data = buffer.subarray(start, start + compressedSize);
      try {
        return (method === DEFLATE ? zlib.inflateRawSync(data) : data).toString('utf8');
      } catch {
        return null; // corrupt entry
      }
    }
    offset += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }
  return null;
}

/**
 * Name and version from the plugin descriptor of a JAR, or null if it is not a plugin.
 * @param {Buffer} buffer
 */
function inspectPluginJar(buffer) {
  const text = readZipText(buffer, ['paper-plugin.yml', 'plugin.yml']);
  if (text === null) return null;
  const field = (/** @type {string} */ key) => new RegExp(`^${key}:\\s*['"]?([^'"\\r\\n]+)`, 'm').exec(text)?.[1]?.trim() ?? '';
  return { name: field('name'), version: field('version') };
}

/**
 * Asks for the Nexo JAR, checks it and copies it into the plugin store.
 * @param {Electron.BrowserWindow | null} window
 * @returns {Promise<NexoJarInfo | null>}
 */
async function chooseNexoJar(window) {
  let source = testHooks.nexoJar;
  if (!source) {
    /** @type {Electron.OpenDialogOptions} */
    const options = {
      title: t('testServer.chooseNexoJar'),
      buttonLabel: t('testServer.choose'),
      filters: [{ name: t('testServer.pluginFilter'), extensions: ['jar'] }],
      properties: ['openFile'],
    };
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    source = result.filePaths[0];
  }
  const buffer = await fsp.readFile(source);
  const plugin = inspectPluginJar(buffer);
  if (!plugin) throw new Error(t('testServer.notAPlugin'));
  if (plugin.name.toLowerCase() !== 'nexo') throw new Error(t('testServer.notNexo', { name: plugin.name }));
  const file = `Nexo-${plugin.version.replace(/[^\w.-]/g, '_') || 'unknown'}.jar`;
  await fsp.rm(pluginStore(), { recursive: true, force: true });
  await fsp.mkdir(pluginStore(), { recursive: true });
  await fsp.writeFile(path.join(pluginStore(), file), buffer);
  const nexoJar = { file, name: plugin.name, version: plugin.version };
  state.config = { ...state.config, nexoJar };
  await saveConfig();
  setState();
  logInfo(t('testServer.nexoSelected', { version: plugin.version }));
  return nexoJar;
}

module.exports = { chooseNexoJar };
