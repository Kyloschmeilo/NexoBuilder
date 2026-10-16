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
 * Fresh user-data folders start in English, so visible labels are matched in English;
 * structure is found through data-testid attributes.
 *
 * Usage: node scripts/test-windows-exe.cjs <path to ResourcepackBuilder.exe> <output folder> [app folder]
 * (app folder only when testing with the bare Electron from node_modules)
 */
const { _electron: electron } = require('playwright-core');
const JSZip = require('jszip');
const fs = require('node:fs');
const path = require('node:path');
// The repo's shared PNG encoder
const { encodePng } = require('../../../packages/core/test-utils/pngEncoder.cjs');

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
  return encodePng(16, 16, (x, y) => [230, (x + y) % 2 === 0 ? 200 : 40, 40, 255]);
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
      // The test hooks below are only honoured with this flag
      RESOURCEPACKBUILDER_E2E: '1',
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

const treeRow = (win, text) => win.getByTestId('tree-row').filter({ hasText: text });
const dialog = (win) => win.getByRole('dialog');

(async () => {
  const texture = path.join(out, 'fire_sword.png');
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
    await win.getByTestId('new-project-name').fill('Windows Test');
    await win.getByRole('button', { name: 'Create project' }).click();
  });
  await step('Create folder', async () => {
    await win.getByRole('button', { name: 'Create folder', exact: true }).click();
    await dialog(win).getByRole('textbox').fill('Weapons');
    await win.keyboard.press('Enter');
    await treeRow(win, 'Weapons').waitFor();
  });
  await step('Create item from PNG', async () => {
    await win.getByRole('button', { name: 'New item', exact: true }).first().click();
    const chooser = win.waitForEvent('filechooser');
    await win.getByTestId('new-item-dropzone').click();
    await (await chooser).setFiles([texture]);
    await win.getByTestId('new-item-display-name').fill('Fire Sword');
    await dialog(win).getByRole('button', { name: 'Create item' }).click();
    await treeRow(win, 'Fire Sword').waitFor();
  });
  await win.waitForTimeout(1000);
  await win.screenshot({ path: path.join(out, 'resourcepackbuilder-windows.png') });

  let zipPath;
  await step('Export', async () => {
    await win.getByRole('button', { name: 'Export', exact: true }).click();
    await win.getByRole('button', { name: 'Download ZIP' }).click();
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
    if (!/^fire_sword:/m.test(text)) throw new Error('Item fire_sword missing in ' + yml);
    if (!names.some((n) => n.endsWith('/pack.mcmeta'))) throw new Error('pack.mcmeta missing');
    if (!names.some((n) => /models\/item\/.*fire_sword\.json$/.test(n))) throw new Error('Model missing');
    if (!names.some((n) => /textures\/item\/.*\.png$/.test(n))) throw new Error('Texture missing');
  });
  await app.close();

  await step('Project still there after restart', async () => {
    app = await launch();
    win = await app.firstWindow();
    watchConsole(win);
    await treeRow(win, 'Fire Sword').waitFor({ timeout: 20000 });
  });

  let app2;
  let win2;
  await step('Share project via a folder', async () => {
    await win.getByTestId('share-button').click();
    await win.getByTestId('share-user-name').fill('Anna');
    await win.getByRole('button', { name: 'Choose folder and share' }).click();
    await win.locator('[data-testid="share-status"][data-status="synced"]').waitFor({ timeout: 20000 });
    await dialog(win).getByRole('button', { name: 'Done' }).click();
    if (!fs.existsSync(path.join(shareDir, 'project.json'))) throw new Error('project.json missing in the shared folder');
  });
  await step('Second program opens the shared project', async () => {
    app2 = await launch(userData2);
    win2 = await app2.firstWindow();
    watchConsole(win2);
    await win2.getByRole('button', { name: 'Open shared project' }).click();
    await treeRow(win2, 'Fire Sword').waitFor({ timeout: 20000 });
  });
  await step('Change in the second program arrives in the first', async () => {
    await treeRow(win2, 'Fire Sword').click();
    await win2.getByTestId('item-display-name').fill('Ice Sword');
    await treeRow(win, 'Ice Sword').waitFor({ timeout: 20000 });
  });
  await step('Change in the first program arrives in the second', async () => {
    await treeRow(win, 'Ice Sword').click();
    await win.getByTestId('item-display-name').fill('Thunder Sword');
    await treeRow(win2, 'Thunder Sword').waitFor({ timeout: 20000 });
    await win2.screenshot({ path: path.join(out, 'resourcepackbuilder-windows-shared.png') });
  });
  await app2.close();

  const serverConsole = () => win.getByTestId('test-server-console');
  const serverStatus = (status) => win.locator(`[data-testid="test-server-status"][data-status="${status}"]`);
  try {
    await step('Set up test server', async () => {
      await win.getByRole('button', { name: /^Test server/ }).click();
      await win.getByRole('heading', { name: 'Test server' }).waitFor();
      // Version list loaded from PaperMC and a version selected
      const version = win.getByTestId('test-server-version');
      await win.waitForFunction((select) => !!select?.value, await version.elementHandle(), { timeout: 60000 });
      console.log('     Version:', await version.inputValue());
      await win.getByTestId('test-server-player-name').fill('NexoTest');
      await win.getByTestId('test-server-player-name').blur();
      await win.getByTestId('test-server-eula').check();
    });
    await step('Test server: download Paper and Java and start', async () => {
      await win.getByRole('button', { name: 'Start server' }).click();
      await serverStatus('running')
        .or(serverStatus('error'))
        .waitFor({ timeout: 8 * 60000 });
      if ((await serverStatus('error').count()) > 0) throw new Error('Server reports an error');
      console.log('     ' + (await win.getByTestId('test-server-version-label').innerText()));
      await win.screenshot({ path: path.join(out, 'resourcepackbuilder-windows-testserver.png') });
    });
    await step('Test server: project is in plugins/Nexo', async () => {
      const nexo = path.join(testServerDir, 'server', 'plugins', 'Nexo');
      const yml = path.join(nexo, 'items', 'weapons', 'weapons.yml');
      if (!fs.existsSync(yml) || !/fire_sword/.test(fs.readFileSync(yml, 'utf8'))) throw new Error('Item file missing');
      if (!/SELFHOST/.test(fs.readFileSync(path.join(nexo, 'settings.yml'), 'utf8'))) throw new Error('settings.yml missing');
    });
    await step('Test server: command in the console', async () => {
      const input = win.getByTestId('test-server-command');
      await input.fill('say ResourcepackBuilder-console-test');
      await input.press('Enter');
      await serverConsole()
        .locator('[data-testid="console-line"]:not([data-level="info"])', { hasText: 'ResourcepackBuilder-console-test' })
        .first()
        .waitFor({ timeout: 60000 });
    });
    await step('Stop test server', async () => {
      await win.getByRole('button', { name: 'Stop', exact: true }).click();
      await serverStatus('stopped').waitFor({ timeout: 2 * 60000 });
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
