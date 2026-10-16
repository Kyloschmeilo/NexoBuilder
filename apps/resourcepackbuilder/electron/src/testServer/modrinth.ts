/** The CraftEngine JAR from Modrinth, for the chosen Paper version and checked against the SHA-512 Modrinth lists. */
import {
  CRAFT_ENGINE_JAR_FILE_PATTERN,
  craftEngineVersionsUrl,
  modrinthVersionsSchema,
  pickCraftEngineVersion,
} from '@resourcepackbuilder/test-server';
import { DesktopError } from '@resourcepackbuilder/desktop-contract';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { t } from '../i18n';
import { download, fetchJson } from './download';
import { downloadsDir } from './paths';
import { logInfo, setState, state } from './state';

/**
 * Downloads the newest CraftEngine JAR for the chosen Paper version and returns its bytes once the checksum matched.
 * The caller checks the plugin descriptor and moves it into the plugin store.
 */
export async function downloadCraftEngine(): Promise<Uint8Array> {
  const { paperVersion } = state.config;
  if (!paperVersion) throw new DesktopError('versionRequired');
  // The status line shows the download; afterwards it shows what it showed before (unless the server moved on)
  const { status, message } = state;
  try {
    setState({ message: t('testServer.searchingCraftEngine', { version: paperVersion }) });
    const versions = await fetchJson(craftEngineVersionsUrl(paperVersion), modrinthVersionsSchema);
    const picked = pickCraftEngineVersion(versions, paperVersion);
    if (!picked) throw new DesktopError('noCraftEngineVersion', { version: paperVersion });
    // The picker only returns such names; checked again because the name becomes a path
    if (!CRAFT_ENGINE_JAR_FILE_PATTERN.test(picked.filename)) throw new DesktopError('invalidFile', { file: picked.filename });
    logInfo(t('testServer.downloadingCraftEngine', { version: picked.version, paperVersion }));
    const file = path.join(downloadsDir(), picked.filename);
    await download(picked.url, file, `CraftEngine ${picked.version}`, picked.sha512, 'sha512');
    try {
      return await fsp.readFile(file);
    } finally {
      await fsp.rm(file, { force: true });
    }
  } finally {
    setState({ progress: null, ...(state.status === status && { message }) });
  }
}
