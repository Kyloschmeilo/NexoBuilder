# Changelog

## Unreleased

ResourcepackBuilder gets a new Workbench look with five themes, a calmer item editor, and editors for every feature
the CraftEngine wiki and Nexo 1.30 describe. Every feature links to its section of the plugin docs.

### Added

- **Five color themes**: Deepslate (default), Amethyst, Copper, Prismarine and Crimson, each in light and dark, in a
  denser Workbench look with IBM Plex fonts. Pick one under _Settings → Appearance_ or in the welcome screen's
  appearance menu.
- **Workbench layout**: an activity bar (items, media, CraftEngine logic, test server, settings), a resizable sidebar,
  an output dock with the YAML and checks of every page (Ctrl+J), and a command palette (Ctrl+K) that also finds, adds
  and opens the settings of the open item. The item tree has filter chips (items, blocks, furniture, with issues).
- **Docs links on every feature**: every Nexo and CraftEngine property, furniture and block option, block behavior,
  recipe type, media page and CraftEngine condition, function, event, loot and number type links to its section of the
  plugin docs, tinted by plugin.
- **Every CraftEngine block behavior**: all 54 behavior types (including the undocumented vine crops) with all their
  keys, added from a searchable catalog in eight groups. 22 more presets set up the block states, the particle options
  are complete, and the export reports missing behavior keys.
- **All other CraftEngine wiki features**:
  - Blocks: every block setting (fluid state, destroy stages, tool component, sound volume and pitch), per-variant
    settings, exact or shared vanilla states, fixed ids, texture-built, rotated and weighted models; the block names its
    item for the creative pick.
  - Furniture: behaviors (storage, item display, glowing), seat rotation options, hitbox flags, variant extras, sound
    volume and pitch, and every display parameter of furniture and block renderer elements.
  - Items: a Behaviors section (placement type with its options for blocks and furniture, range mining, composting,
    flint and steel) and every item setting (equipment LOD, equipment potion effects, food, drop display, projectile,
    sounds, per-place repairable, typed craft remainders, plugin-only keys).
  - Item data: advanced lore, `insert_lore` fallback, enchantment merge, profile, `block_state`, written books, random
    values, build functions, NBT tags, data-level `custom_model_data` and `item_model`, client-bound data with
    conditional entries, and a per-version item updater (apply data, transmute, reset).
  - Project pages for translations and lang keys (with automatic client block names), item browser categories (plus a
    per-item category), worldgen features, atlases, `pack.yml` settings with config factories, and JavaScript scripts.
- **Nexo 1.30 coverage**:
  - **Dialogs** (`plugins/Nexo/dialogs`), **multipack** templates and menu (`multipack.yml`), and the **Carpentry**
    addon's block types once "Carpentry addon installed" is on in the project settings.
  - Furniture, custom block and mechanic options cover everything Nexo 1.30 reads: rotation on sneak, farming boosts,
    shulker storage, long-form block and trident sounds, directional faces with their own models, random block
    variants, backpack whitelists and more. The export checks block variations and hitbox entries.
  - Items: structured editors for `blocks_attacks`, `kinetic_weapon` and `custom_model_data`, plus rarity, instrument,
    `item_model` (`nexo:empty`), trims, stored enchantments, potion effects, custom name, `injectId`, `no_auto_update`,
    template lists, broken model and hand-swap options.
- **Item model trees** for Nexo (`ItemModel`) and CraftEngine (`model`): model, composite, condition, select, range
  dispatch, special, empty, bundle, tints and transformation, plus CraftEngine's root model keys (`oversized_in_gui`,
  `hand_animation_on_swap`, `swap_animation_scale`, `item_model`, `custom_model_data`, `legacy_model`).
- **Recipes**: every Nexo and CraftEngine recipe type (crafter, transform, brewing, smithing upgrade and trim,
  transmute, anvil, dye), the recipe and ingredient keys of each plugin (categories, groups, permissions, unlocks,
  processors, predicates, replacements, Premium conditions and functions) and Nexo's disabled vanilla recipes.
- **Media**: fixed glyph characters, Nexo glyph shadows, templates and sprite GIFs, CraftEngine emoji per chat context,
  sound weight, preload, subtitles, sound references and vanilla sound replacement, a baby armor layer, overlay
  textures, dyeable armor, player-texture wings and CraftEngine trim equipment.

