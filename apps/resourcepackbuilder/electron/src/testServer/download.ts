/** HTTP helpers for the Paper and Java downloads. */
import { DesktopError } from '@resourcepackbuilder/desktop-contract';
import { app, net } from 'electron';
import crypto from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import type { z } from 'zod';
import { t } from '../i18n';
import { setState } from './state';

const SHA256_HEX = /^[0-9a-f]{64}$/;

const userAgent = () => `ResourcepackBuilder/${app.getVersion()} (https://github.com/SLNE-Development/ResourcepackBuilder)`;

/** Fetches JSON from `url` and checks its shape; a response that does not match is an error, not a guess. */
export async function fetchJson<S extends z.ZodType>(url: string, schema: S): Promise<z.output<S>> {
  const response = await net.fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'application/json' } });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // not a JSON response
  }
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data ? data.message : null;
    if (typeof message === 'string') throw new DesktopError('requestFailedWithMessage', { message, status: response.status });
    throw new DesktopError('requestFailed', { status: response.status, url });
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error(`Unexpected response from ${url}`, parsed.error.issues);
    throw new DesktopError('requestFailed', { status: response.status, url });
  }
  return parsed.data;
}

/** Fetches a short text response (e.g. a checksum file). */
export async function fetchText(url: string): Promise<string> {
  const response = await net.fetch(url, { headers: { 'User-Agent': userAgent() } });
  if (!response.ok) throw new DesktopError('requestFailed', { status: response.status, url });
  return response.text();
}

/**
 * Downloads `url` to `target` (via a `.part` file), reports progress and verifies the SHA-256 checksum. A download
 * without a published checksum is refused: the files are a server and a Java runtime that get executed.
 */
export async function download(url: string, target: string, label: string, expectedSha256: string): Promise<void> {
  const expected = expectedSha256.trim().toLowerCase();
  if (!SHA256_HEX.test(expected)) throw new Error(t('testServer.checksumMissing', { label }));
  const response = await net.fetch(url, { headers: { 'User-Agent': userAgent() } });
  if (!response.ok || !response.body) throw new Error(t('testServer.downloadFailed', { status: response.status, label }));
  const total = Number(response.headers.get('content-length')) || 0;
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const partPath = `${target}.part`;
  const file = fs.createWriteStream(partPath);
  const hash = crypto.createHash('sha256');
  let received = 0;
  let lastPercent: number | null | undefined;
  try {
    const reader = response.body.getReader();
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
    await fsp.rm(partPath, { force: true });
    throw err;
  }
  if (hash.digest('hex') !== expected) {
    await fsp.rm(partPath, { force: true });
    throw new Error(t('testServer.checksumMismatch', { label }));
  }
  await fsp.rename(partPath, target);
  setState({ progress: null });
}
