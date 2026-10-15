/**
 * Automated test of the installed Windows program (runs in GitHub Actions on Windows).
 * Launches ResourcepackBuilder.exe, creates a project, folder and item, exports the pack,
 * checks the ZIP contents and whether the project is still there after a restart.
 * Then the project is shared via a folder and a second program instance (separate data)
 * opens it; changes must arrive in both directions.
 * Finally the local test server starts: Paper and Java are actually downloaded,
 * the server starts, the project lands in plugins/Nexo, a command runs, the server stops.
 * (Without Nexo: the plugin is paid and is not available here.)
 *
 * Usage: node scripts/test-windows-exe.cjs <path to ResourcepackBuilder.exe> <output folder> [app folder]
 * (app folder only when testing with the bare Electron from node_modules)
 */
const { _electron: electron } = require('playwright-core');
const JSZip = require('jszip');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const exe = process.argv[2];
const out = path.resolve(process.argv[3] ?? 'exe-test');
const appDir = process.argv[4];
const downloads = path.join(out, 'downloads');
const userData = path.join(out, 'userdata');
const userData2 = path.join(out, 'userdata-2');
const shareDir = path.join(out, 'shared');
const testServerDir = path.join(out, 'testserver');
fs.mkdirSync(downloads, { recursive: true });