### Changed

- **Item editor**: a section nav beside one section at a time (Basics, Model, Textures, Features, Block, Furniture,
  Events, Loot, Recipes, Advanced), a slim header with the name in its colors, and raw YAML under Advanced. Features are
  collapsed rows with one open at a time (unsaved drafts are kept).
- **Add dialog** for features, behaviors and other typed entries: search over names, keys, aliases and descriptions
  with highlighted matches, categories with common entries, an "Added" state with "Jump to", adding several at once and
  full keyboard use. Entry cards edit unknown types as YAML.
- **Field rows** show the translated label, the YAML key and a docs link, with help in a popover. Controls follow the
  value: switches for on/off settings (with an unset state for plugin defaults), segments, a select or a searchable
  list by the number of options, x/y/z inputs for vectors, a picker for the project's resource ids, a MiniMessage
  preview chip, and lists and maps as compact rows and key/value tables.
- **Typed lists**: conditions, functions, events, loot entries, behaviors and updater steps are cards you add from a
  catalog, change the type of, duplicate and reorder. Lists nested deeper than two levels open in a dialog with a
  breadcrumb, and number values switch between a plain value and a number type such as uniform without losing input.
- **Blocks**: one "Places" choice (nothing, block, furniture) for both plugins. CraftEngine block behaviors are cards
  with all their settings, states are compact tables with details and per-variant settings in dialogs, and block
  settings and Nexo custom block features are collapsed rows added from a catalog.
- **Furniture**: CraftEngine variants show a preview beside the element, and the hitbox list and the selected entry's
  editor in a side pane (seats nested in hitboxes, custom variants, behaviors from a catalog). Nexo furniture gets a
  preview, structured hitbox, seat, bed and light editors instead of text lines, options from a catalog and nested
  forms for door and state display.
- **Model section**: a flat/tool/rod switch and shading switches, special appearances as a compact list with a catalog
  of what the plugin exports, and the item model tree as an outline next to a card for the selected node, with
  per-node problems, keyboard navigation and Copy YAML.
- **Recipes** are compact rows with a one-line summary, laid out like their station (crafting grid, smithing, brewing
  and anvil slots → result). "Add recipe" opens a catalog of the plugin's recipe types, rarely used keys wait under
  "More options", and recipes can be duplicated and reordered.
- **Media and CraftEngine registries** are master/detail: the Media and Logic panels list every glyph, sound,
  painting, loot source, template, variable, attribute, locale, category, worldgen feature, atlas, config factory and
  script with search and "New"; templates get a searchable reference of the default templates.
- **Pages**: folder pages list their items in a table, settings are a sectioned page, dialogs share one frame, the
  welcome screen has plugin cards with docs links, and the test server page uses the Workbench sections, field rows and
  status pills.
- **Easier to read**: content groups sit on their own panels, inputs on clear wells, every theme has stronger contrast
  between page, panels and borders, and editor text sizes follow the design.
- CraftEngine wiki links point to the wiki's new home (`xiao-momi.github.io/craft-engine-wiki`).

### Fixed

- **Nexo keys**: the block support toggle, fireproof items, furniture culling, `can_place_on`/`can_break` and
  `custom_model_data` now use the keys Nexo 1.30 reads. Saved projects are migrated automatically.
- Ctrl+K and Ctrl+J no longer act behind open dialogs, and the narrow output dock handles focus and Escape.

## 2.0.0

### Fixed

- **Test server:** a start that failed (for example because port 25565 was taken) left a half-created world, and every
  later start failed with "Overworld settings missing". Such a world is now set aside and created anew, ports are
  checked before Paper starts, and a server that gives up is shown as an error with its reason instead of "Stopped".
- **Test server (CraftEngine):** CraftEngine's built-in packs were never created because the project's pack was written
  first, so `default:loot_table/furniture` and every other `default:*` template were reported as invalid. They are now
  copied from the plugin JAR when missing.
- **Project settings:** changing the name, namespace, pack options or icon failed with an internal error.
- Switching items or projects no longer carries editor state or the test server's transfer summary over.

### Improved

- **Test server page:** setup comes first until the server can start, the reason a start is blocked is written out,
  ports are saved when you leave the field (no error per keystroke), the resource pack port can be changed, and
  **Reset world** deletes the test world. The console's example commands use the project's plugin and items.
