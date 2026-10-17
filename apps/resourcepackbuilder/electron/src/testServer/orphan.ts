/**
 * A server left running after the program crashed keeps its ports and the world's session.lock. The running server's
 * PID is kept in a file in its server folder; before a start, a server that is still alive from such a file is ended.
 * Only a process that is verifiably that server (see `isServerProcess`) is ever killed.
 */
import { PACK_TARGETS, type PackTargetId } from '@resourcepackbuilder/core/project';
import { execFile } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { errorCode, writeFileAtomic } from '../fileHelpers';
import { t } from '../i18n';
import { serverDir } from './paths';
import { formatPidFile, isServerProcess, parsePidFile, PID_FILE, type ProcessInfo } from './pidFile';
import { logInfo } from './state';

/** How long a killed server may take to end (its ports and files are free only then). */
const KILL_WAIT_MS = 10_000;

const pidFilePath = (target: PackTargetId) => path.join(serverDir(target), PID_FILE);

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(command, args, { windowsHide: true, timeout: 15_000 }, (err, stdout) => (err ? reject(err) : resolve(stdout))),
  );
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return errorCode(err) === 'EPERM'; // exists, but belongs to someone else
  }
}

/** Name and command line of process `pid`, or null when it cannot be read. */
async function processInfo(pid: number): Promise<ProcessInfo | null> {
  try {
    if (process.platform === 'win32') {
      const query = `Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object Name, CommandLine | ConvertTo-Json -Compress`;
      const output = (await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', query])).trim();
      if (!output) return null;
      const data = JSON.parse(output) as { Name?: unknown; CommandLine?: unknown };
      return typeof data.Name === 'string' && typeof data.CommandLine === 'string'
        ? { name: data.Name, commandLine: data.CommandLine }
        : null;
    }
    if (process.platform === 'linux') {
      const args = (await fsp.readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0').filter(Boolean);
      const name = await fsp.readlink(`/proc/${pid}/exe`).catch(() => args[0] ?? '');
      return { name, commandLine: args.join(' ') };
    }
    const name = (await run('ps', ['-p', String(pid), '-o', 'comm='])).trim();
    const commandLine = (await run('ps', ['-p', String(pid), '-o', 'command='])).trim();
    return name ? { name, commandLine } : null;
  } catch {
    return null;
  }
}

async function kill(pid: number): Promise<void> {
  if (process.platform === 'win32') await run('taskkill', ['/PID', String(pid), '/T', '/F']);
  else process.kill(pid, 'SIGKILL');
  const deadline = Date.now() + KILL_WAIT_MS;
  while (isAlive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 200));
}

/** Records the started server of `target` (best effort: without the file only the crash recovery is lost). */
export async function writePidFile(target: PackTargetId, pid: number, jar: string): Promise<void> {
  await writeFileAtomic(pidFilePath(target), formatPidFile({ pid, jar })).catch((err: unknown) =>
    console.warn('Could not write the server PID file', err),
  );
}

export async function removePidFile(target: PackTargetId): Promise<void> {
  await fsp.rm(pidFilePath(target), { force: true }).catch(() => undefined);
}

/** Ends the servers of every target that an earlier run left behind (call only while this run has no server). */
export async function stopOrphanedServers(): Promise<void> {
  for (const target of PACK_TARGETS) {
    let text: string;
    try {
      text = await fsp.readFile(pidFilePath(target), 'utf8');
    } catch (err) {
      if (errorCode(err) !== 'ENOENT') console.warn('Could not read the server PID file', err);
      continue;
    }
    const pidFile = parsePidFile(text);
    if (pidFile && isAlive(pidFile.pid)) {
      const info = await processInfo(pidFile.pid);
      if (info && isServerProcess(info, pidFile)) {
        logInfo(t('testServer.orphanStopped', { pid: pidFile.pid }));
        try {
          await kill(pidFile.pid);
        } catch (err) {
          console.warn(`Could not end the server process ${pidFile.pid}`, err);
          continue; // tried again on the next start
        }
      }
    }
    await removePidFile(target);
  }
}
