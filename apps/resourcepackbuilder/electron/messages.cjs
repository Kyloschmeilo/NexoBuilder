/**
 * Texts of the desktop program (menus, native dialogs, test-server and share messages) in the app's
 * languages. The UI tells the main process its language via `app:set-locale`; until then English is used.
 * Placeholders are written as {name}.
 */

const messages = {
  en: {
    'menu.file': 'File',
    'menu.quit': 'Quit',
    'menu.view': 'View',
    'menu.reload': 'Reload',
    'menu.devTools': 'Developer tools',
    'menu.resetZoom': 'Actual size',
    'menu.zoomIn': 'Zoom in',
    'menu.zoomOut': 'Zoom out',
    'menu.fullscreen': 'Full screen',
    'menu.help': 'Help',
    'menu.nexoDocs': 'Nexo documentation',
    'menu.about': 'About {app}',
    'about.detail':
      'Creates ready-to-use Nexo items with a resource pack from Blockbench models, Java models and textures.\n\nProjects are saved automatically in:\n{path}',
    'dialog.saveAs': 'Save as',

    'share.chooseJoinFolder': 'Choose the folder with the shared project',
    'share.chooseShareFolder': 'Choose a folder to share in (e.g. in OneDrive)',
    'share.open': 'Open',
    'share.shareHere': 'Share here',
    'share.invalidFolder': 'Invalid folder',
    'share.folderNotAllowed': 'This folder was not chosen for sharing',
    'share.invalidFile': 'Invalid file: {file}',
    'share.invalidContent': 'Invalid content',

    'ts.requestFailed': 'Request failed ({status}): {url}',
    'ts.downloadFailed': 'Download failed ({status}): {label}',
    'ts.downloading': 'Downloading {label} …',
    'ts.downloadingPercent': 'Downloading {label} … {percent} %',
    'ts.checksumMismatch': '{label}: checksum mismatch – the download is corrupt. Please try again.',
    'ts.searchingPaper': 'Looking for Paper {version} …',
    'ts.noPaperBuild': 'There is no Paper build for Minecraft {version}.',
    'ts.noPaperDownload': 'Paper {version}: no download found.',
    'ts.experimentalBuild': 'Note: Paper {version} only has an experimental build (#{build}).',
    'ts.downloadingPaper': 'Downloading Paper {version} (build {build}) …',
    'ts.javaRequired': 'Java {version} is required. Please install it yourself.',
    'ts.searchingJava': 'Looking for Java {version} …',
    'ts.javaNotFound': 'Java {version} was not found – downloading Eclipse Temurin {version} …',
    'ts.extractingJava': 'Extracting Java {version} …',
    'ts.javaExtractFailed': 'Java could not be extracted: {error}',
    'ts.javaBroken': 'The downloaded Java does not work.',
    'ts.chooseNexoJar': 'Choose the Nexo plugin (JAR)',
    'ts.choose': 'Choose',
    'ts.pluginFilter': 'Minecraft plugin',
    'ts.notAPlugin': 'This is not a valid plugin file (paper-plugin.yml is missing).',
    'ts.notNexo': 'This is not Nexo but “{name}”.',
    'ts.nexoSelected': 'Nexo {version} selected.',
    'ts.paperSettingsPatched': 'Adjusted Paper settings for Nexo (note block, tripwire and chorus updates off).',
    'ts.nexoJarMissing': 'The Nexo JAR is missing. Please choose it again.',
    'ts.packTimeout': 'Nexo did not report back – the resource pack is considered done.',
    'ts.reloadQueued': 'Nexo is building the resource pack – it will be reloaded once that is done.',
    'ts.packReloading': 'Nexo is reloading and building the resource pack …',
    'ts.packBuilding': 'Nexo is building the resource pack …',
    'ts.packBuildingOnStart': 'Nexo is building the resource pack on startup …',
    'ts.unknownError': 'Unknown error',
    'ts.portInUse': 'Port {port} is in use – is another Minecraft server already running?',
    'ts.eulaRequired': 'Please accept the Minecraft EULA first.',
    'ts.versionRequired': 'Please choose a Minecraft version.',
    'ts.preparing': 'Preparing the test server …',
    'ts.startingPaper': 'Starting Paper {version} with Java {java} ({ram} GB RAM) …',
    'ts.starting': 'Server is starting …',
    'ts.startFailed': 'The server could not be started: {error}',
    'ts.exited': 'Server stopped.',
    'ts.exitedCode': 'Server stopped (code {code}).',
    'ts.crashed': 'The server stopped unexpectedly (code {code}). See the console for details.',
    'ts.stopping': 'Stopping the server (saving the world) …',
    'ts.notResponding': 'Server is not responding – killing it.',
    'ts.invalidPath': 'Invalid path: {path}',
    'ts.invalidFiles': 'Invalid files',
    'ts.skippedFile': 'Skipped (invalid file name): {path}',
    'ts.synced': 'Project transferred: {written} written, {deleted} removed.',
    'ts.syncedSettings': 'Project transferred: {written} written, {deleted} removed, settings adjusted.',
  },
  de: {
    'menu.file': 'Datei',
    'menu.quit': 'Beenden',
    'menu.view': 'Ansicht',
    'menu.reload': 'Neu laden',
    'menu.devTools': 'Entwicklertools',
    'menu.resetZoom': 'Originalgröße',
    'menu.zoomIn': 'Vergrößern',
    'menu.zoomOut': 'Verkleinern',
    'menu.fullscreen': 'Vollbild',
    'menu.help': 'Hilfe',
    'menu.nexoDocs': 'Nexo-Dokumentation',
    'menu.about': 'Über {app}',
    'about.detail':
      'Erstellt fertige Nexo-Items mit Resourcepack aus Blockbench-Modellen, Java-Modellen und Texturen.\n\nProjekte werden automatisch gespeichert in:\n{path}',
    'dialog.saveAs': 'Speichern unter',

    'share.chooseJoinFolder': 'Ordner mit dem geteilten Projekt wählen',
    'share.chooseShareFolder': 'Ordner zum Teilen wählen (z.B. in OneDrive)',
    'share.open': 'Öffnen',
    'share.shareHere': 'Hier teilen',
    'share.invalidFolder': 'Ungültiger Ordner',
    'share.folderNotAllowed': 'Dieser Ordner wurde nicht zum Teilen ausgewählt',
    'share.invalidFile': 'Ungültige Datei: {file}',
    'share.invalidContent': 'Ungültiger Inhalt',

    'ts.requestFailed': 'Anfrage fehlgeschlagen ({status}): {url}',
    'ts.downloadFailed': 'Download fehlgeschlagen ({status}): {label}',
    'ts.downloading': '{label} wird heruntergeladen …',
    'ts.downloadingPercent': '{label} wird heruntergeladen … {percent} %',
    'ts.checksumMismatch': '{label}: Prüfsumme stimmt nicht – Download beschädigt. Bitte erneut versuchen.',
    'ts.searchingPaper': 'Suche Paper {version} …',
    'ts.noPaperBuild': 'Für Minecraft {version} gibt es keinen Paper-Build.',
    'ts.noPaperDownload': 'Paper {version}: kein Download gefunden.',
    'ts.experimentalBuild': 'Hinweis: Für Paper {version} gibt es nur einen experimentellen Build (#{build}).',
    'ts.downloadingPaper': 'Lade Paper {version} (Build {build}) herunter …',
    'ts.javaRequired': 'Java {version} wird benötigt. Bitte selbst installieren.',
    'ts.searchingJava': 'Suche Java {version} …',
    'ts.javaNotFound': 'Java {version} wurde nicht gefunden – lade Eclipse Temurin {version} herunter …',
    'ts.extractingJava': 'Java {version} wird entpackt …',
    'ts.javaExtractFailed': 'Java konnte nicht entpackt werden: {error}',
    'ts.javaBroken': 'Das heruntergeladene Java funktioniert nicht.',
    'ts.chooseNexoJar': 'Nexo-Plugin (JAR) auswählen',
    'ts.choose': 'Auswählen',
    'ts.pluginFilter': 'Minecraft-Plugin',
    'ts.notAPlugin': 'Das ist keine gültige Plugin-Datei (paper-plugin.yml fehlt).',
    'ts.notNexo': 'Das ist nicht Nexo, sondern „{name}“.',
    'ts.nexoSelected': 'Nexo {version} ausgewählt.',
    'ts.paperSettingsPatched': 'Paper-Einstellungen für Nexo angepasst (Notenblock-, Stolperdraht- und Chorus-Updates aus).',
    'ts.nexoJarMissing': 'Die Nexo-JAR fehlt. Bitte erneut auswählen.',
    'ts.packTimeout': 'Nexo hat sich nicht zurückgemeldet – das Resourcepack gilt als fertig.',
    'ts.reloadQueued': 'Nexo erstellt gerade das Resourcepack – neu geladen wird, sobald es fertig ist.',
    'ts.packReloading': 'Nexo lädt neu und erstellt das Resourcepack …',
    'ts.packBuilding': 'Nexo erstellt das Resourcepack …',
    'ts.packBuildingOnStart': 'Nexo erstellt beim Start das Resourcepack …',
    'ts.unknownError': 'Unbekannter Fehler',
    'ts.portInUse': 'Port {port} ist belegt – läuft schon ein anderer Minecraft-Server?',
    'ts.eulaRequired': 'Bitte zuerst die Minecraft-EULA akzeptieren.',
    'ts.versionRequired': 'Bitte eine Minecraft-Version wählen.',
    'ts.preparing': 'Bereite den Testserver vor …',
    'ts.startingPaper': 'Starte Paper {version} mit Java {java} ({ram} GB RAM) …',
    'ts.starting': 'Server startet …',
    'ts.startFailed': 'Server konnte nicht gestartet werden: {error}',
    'ts.exited': 'Server beendet.',
    'ts.exitedCode': 'Server beendet (Code {code}).',
    'ts.crashed': 'Der Server wurde unerwartet beendet (Code {code}). Details in der Konsole.',
    'ts.stopping': 'Server wird gestoppt (Welt wird gespeichert) …',
    'ts.notResponding': 'Server reagiert nicht – wird beendet.',
    'ts.invalidPath': 'Ungültiger Pfad: {path}',
    'ts.invalidFiles': 'Ungültige Dateien',
    'ts.skippedFile': 'Übersprungen (ungültiger Dateiname): {path}',
    'ts.synced': 'Projekt übertragen: {written} geschrieben, {deleted} entfernt.',
    'ts.syncedSettings': 'Projekt übertragen: {written} geschrieben, {deleted} entfernt, Einstellungen angepasst.',
  },
};

const DEFAULT_LOCALE = 'en';
let current = DEFAULT_LOCALE;
const listeners = new Set();

function getLocale() {
  return current;
}

/** Switches the language (unknown values are ignored) and notifies listeners, e.g. to rebuild the menu. */
function setLocale(locale) {
  if (typeof locale !== 'string' || !(locale in messages) || locale === current) return;
  current = locale;
  for (const listener of listeners) listener(locale);
}

function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The text for `key` in the current language, with {placeholders} filled from `params`. */
function t(key, params = {}) {
  const template = messages[current][key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

module.exports = { getLocale, setLocale, onLocaleChange, t, messages };