- **Give in test server** is always visible in the desktop app and says why it is disabled.

### New: CraftEngine

- Every project now targets **Nexo** or **CraftEngine**. You choose when you create the project, and it cannot change
  later. Existing projects stay Nexo projects.
- CraftEngine projects have their own item form (data components, settings, behaviors), custom blocks (single and
  multi-state, with an `auto_state` budget check), furniture, block entity renderers, events with conditions and
  functions, loot tables and loot sources, templates, global variables and the attribute system.
- The export writes `plugins/CraftEngine/resources/<pack>/` with `pack.yml`, items, recipes, images, emoji, sounds,
  jukebox songs, paintings, equipments, categories and language files.
- The local test server runs either plugin, each in its own folder (`testserver/<target>/server`). CraftEngine downloads
  from Modrinth with a checksum check; a purchased Premium JAR still works. The server loads the project with
  `ce reload all` and shows the pack state.
- The Nexo export is unchanged.

### Breaking

- The item id field `nexoId` is now `itemId`. There is no migration: projects saved before this change lose their item
  ids and get new ones (the lenient fallback applies). Project files and shared folders from earlier versions behave
  the same.

### Renamed: ResourcepackBuilder

- NexoBuilder is now called **ResourcepackBuilder** (program, installer, window, icon).
- **Not compatible with NexoBuilder:** saved projects, project files (`.nexobuilder.json`), shared folders and copied
  properties from NexoBuilder cannot be opened. The installer installs ResourcepackBuilder next to an existing
  NexoBuilder.
- The single HTML file for the browser is gone – ResourcepackBuilder is a Windows program only.

### New look and languages

- The whole interface was rebuilt with shadcn/ui components and Tailwind, in the CastCrafter look.
- **Light and dark mode**: _Settings → This device → Appearance_ (Light, Dark or System) or the toggle in the top bar.
- **English and German**: the interface is English by default; switch under _Settings → This device → Language_.
  Menus, native dialogs and test-server messages of the Windows program follow the chosen language.

### Changed

- The export's installation guide is now called `INSTALL.txt` (was `ANLEITUNG.txt`), the info file in shared folders
  `README.txt` (was `LIESMICH.txt`). Older shared folders keep working.
- Files ResourcepackBuilder writes for the test server (`server.properties`, `eula.txt`) and new shared subfolders now
  use English names and comments.
- Links from the program only open in the browser if they use `https`; websites can no longer ask for permissions
  such as location or camera.

### Fixed

- Test server: a server that could not be started (e.g. Java missing) no longer leaves the test server stuck in
  "starting"; a project transfer with an invalid file entry no longer fails; a damaged JAR is reported as
  "not a valid plugin file".
- Shared folders: links inside a shared folder that point outside of it are refused.
- Starting the program a second time only brings the open window to the front.

### Under the hood

- The app is a Next.js static export inside Electron; all texts live in next-intl catalogues (`packages/i18n`).
- The Electron code is type-checked against a shared IPC contract; the desktop bridge is now
  `window.resourcepackBuilder`.
- ESLint and Prettier for the whole repository; CI runs lint, typecheck and tests on Linux and Windows.

### Download

- **`ResourcepackBuilder-Setup-2.0.0.exe`**: installer with Start menu and desktop shortcuts.
- **`ResourcepackBuilder-2.0.0-portable.exe`**: run without installing.

## 1.4.0

### Neu: Furniture

- **Connectable**: Gleiche Möbel verbinden sich nebeneinander, z.B. Stühle zu einem Sofa. Die Modelle Straight, Left, Right,
  Inner und Outer lädst du im Tab „Model & Pack“ hoch. NexoBuilder erzeugt daraus das passende ItemModel. Das ist der von
  Nexo empfohlene Weg und braucht keine fünf zusätzlichen Items.
- **States**: per Klick durchschaltbare Zustände, z.B. ein Fernseher mit Kanälen. Jeder State kann ein eigenes Modell haben,
  dazu `next_after`, `reset_after` und Conditions. Die Typen FURNITURE, CUSTOM_MODEL_DATA und ModelEngine werden auch unterstützt.
