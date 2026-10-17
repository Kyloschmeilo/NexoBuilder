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

/** The checksums a download can be verified with, and the length of their hex digest. */
const HASH_HEX_LENGTH = { sha256: 64, sha512: 128 } as const;
export type HashAlgorithm = keyof typeof HASH_HEX_LENGTH;

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
 * Downloads `url` to `target` (via a `.part` file), reports progress and verifies the checksum (SHA-256 unless
 * `algorithm` says otherwise). A download without a published checksum is refused: the files are a server, a Java
 * runtime and a plugin that get executed.
 */
export async function download(
  url: string,
  target: string,
  label: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'sha256',
): Promise<void> {
  const expected = expectedHash.trim().toLowerCase();
  if (!new RegExp(`^[0-9a-f]{${HASH_HEX_LENGTH[algorithm]}}$`).test(expected)) throw new DesktopError('checksumMissing', { label });
  const response = await net.fetch(url, { headers: { 'User-Agent': userAgent() } });
  if (!response.ok || !response.body) throw new DesktopError('downloadFailed', { status: response.status, label });
  const total = Number(response.headers.get('content-length')) || 0;
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const partPath = `${target}.part`;
  const file = fs.createWriteStream(partPath);
  const hash = crypto.createHash(algorithm);
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
    throw new DesktopError('checksumMismatch', { label });
  }
  await fsp.rename(partPath, target);
  setState({ progress: null });
}