/** 16x16 PNG (red/yellow checkerboard) as a test texture */
function makePng() {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const size = 16;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const yellow = (x + y) % 2 === 0;
      raw[o] = 230;
      raw[o + 1] = yellow ? 200 : 40;
      raw[o + 2] = 40;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const errors = [];
// Machines without a GPU (e.g. CI) cannot do WebGL; then only the 3D preview is missing
const webglErrors = [];
const launch = (dataDir = userData) =>
  electron.launch({
    executablePath: exe,
    args: [...(appDir ? [appDir] : []), `--user-data-dir=${dataDir}`],
    env: {
      ...process.env,
      RESOURCEPACKBUILDER_DOWNLOAD_DIR: downloads,
      RESOURCEPACKBUILDER_TEST_SHARE_DIR: shareDir,
      RESOURCEPACKBUILDER_TESTSERVER_DIR: testServerDir,
      // Always download Java ourselves so that this path gets tested too
      ...(process.env.KEEP_SYSTEM_JAVA ? {} : { RESOURCEPACKBUILDER_TEST_IGNORE_SYSTEM_JAVA: '1' }),
    },
    timeout: 60000,
  });

function watchConsole(win) {
  win.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  win.on('console', (m) => {
    if (m.type() !== 'error') return;
    (/WebGL/.test(m.text()) ? webglErrors : errors).push(m.text());
  });
}

async function step(name, fn) {
  try {
    await fn();
    console.log('OK  ', name);
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n')[0]);
    throw e;
  }
}

(async () => {
  const texture = path.join(out, 'feuerschwert.png');
  fs.writeFileSync(texture, makePng());

  let app = await launch();
  let win = await app.firstWindow();
  watchConsole(win);
  await win.waitForLoadState('domcontentloaded');

  await step('Window opened', async () => {
    const title = await win.title();
    if (title !== 'ResourcepackBuilder') throw new Error(`Unexpected title: ${title}`);
  });
  await step('Create project', async () => {
    await win.getByPlaceholder('z.B. Mittelalter-Pack').fill('Windows Test');
    await win.getByRole('button', { name: 'Projekt erstellen' }).click();
  });
  await step('Create folder', async () => {
    await win.getByRole('button', { name: 'Ordner anlegen', exact: true }).click();
    await win.locator('.modal input').fill('Waffen');
    await win.keyboard.press('Enter');
  });
  await step('Create item from PNG', async () => {
    await win.getByRole('button', { name: 'Neues Item' }).first().click();
    const chooser = win.waitForEvent('filechooser');
    await win.locator('.modal .dropzone').click();
    await (await chooser).setFiles([texture]);
    await win.locator('.modal input[placeholder="z.B. <red>Rubin-Schwert"]').fill('Feuerschwert');
    await win.getByRole('button', { name: 'Item erstellen' }).click();
    await win.locator('.tree-row', { hasText: 'Feuerschwert' }).waitFor();
  });
  await win.waitForTimeout(1000);
  await win.screenshot({ path: path.join(out, 'resourcepackbuilder-windows.png') });

  let zipPath;
  await step('Export', async () => {
    await win.getByRole('button', { name: 'Exportieren' }).click();
    await win.getByRole('button', { name: 'ZIP herunterladen' }).click();
    for (let i = 0; i < 60 && !zipPath; i++) {
      const f = fs.readdirSync(downloads).find((n) => n.endsWith('.zip'));
      if (f) zipPath = path.join(downloads, f);
      else await win.waitForTimeout(250);
    }
    if (!zipPath) throw new Error('No ZIP file saved');
    await win.waitForTimeout(1000);
  });
  await step('Check ZIP contents', async () => {
    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
    const names = Object.keys(zip.files);
    console.log('     ' + names.join('\n     '));
    const yml = names.find((n) => n.startsWith('items/') && n.endsWith('.yml'));
    if (!yml) throw new Error('No item file');
    const text = await zip.file(yml).async('string');
    if (!/^feuerschwert:/m.test(text)) throw new Error('Item feuerschwert missing in ' + yml);
    if (!names.some((n) => n.endsWith('/pack.mcmeta'))) throw new Error('pack.mcmeta missing');
    if (!names.some((n) => /models\/item\/.*feuerschwert\.json$/.test(n))) throw new Error('Model missing');
    if (!names.some((n) => /textures\/item\/.*\.png$/.test(n))) throw new Error('Texture missing');
  });
  await app.close();

  await step('Project still there after restart', async () => {
    app = await launch();
    win = await app.firstWindow();
    watchConsole(win);
    await win.locator('.tree-row', { hasText: 'Feuerschwert' }).waitFor({ timeout: 20000 });
  });

  const nameInput = (w) => w.getByPlaceholder('z.B. <gradient:#ff5555:#ffaa00>Feuerschwert');
  let app2;
  let win2;
  await step('Share project via a folder', async () => {
    await win.locator('.topbar .share-chip').click();
    await win.locator('.modal input[placeholder="z.B. Kylo"]').fill('Anna');
    await win.getByRole('button', { name: 'Ordner wählen und teilen' }).click();
    await win.locator('.modal .badge', { hasText: 'Aktuell' }).waitFor({ timeout: 20000 });
    await win.getByRole('button', { name: 'Fertig' }).click();
    if (!fs.existsSync(path.join(shareDir, 'project.json'))) throw new Error('project.json missing in the shared folder');
  });
  await step('Second program opens the shared project', async () => {
    app2 = await launch(userData2);
    win2 = await app2.firstWindow();
    watchConsole(win2);
    await win2.getByRole('button', { name: 'Geteiltes Projekt öffnen' }).click();
    await win2.locator('.tree-row', { hasText: 'Feuerschwert' }).waitFor({ timeout: 20000 });
  });
  await step('Change in the second program arrives in the first', async () => {
    await win2.locator('.tree-row', { hasText: 'Feuerschwert' }).click();
    await nameInput(win2).fill('Eisschwert');
    await win.locator('.tree-row', { hasText: 'Eisschwert' }).waitFor({ timeout: 20000 });
  });
  await step('Change in the first program arrives in the second', async () => {
    await win.locator('.tree-row', { hasText: 'Eisschwert' }).click();
    await nameInput(win).fill('Donnerschwert');
    await win2.locator('.tree-row', { hasText: 'Donnerschwert' }).waitFor({ timeout: 20000 });
    await win2.screenshot({ path: path.join(out, 'resourcepackbuilder-windows-shared.png') });
  });
  await app2.close();

  const serverConsole = () => win.locator('.server-console');
  try {
    await step('Set up test server', async () => {
      await win.locator('.tree-row', { hasText: 'Testserver' }).click();
      await win.getByRole('heading', { name: 'Testserver' }).waitFor();
      // Version list loaded from PaperMC and a version selected
      await win.waitForFunction(
        () => {
          const select = document.querySelector('.editor select');
          return !!(select && select.value);
        },
        null,
        { timeout: 60000 },
      );
      console.log('     Version:', await win.locator('.editor select').first().inputValue());
      await win.getByPlaceholder('z.B. Kylo').fill('NexoTest');
      await win.getByPlaceholder('z.B. Kylo').blur();
      await win.locator('label.toggle-row', { hasText: 'Minecraft-EULA' }).locator('input').check();
    });
    await step('Test server: download Paper and Java and start', async () => {
      await win.getByRole('button', { name: 'Server starten' }).click();
      await win.locator('.editor-meta .badge', { hasText: /Läuft|Fehler/ }).waitFor({ timeout: 8 * 60000 });
      if ((await win.locator('.editor-meta .badge', { hasText: 'Fehler' }).count()) > 0) throw new Error('Server reports an error');
      console.log('     ' + (await win.locator('.editor-meta .badge.mono').innerText()));
      await win.screenshot({ path: path.join(out, 'resourcepackbuilder-windows-testserver.png') });
    });
    await step('Test server: project is in plugins/Nexo', async () => {
      const nexo = path.join(testServerDir, 'server', 'plugins', 'Nexo');
      const yml = path.join(nexo, 'items', 'waffen', 'waffen.yml');
      if (!fs.existsSync(yml) || !/donnerschwert|feuerschwert/i.test(fs.readFileSync(yml, 'utf8'))) throw new Error('Item file missing');
      if (!/SELFHOST/.test(fs.readFileSync(path.join(nexo, 'settings.yml'), 'utf8'))) throw new Error('settings.yml missing');
    });
    await step('Test server: command in the console', async () => {
      const input = win.locator('.console-input input');
      await input.fill('say ResourcepackBuilder-console-test');
      await input.press('Enter');
      await win
        .locator('.server-console .console-line:not(.info)', { hasText: 'ResourcepackBuilder-console-test' })
        .first()
        .waitFor({ timeout: 60000 });
    });
    await step('Stop test server', async () => {
      await win.getByRole('button', { name: 'Stoppen' }).click();
      await win.locator('.editor-meta .badge', { hasText: 'Gestoppt' }).waitFor({ timeout: 2 * 60000 });
    });
  } finally {
    if ((await serverConsole().count()) > 0) fs.writeFileSync(path.join(out, 'testserver-console.txt'), await serverConsole().innerText());
  }
  await app.close();

  console.log(webglErrors.length ? 'Note: 3D preview without WebGL (no GPU)' : 'OK   3D preview (WebGL)');
  if (errors.length) {
    console.log('Errors in the console:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('All good.');
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