- **Placements** mit eigenen Modellen für Floor, Wall und Roof.
- **Lights**: ein eigenes Modell für eingeschaltetes Licht (`toggled_item_model`).
- **Text Entities**: schwebender Text, auch mit Glyphs, an der Möbel.

### Neu: weitere Modelle und Ausrüstung

- **GUI Model**: ein anderes Modell im Inventar, z.B. ein flaches Icon, während in der Hand das 3D-Modell zu sehen ist.
- **Throwing Model** und die Mechanic **Trident**: Damage, Sounds und Aussehen im Flug.
- **CustomArmor** kann jetzt auch **Elytra**, **Wolf/Horse/Llama/Nautilus Armor**, **Harness** (Happy Ghast) und **Saddles** für
  alle Reittiere. Slot, `allowed_entity_types` und bei Elytren der Glider werden automatisch gesetzt.
- **Custom Block**: **Directional** (wie Holzstämme), **Log Strip**, **Sapling** und **Stackable** mit eigenen Modellen je Stufe.
- Neue Mechanic **Repair** und die Option **Exclude From Commands**.
- **Shade** und **Ambient Occlusion** lassen sich im Modell nachträglich ein- und ausschalten.

### Neu: Sounds und Paintings

- **Sounds**: OGG-Dateien hochladen und anhören. Volume, Pitch, Stream und Attenuation Distance einstellen; mehrere Dateien
  werden zufällig abgespielt. Mit **Jukebox Playable** wird ein Sound zur Musik-CD, das passende Item legt NexoBuilder per Klick an.
- **Paintings**: eigene Gemälde (auch animiert) mit Title, Author und Größe. Das Item zum Aufhängen entsteht per Klick.
- Exportiert wird nach `plugins/Nexo/sounds.yml` bzw. `paintings.yml`, die Dateien landen im Resourcepack. Beides funktioniert
  auch beim Teilen, im Testserver und beim Export mehrerer Projekte.

### Geändert

- Alle Features heißen jetzt wie in der Nexo- und Minecraft-Doku: Components, Mechanics, Furniture, Custom Block,
  Max Stack Size, Equippable, Pulling Models usw. Auch die Felder in den Formularen zeigen den Originalnamen. Die deutsche
  Erklärung erscheint, wenn man mit der Maus darüberfährt. Erklärungen und Bedienung bleiben deutsch.

### Download

- **`NexoBuilder-Setup-1.4.0.exe`**: Installer mit Startmenü- und Desktop-Verknüpfung.
- **`NexoBuilder-1.4.0-portable.exe`**: ohne Installation direkt starten.
- **`NexoBuilder.html`**: die App als einzelne Datei für den Browser (ohne Teilen und Testserver).

## 1.3.0

### Neu: nur bestimmte Projekte und Inhalte exportieren

- Im Export-Dialog gibt es jetzt eine **Auswahl**: Ordner, einzelne Items und Glyphen an- oder abwählen.
  Abgewählte Ordner fallen samt Inhalt weg, alles andere behält seine Pfade.
- **Mehrere Projekte in ein ZIP**: weitere gespeicherte Projekte anhaken und auch darin Ordner/Items auswählen.
  Jedes Projekt bekommt seinen eigenen Ordner `items/<projekt>/` und seinen eigenen Resourcepack unter
  `pack/external_packs/<packname>/`; die `ANLEITUNG.txt` listet alle Projekte. Doppelte Item-IDs, Glyph-IDs, Pack-Namen
  oder Dateien zwischen den Projekten werden vor dem Export gemeldet.

### Neu: Eigenschaften kopieren und einfügen

- **Kopieren** (im Item-Kopf oder im Item-Menü) merkt sich die komplette Konfiguration eines Items.
- **Einfügen …** überträgt sie auf ein oder mehrere Items – im Item-Menü, im Ordner-Menü für alle Items des Ordners
  oder im Item-Kopf. Im Dialog lässt sich wählen, was übernommen wird (Material, Allgemein, Aussehen, Attribute,
  Komponenten, Mechaniken, sonstige Werte, zusätzliches YAML, Rezepte) und ob vorhandene Werte **ersetzt** oder nur
  **ergänzt** werden.
- Nie kopiert werden Anzeigename, Item-ID, Modell und Varianten, Ordner und `custom_model_data`. Eigene Blöcke bekommen
  automatisch eine freie Variation, Rüstungs-Texturen werden mitkopiert.
