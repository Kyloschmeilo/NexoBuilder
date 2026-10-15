// @ts-check
/** HTTP helpers for the Paper and Java downloads. */
const { app, net } = require('electron');
const crypto = require('node:crypto');
const { once } = require('node:events');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { finished } = require('node:stream/promises');
const { t } = require('../i18n.cjs');
const { setState } = require('./state.cjs');

const userAgent = () => `ResourcepackBuilder/${app.getVersion()} (https://github.com/SLNE-Development/ResourcepackBuilder)`;

/**
 * @param {string} url
 * @returns {Promise<any>} the parsed JSON response (shape checked by the caller)
 */
async function fetchJson(url) {
  const res = await net.fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'application/json' } });
  /** @type {any} */
  let data = null;
  try {
    data = await res.json();
  } catch {
    // not a JSON response
  }
  if (!res.ok) {
    throw new Error(
      typeof data?.message === 'string' ? `${data.message} (${res.status})` : t('testServer.requestFailed', { status: res.status, url }),
    );
  }
  return data;
}

/**
 * Downloads `url` to `dest` (via a `.part` file), reports progress and verifies the SHA-256 checksum if given.
 * @param {string} url
 * @param {string} dest
 * @param {string} label
 * @param {string} [expectedSha256]
 */
async function download(url, dest, label, expectedSha256) {
  const res = await net.fetch(url, { headers: { 'User-Agent': userAgent() } });
  if (!res.ok || !res.body) throw new Error(t('testServer.downloadFailed', { status: res.status, label }));
  const total = Number(res.headers.get('content-length')) || 0;
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  const file = fs.createWriteStream(tmp);
  const hash = crypto.createHash('sha256');
  let received = 0;
  /** @type {number | null | undefined} */
  let lastPercent;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      received += value.length;
      if (!file.write(value)) await once(file, 'drain');
      const percent = total ? Math.floor((received / total) * 100) : null;
      if (percent !== lastPercent) {
        lastPercent = percent;
        setState({
          message: percent !== null ? t('testServer.downloadingPercent', { label, percent }) : t('testServer.downloading', { label }),
          progress: percent,
        });
      }
    }
    file.end();
    await finished(file);
  } catch (err) {
    file.destroy();
    await fsp.rm(tmp, { force: true });
    throw err;
  }
  if (expectedSha256 && hash.digest('hex') !== String(expectedSha256).toLowerCase()) {
    await fsp.rm(tmp, { force: true });
    throw new Error(t('testServer.checksumMismatch', { label }));
  }
  await fsp.rename(tmp, dest);
  setState({ progress: null });
}

module.exports = { fetchJson, download };
