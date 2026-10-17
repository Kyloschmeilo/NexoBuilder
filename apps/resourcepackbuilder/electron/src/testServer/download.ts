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

/** A request is given up when no data arrived for this long (a stalled connection never ends by itself). */
const IDLE_TIMEOUT_MS = 30_000;

const userAgent = () => `ResourcepackBuilder/${app.getVersion()} (https://github.com/SLNE-Development/ResourcepackBuilder)`;

interface IdleTimeout {
  /** Aborted when `outer` is aborted or nothing happened for {@link IDLE_TIMEOUT_MS}. */
  signal: AbortSignal;
  /** Data arrived: the timeout starts again. */
  touch(): void;
  /** The error to throw for a failure caused by the abort: `timeoutError` for the timeout, the outer abort's reason. */
  reason(err: unknown, timeoutError: () => DesktopError): unknown;
  dispose(): void;
}

function idleTimeout(outer: AbortSignal | undefined): IdleTimeout {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  let isTimedOut = false;
  const onOuterAbort = () => controller.abort(outer?.reason);
  if (outer?.aborted) onOuterAbort();
  else outer?.addEventListener('abort', onOuterAbort, { once: true });
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, IDLE_TIMEOUT_MS);
  };
  touch();
  return {
    signal: controller.signal,
    touch,
    reason: (err, timeoutError) => (isTimedOut ? timeoutError() : outer?.aborted ? (outer.reason ?? err) : err),
    dispose() {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onOuterAbort);
    },
  };
}

const requestTimedOut = (url: string) => () => new DesktopError('requestTimedOut', { url, seconds: IDLE_TIMEOUT_MS / 1000 });

/** Fetches JSON from `url` and checks its shape; a response that does not match is an error, not a guess. */
export async function fetchJson<S extends z.ZodType>(url: string, schema: S, signal?: AbortSignal): Promise<z.output<S>> {
  const timeout = idleTimeout(signal);
  let response: Response;
  let data: unknown = null;
  try {
    response = await net.fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'application/json' }, signal: timeout.signal });
    try {
      data = await response.json();
    } catch {
      // not a JSON response
    }
    timeout.signal.throwIfAborted();
  } catch (err) {
    throw timeout.reason(err, requestTimedOut(url));
  } finally {
    timeout.dispose();
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
export async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const timeout = idleTimeout(signal);
  try {
    const response = await net.fetch(url, { headers: { 'User-Agent': userAgent() }, signal: timeout.signal });
    if (!response.ok) throw new DesktopError('requestFailed', { status: response.status, url });
    return await response.text();
  } catch (err) {
    throw timeout.reason(err, requestTimedOut(url));
  } finally {
    timeout.dispose();
  }
}

/**
 * Downloads `url` to `target` (via a `.part` file), reports progress and verifies the checksum (SHA-256 unless
 * `algorithm` says otherwise). A download without a published checksum is refused: the files are a server, a Java
 * runtime and a plugin that get executed. Gives up when no data arrives for a while or `signal` is aborted.
 */
export async function download(
  url: string,
  target: string,
  label: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'sha256',
  signal?: AbortSignal,
): Promise<void> {
  const expected = expectedHash.trim().toLowerCase();
  if (!new RegExp(`^[0-9a-f]{${HASH_HEX_LENGTH[algorithm]}}$`).test(expected)) throw new DesktopError('checksumMissing', { label });
  const timeout = idleTimeout(signal);
  const stalled = () => new DesktopError('downloadStalled', { label, seconds: IDLE_TIMEOUT_MS / 1000 });
  try {
    let response: Response;
    try {
      response = await net.fetch(url, { headers: { 'User-Agent': userAgent() }, signal: timeout.signal });
    } catch (err) {
      throw timeout.reason(err, stalled);
    }
    if (!response.ok || !response.body) throw new DesktopError('downloadFailed', { status: response.status, label });
    const total = Number(response.headers.get('content-length')) || 0;
    await fsp.mkdir(path.dirname(target), { recursive: true });
    const partPath = `${target}.part`;
    const file = fs.createWriteStream(partPath);
    // A write error is thrown by the loop below (an unhandled 'error' event would end the program)
    let writeError: Error | null = null;
    file.on('error', (err) => (writeError ??= err));
    const hash = crypto.createHash(algorithm);
    const reader = response.body.getReader();
    let received = 0;
    let lastPercent: number | null | undefined;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (writeError) throw writeError;
        if (done) break;
        timeout.touch();
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
      // Stop the transfer and let the file close first: Windows cannot delete a file that is still open
      await reader.cancel().catch(() => undefined);
      if (!file.closed) {
        await new Promise<void>((resolve) => {
          file.once('close', () => resolve());
          file.destroy();
        });
      }
      await fsp.rm(partPath, { force: true });
      throw timeout.reason(err, stalled);
    }
    if (hash.digest('hex') !== expected) {
      await fsp.rm(partPath, { force: true });
      throw new DesktopError('checksumMismatch', { label });
    }
    await fsp.rename(partPath, target);
    setState({ progress: null });
  } finally {
    timeout.dispose();
  }
}