- Funktioniert auch projektübergreifend (Projekt wechseln und dort einfügen). Ein Strg+Z macht das Einfügen in allen
  Items auf einmal rückgängig.

### Neues Aussehen

- Die ganze Oberfläche nutzt jetzt das CastCrafter-Design: dunkler Waldgrün-Hintergrund, Smaragdgrün als einzige
  Signalfarbe, Gold für Warnungen und Glut-Orange für Fehler (immer mit Zeichen ★ / ■), flache Flächen ohne Verläufe.
- Schriften Chakra Petch (Überschriften, Knöpfe), Hanken Grotesk (Text) und Martian Mono (IDs, Pfade, Zahlen) –
  fest eingebaut, funktionieren also auch offline.
- Neues, flaches App-Icon und Favicon.

### Download

- **`NexoBuilder-Setup-1.3.0.exe`**: Installer mit Startmenü- und Desktop-Verknüpfung.
- **`NexoBuilder-1.3.0-portable.exe`**: ohne Installation direkt starten.
- **`NexoBuilder.html`**: die App als einzelne Datei für den Browser (ohne Teilen und Testserver).

## 1.2.2

### Korrigiert

- **Im Testserver geben** und die mitgelieferte Anleitung nutzen jetzt die richtige Reihenfolge von Nexo 1.29:
  `/nexo give <item_id> [anzahl] [spieler]`, z.B. `/nexo give ruby_sword 1 Steve`. In 1.2.0 und 1.2.1 standen Spieler
  und Item vertauscht – der Knopf hat deshalb kein Item gegeben.

### Download

- **`NexoBuilder-Setup-1.2.2.exe`**: Installer mit Startmenü- und Desktop-Verknüpfung.
- **`NexoBuilder-1.2.2-portable.exe`**: ohne Installation direkt starten.
- **`NexoBuilder.html`**: die App als einzelne Datei für den Browser (ohne Teilen und Testserver).

## 1.2.1

### Korrigiert: Resourcepack im Testserver

- Das Resourcepack kam im Testserver nicht an („Failed to build and send the finished ResourcePack“). Ursache: NexoBuilder hat
  `nexo reload all` geschickt, während Nexo noch das Pack gebaut hat – zwei Erstellungen liefen gleichzeitig und scheiterten.
  Jetzt wartet NexoBuilder, bis Nexo mit dem Pack fertig ist; mehrere Änderungen in der Zeit ergeben genau ein Neuladen.
- `settings.yml` wird nur noch geändert, wenn wirklich ein Wert fehlt – dass Nexo die Datei umformatiert, löst kein Neuladen mehr aus.
- Pack-Verschleierung im Testserver aus (`Pack.obfuscation.type: NONE`): schneller, und der Zwischenspeicher, der dabei
  kaputtgehen konnte („invalid CEN header“), wird beim Start gelöscht.

### Neu

- Anzeige, was Nexo gerade mit dem Resourcepack macht (wird erstellt / bereit / Fehler), mit **Nexo neu laden** und **Pack erneut senden**.
- Von Nexo empfohlene Paper-Einstellungen werden gesetzt (Notenblock-, Stolperdraht- und Chorus-Updates aus) – wirkt ab dem zweiten Start.
- Neue Testserver-Welten sind flach ohne die Fehlermeldung „No key layers“.

### Download

- **`NexoBuilder-Setup-1.2.1.exe`**: Installer mit Startmenü- und Desktop-Verknüpfung.
- **`NexoBuilder-1.2.1-portable.exe`**: ohne Installation direkt starten.
- **`NexoBuilder.html`**: die App als einzelne Datei für den Browser (ohne Teilen und Testserver).

## 1.2.0

### Neu: Lokaler Testserver

Ein Minecraft-Server (Paper) mit Nexo direkt auf deinem PC, der sich automatisch aktualisiert.

