/**
 * The test server's world and ports. A start that fails before the world is saved (a port in use, a crash) leaves a
 * half-created world behind, and Paper then refuses every later start ("Overworld settings missing"). Such a world is
 * set aside before the next start, and the ports are checked before Paper even begins to create one.
 */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { worldFolders } from '@resourcepackbuilder/test-server';
import { DesktopError } from '@resourcepackbuilder/desktop-contract';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { t } from '../i18n';
import { serverDir } from './paths';
import { logInfo } from './state';

/** Suffix of a world folder that was set aside because it was never completed. */
const INCOMPLETE_SUFFIX = '.incomplete';

/** The world folders of `target`'s server, as absolute paths (the world first). */
async function worldDirs(target: PackTargetId): Promise<string[]> {
  const propertiesPath = path.join(serverDir(target), 'server.properties');
  const properties = fs.existsSync(propertiesPath) ? await fsp.readFile(propertiesPath, 'utf8') : null;
  return worldFolders(properties).map((folder) => path.join(serverDir(target), folder));
}

/** Whether `dir` holds a region file (`*.mca`): Paper saves the spawn chunks on every start that gets that far. */
async function hasRegionFile(dir: string): Promise<boolean> {
  const entries = await fsp.readdir(dir, { recursive: true }).catch(() => []);
  return entries.some((entry) => entry.endsWith('.mca'));
}

/**
 * Sets a world aside that holds no saved chunk: it comes from a start that failed before the world was complete, and
 * Paper cannot load it. Nobody built anything in it, so the folder is only renamed (`world.incomplete`, replacing an
 * older one) and Paper creates the world anew.
 */
export async function setAsideIncompleteWorld(target: PackTargetId): Promise<void> {
  const [world, ...dimensions] = await worldDirs(target);
  if (!fs.existsSync(world) || (await hasRegionFile(world))) return;
  for (const dir of [world, ...dimensions]) {
    if (!fs.existsSync(dir) || (dir !== world && (await hasRegionFile(dir)))) continue;
    const aside = dir + INCOMPLETE_SUFFIX;
    await fsp.rm(aside, { recursive: true, force: true });
    await fsp.rename(dir, aside);
  }
  logInfo(t('testServer.incompleteWorld', { folder: path.basename(world) + INCOMPLETE_SUFFIX }));
}

/** Deletes the world of `target`'s server (all dimensions); Paper creates a new one on the next start. */
export async function deleteWorld(target: PackTargetId): Promise<void> {
  for (const dir of await worldDirs(target)) await fsp.rm(dir, { recursive: true, force: true });
  logInfo(t('testServer.worldReset'));
}

/** Whether nothing else listens on `port` (checked the way Paper binds it: on all addresses). */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen({ port, exclusive: true });
  });
}

/** Throws unless the Minecraft port and the port the plugin serves the pack on are both free. */
export async function assertPortsFree(ports: { port: number; packPort: number }): Promise<void> {
  if (!(await isPortFree(ports.port))) throw new DesktopError('portInUse', { port: ports.port });
  if (!(await isPortFree(ports.packPort))) throw new DesktopError('packPortInUse', { port: ports.packPort });
}
