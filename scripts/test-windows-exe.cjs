/**
 * Automatischer Test des installierten Windows-Programms (läuft in GitHub Actions auf Windows).
 * Startet NexoBuilder.exe, legt Projekt, Ordner und Item an, exportiert das Pack,
 * prüft den Inhalt der ZIP und ob das Projekt nach einem Neustart noch da ist.
 * Danach wird das Projekt über einen Ordner geteilt und ein zweites Programm (eigene Daten)
 * öffnet es – Änderungen müssen in beide Richtungen ankommen.
 *
 * Aufruf: node scripts/test-windows-exe.cjs <Pfad zur NexoBuilder.exe> <Ausgabeordner> [App-Ordner]
 * (App-Ordner nur beim Test mit dem nackten Electron aus node_modules)
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
const shareDir = path.join(out, 'geteilt');
fs.mkdirSync(downloads, { recursive: true });

/** 16x16-PNG (rot/gelb kariert) als Test-Textur */
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
// Rechner ohne Grafikkarte (z.B. CI) können kein WebGL – dann fehlt nur die 3D-Vorschau
const webglErrors = [];
const launch = (dataDir = userData) =>
  electron.launch({
    executablePath: exe,
    args: [...(appDir ? [appDir] : []), `--user-data-dir=${dataDir}`],
    env: { ...process.env, NEXOBUILDER_DOWNLOAD_DIR: downloads, NEXOBUILDER_TEST_SHARE_DIR: shareDir },
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

  await step('Fenster geöffnet', async () => {
    const title = await win.title();
    if (title !== 'NexoBuilder') throw new Error(`Unerwarteter Titel: ${title}`);
  });
  await step('Projekt anlegen', async () => {
    await win.getByPlaceholder('z.B. Mittelalter-Pack').fill('Windows Test');
    await win.getByRole('button', { name: 'Projekt erstellen' }).click();
  });
  await step('Ordner anlegen', async () => {
    await win.getByRole('button', { name: 'Ordner anlegen', exact: true }).click();
    await win.locator('.modal input').fill('Waffen');
    await win.keyboard.press('Enter');
  });
  await step('Item aus PNG anlegen', async () => {
    await win.getByRole('button', { name: 'Neues Item' }).first().click();
    const chooser = win.waitForEvent('filechooser');
    await win.locator('.modal .dropzone').click();
    await (await chooser).setFiles([texture]);
    await win.locator('.modal input[placeholder="z.B. <red>Rubin-Schwert"]').fill('Feuerschwert');
    await win.getByRole('button', { name: 'Item erstellen' }).click();
    await win.locator('.tree-row', { hasText: 'Feuerschwert' }).waitFor();
  });
  await win.waitForTimeout(1000);
  await win.screenshot({ path: path.join(out, 'nexobuilder-windows.png') });

  let zipPath;
  await step('Exportieren', async () => {
    await win.getByRole('button', { name: 'Exportieren' }).click();
    await win.getByRole('button', { name: 'ZIP herunterladen' }).click();
    for (let i = 0; i < 60 && !zipPath; i++) {
      const f = fs.readdirSync(downloads).find((n) => n.endsWith('.zip'));
      if (f) zipPath = path.join(downloads, f);
      else await win.waitForTimeout(250);
    }
    if (!zipPath) throw new Error('Keine ZIP-Datei gespeichert');
    await win.waitForTimeout(1000);
  });
  await step('ZIP-Inhalt prüfen', async () => {
    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
    const names = Object.keys(zip.files);
    console.log('     ' + names.join('\n     '));
    const yml = names.find((n) => n.startsWith('items/') && n.endsWith('.yml'));
    if (!yml) throw new Error('Keine Item-Datei');
    const text = await zip.file(yml).async('string');
    if (!/^feuerschwert:/m.test(text)) throw new Error('Item feuerschwert fehlt in ' + yml);
    if (!names.some((n) => n.endsWith('/pack.mcmeta'))) throw new Error('pack.mcmeta fehlt');
    if (!names.some((n) => /models\/item\/.*feuerschwert\.json$/.test(n))) throw new Error('Modell fehlt');
    if (!names.some((n) => /textures\/item\/.*\.png$/.test(n))) throw new Error('Textur fehlt');
  });
  await app.close();

  await step('Projekt nach Neustart noch da', async () => {
    app = await launch();
    win = await app.firstWindow();
    watchConsole(win);
    await win.locator('.tree-row', { hasText: 'Feuerschwert' }).waitFor({ timeout: 20000 });
  });

  const nameInput = (w) => w.getByPlaceholder('z.B. <gradient:#ff5555:#ffaa00>Feuerschwert');
  let app2;
  let win2;
  await step('Projekt über einen Ordner teilen', async () => {
    await win.locator('.topbar .share-chip').click();
    await win.locator('.modal input[placeholder="z.B. Kylo"]').fill('Anna');
    await win.getByRole('button', { name: 'Ordner wählen und teilen' }).click();
    await win.locator('.modal .badge', { hasText: 'Aktuell' }).waitFor({ timeout: 20000 });
    await win.getByRole('button', { name: 'Fertig' }).click();
    if (!fs.existsSync(path.join(shareDir, 'project.json'))) throw new Error('project.json fehlt im geteilten Ordner');
  });
  await step('Zweites Programm öffnet das geteilte Projekt', async () => {
    app2 = await launch(userData2);
    win2 = await app2.firstWindow();
    watchConsole(win2);
    await win2.getByRole('button', { name: 'Geteiltes Projekt öffnen' }).click();
    await win2.locator('.tree-row', { hasText: 'Feuerschwert' }).waitFor({ timeout: 20000 });
  });
  await step('Änderung im zweiten Programm kommt im ersten an', async () => {
    await win2.locator('.tree-row', { hasText: 'Feuerschwert' }).click();
    await nameInput(win2).fill('Eisschwert');
    await win.locator('.tree-row', { hasText: 'Eisschwert' }).waitFor({ timeout: 20000 });
  });
  await step('Änderung im ersten Programm kommt im zweiten an', async () => {
    await win.locator('.tree-row', { hasText: 'Eisschwert' }).click();
    await nameInput(win).fill('Donnerschwert');
    await win2.locator('.tree-row', { hasText: 'Donnerschwert' }).waitFor({ timeout: 20000 });
    await win2.screenshot({ path: path.join(out, 'nexobuilder-windows-geteilt.png') });
  });
  await app2.close();
  await app.close();

  console.log(webglErrors.length ? 'Hinweis: 3D-Vorschau ohne WebGL (keine Grafikkarte)' : 'OK   3D-Vorschau (WebGL)');
  if (errors.length) {
    console.log('Fehler in der Konsole:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('Alles in Ordnung.');
})().catch((e) => {
  console.error('FEHLGESCHLAGEN:', e.message);
  process.exit(1);
});