- Bereich **Testserver** links unten: Nexo-JAR auswählen, Minecraft-Version wählen, EULA akzeptieren, starten.
- Paper und – falls nötig – Java werden beim ersten Start automatisch heruntergeladen.
- Jede Änderung im Projekt landet nach wenigen Sekunden im Spiel (`nexo reload all`, neues Resourcepack wird automatisch geschickt).
- **Im Testserver geben** im Item-Editor legt das Item direkt in dein Inventar.
- Konsole mit Befehlseingabe; dein Minecraft-Name bekommt OP-Rechte.
- Nexo wird automatisch so eingestellt, dass das Resourcepack lokal ausgeliefert wird.
- Beim Schließen von NexoBuilder wird der Server sauber gestoppt.

Den Testserver gibt es im Windows-Programm. Die Nexo-JAR bringst du selbst mit – sie wird nur lokal verwendet.

### Korrigiert

- Die mitgelieferte Anleitung nennt jetzt `/nexo reload all`.

### Download

- **`NexoBuilder-Setup-1.2.0.exe`**: Installer mit Startmenü- und Desktop-Verknüpfung.
- **`NexoBuilder-1.2.0-portable.exe`**: ohne Installation direkt starten.
- **`NexoBuilder.html`**: die App als einzelne Datei für den Browser (ohne Teilen und Testserver).

## 1.1.0

### Neu: Projekte teilen

Gemeinsam an einem Projekt arbeiten – Änderungen kommen automatisch bei allen an, in beide Richtungen.

- **Teilen** (oben in der Leiste): das Projekt in einen gemeinsamen Ordner legen, z.B. in OneDrive, Google Drive oder Dropbox.
- **Geteiltes Projekt öffnen** (Startseite oder Projektmenü): ein geteiltes Projekt von Freunden öffnen.
- Jedes Item, jeder Ordner und jede Glyphe ist eine eigene Datei. Gleichzeitige Arbeit an verschiedenen Items geht nicht verloren;
  bei gleichzeitigen Änderungen am selben Item gilt die zuletzt gespeicherte.
- Meldung, wer was geändert hat. „Rückgängig“ nimmt nur eigene Änderungen zurück.
- Offline weiterarbeiten: Änderungen werden beim nächsten Start in beide Richtungen nachgeholt.

Teilen gibt es im Windows-Programm (nicht in der HTML-Version).

### Download

- **`NexoBuilder-Setup-1.1.0.exe`**: Installer mit Startmenü- und Desktop-Verknüpfung.
- **`NexoBuilder-1.1.0-portable.exe`**: ohne Installation direkt starten.
- **`NexoBuilder.html`**: die App als einzelne Datei für den Browser (ohne Teilen).

## 1.0.0

Erste Version von NexoBuilder: fertige [Nexo](https://docs.nexomc.com/)-Items mit Resourcepack aus
Blockbench-Modellen, Java-Modellen (JSON + Texturen) oder einzelnen PNGs.

### Download

- **`NexoBuilder-Setup-1.0.0.exe`**: Installer mit Startmenü- und Desktop-Verknüpfung.
- **`NexoBuilder-1.0.0-portable.exe`**: ohne Installation direkt starten.
- **`NexoBuilder.html`**: die ganze App als einzelne Datei, per Doppelklick im Browser öffnen (auch offline).

Die exe ist nicht digital signiert. Falls Windows beim ersten Start „Der Computer wurde durch Windows
geschützt“ meldet: **Weitere Informationen → Trotzdem ausführen**.

### Funktionen

- Projekte mit Ordnern und Unterordnern, Items per Drag & Drop anlegen (`.bbmodel`, JSON + PNG oder PNG).
- 3D-Vorschau, Tooltip-Vorschau mit MiniMessage-Farben.
- Rund 60 Nexo-Eigenschaften: Components, Attribute, Verzauberungen, Mechanics, Rüstung, Custom Blocks und mehr.
- Rezepte: Werkbank (geformt/formlos), Ofen, Schmelzofen, Räucherofen, Lagerfeuer, Steinsäge.
- Varianten-Modelle für Bogen, Armbrust, Schild und Angel sowie Beschädigungs-Stufen, färbbar und zusammengesetzt.
- Glyphen/Emojis: Bilder, animierte GIFs, Bild-Raster und Referenzen.
- Export als ZIP mit `items/`, `recipes/`, `glyphs/` und dem External Pack unter `pack/external_packs/<name>/`.
- Minecraft 1.21.4 bis 26.3 (Standard 26.3).
- Automatisches Speichern, Rückgängig/Wiederholen, Projektdateien zum Sichern und Weitergeben.
