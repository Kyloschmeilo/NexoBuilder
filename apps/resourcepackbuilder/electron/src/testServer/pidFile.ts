/**
 * The PID file a running server leaves in its server folder, and the check that a process with that PID really is
 * that server. Pure functions (no Electron, no file access), so they can be tested on their own.
 */

/** File name of the PID file in the server folder. */
export const PID_FILE = 'resourcepackbuilder-server.pid';

/** What the PID file records about the server process. */
export interface ServerPidFile {
  pid: number;
  /** The Paper JAR it runs (its full path is part of the process's command line). */
  jar: string;
}

export function formatPidFile(info: ServerPidFile): string {
  return JSON.stringify(info);
}

/** The content of a PID file, or null when it is not one. */
export function parsePidFile(text: string): ServerPidFile | null {
  try {
    const data: unknown = JSON.parse(text);
    if (typeof data !== 'object' || data === null) return null;
    const { pid, jar } = data as Record<string, unknown>;
    if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 0 || typeof jar !== 'string' || !jar) return null;
    return { pid, jar };
  } catch {
    return null;
  }
}

/** A running process as the operating system reports it. */
export interface ProcessInfo {
  /** The executable's name or path. */
  name: string;
  commandLine: string;
}

/**
 * Whether `process` is the server the PID file describes: a Java executable whose command line runs exactly that JAR
 * without a GUI, as the test server is started. A PID that was reused by any other program does not match.
 */
export function isServerProcess(process: ProcessInfo, pidFile: ServerPidFile): boolean {
  const executable = process.name.split(/[\\/]/).pop() ?? '';
  return (
    /^javaw?(\.exe)?$/i.test(executable) && process.commandLine.includes(pidFile.jar) && /(^|\s)--nogui(\s|$)/.test(process.commandLine)
  );
}
