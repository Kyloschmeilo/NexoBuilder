# NexoBuilder

**Aus Blockbench-Modellen fertige [Nexo](https://docs.nexomc.com/)-Items machen – inklusive Resourcepack.**

NexoBuilder gibt es als **Windows-Programm (.exe)** und als Web-App (läuft komplett im Browser, auch offline per Doppelklick).
Du legst Ordner an, ziehst deine Modelle hinein, stellst die Nexo-Eigenschaften per Formular ein
und exportierst alles als ZIP, das du direkt in `plugins/Nexo/` entpackst.

![NexoBuilder](docs/screenshot.png)

## Funktionen

- **Ordner & Items** – Ordner (auch verschachtelt) werden zu Unterordnern in `plugins/Nexo/items`.
  Items per Drag & Drop verschieben, duplizieren, suchen.
- **Modell-Import per Drag & Drop**
  - `.bbmodel` (Blockbench-Projekt, Format „Java Block/Item“) – Umrechnung wie Blockbenchs eigener Java-Export
    (UVs, Rotationen inkl. freier Rotation ab 1.21.11, Inflate, Display-Einstellungen, animierte Texturen).
    Andere Blockbench-Formate (z.B. Generic Model) werden umgerechnet, mit Warnung.
  - `.json` + `.png` (Java-Modell) – Texturen werden über den Dateinamen zugeordnet, Parent-Modelle können mit abgelegt werden.
  - Nur `.png` – als 2D-Item, Werkzeug oder Block (cube_all, Säule, sechs Seiten, Pflanze …).
  - Mehrere Dateien auf einmal → mehrere Items.
- **3D-Vorschau** jedes Modells (inkl. Display-Ansichten wie Hand, Kopf, Inventar) und Vorschaubilder im Baum.
- **Nexo-Eigenschaften per Formular** (Stand Nexo 1.29 / Minecraft 26.3):
  - Allgemein: Lore (mit MiniMessage-Vorschau), unzerstörbar, Item-Flags, Templates, PersistentData
  - Attribute & Verzauberungen
  - Komponenten: Essen, Verbrauchbar, Werkzeug, Waffe, Ausrüstbar, Gleiter, Haltbarkeit, Stapelgröße, Cooldown,
    Todesschutz, Schallplatte, Tooltip, Reichweite, Brennstoff … (mit Versionshinweisen)
  - Mechaniken: Möbel (Hitbox, Sitze, Betten, Licht, Türen, Speicher, Drops …), eigene Blöcke
    (NoteBlock/StringBlock/ChorusBlock), Rucksack, Befehle, Custom-Aktionen, Rüstungs-Effekte, Ernten, Schmelzen …
  - Rüstungs-Texturen (getragen) → erzeugt Equipment-Modelle im Pack
  - Für alles andere: zusätzliches YAML pro Item
- **Rezepte** – Werkbank (mit/ohne Form), Ofen, Schmelzofen, Räucherofen, Lagerfeuer und Steinsäge
  → `recipes/<typ>/<projekt>.yml`
- **Varianten-Modelle** – Bogen/Armbrust (Spann-Stufen, geladen, Feuerwerk), Schild (blocken), Angel (ausgeworfen),
  Beschädigungs-Stufen, gefärbt und kombinierte Modelle (`Pack.pulling_models`, `Pack.blocking_model` …)
- **Glyphen** – Emojis und GUI-Texturen (PNG, animierte GIFs, Multi-Bitmap, Referenz-Glyphen) mit Chat-Vorschau
  → `glyphs/<projekt>.yml`, verwendbar überall mit `<glyph:id>`
- **Prüfung vor dem Export** – doppelte IDs, ungültige Werte, Modelle außerhalb des erlaubten Bereichs,
  fehlende Texturen, Versionskonflikte usw.
- **Export als ZIP**
  - `items/<ordner>/<ordner>.yml` (oder eine Datei pro Item)
  - `recipes/<typ>/<projekt>.yml` (falls Rezepte angelegt wurden)
  - `glyphs/<projekt>.yml` (falls Glyphen angelegt wurden)
  - `pack/external_packs/<packname>/` (oder als `.zip`) mit `pack.mcmeta`, Modellen und Texturen
  - Alternativ nur der Resourcepack oder nur die Item-Configs
- **Automatisches Speichern** im Browser, Rückgängig/Wiederholen (Strg+Z / Strg+Y),
  Projektdateien zum Sichern und Weitergeben.
- **Projekte teilen** (Windows-Programm) – über einen gemeinsamen Ordner in OneDrive, Google Drive oder Dropbox
  gemeinsam an einem Projekt arbeiten; Änderungen kommen nach wenigen Sekunden bei allen an, in beide Richtungen.
- **Lokaler Testserver** (Windows-Programm) – ein Paper-Server mit Nexo auf deinem PC, der sich automatisch
  aktualisiert: Änderungen im Projekt sind nach wenigen Sekunden im Spiel, inklusive neuem Resourcepack.

## Benutzung

### Windows-Programm (.exe)

- **Installer:** `NexoBuilder-Setup-<version>.exe` – installiert NexoBuilder mit Startmenü- und Desktop-Verknüpfung.
- **Portable:** `NexoBuilder-<version>-portable.exe` – ohne Installation direkt starten.

**Download:** auf GitHub unter **[Releases](https://github.com/Kyloschmeilo/NexoBuilder/releases/latest)**.
Zwischenstände werden zusätzlich bei jedem Push gebaut: **GitHub → Actions → Build → Artefakt „NexoBuilder-Windows“**.
Selbst bauen (Windows, oder Linux mit Wine):

```bash
npm install
npm run dist:win     # Ergebnis in release/
```

Das Programm ist nicht digital signiert – Windows SmartScreen zeigt deshalb beim ersten Start eventuell
„Der Computer wurde durch Windows geschützt“. Über **Weitere Informationen → Trotzdem ausführen** startet es.
Projekte werden automatisch gespeichert (im App-Datenordner, siehe *Hilfe → Über NexoBuilder*).

### Einzelne HTML-Datei (ohne Installation)

Fertig gebaut gibt es die Datei unter **[Releases](https://github.com/Kyloschmeilo/NexoBuilder/releases/latest)** und bei jedem Push unter **GitHub → Actions → Build → Artefakt „NexoBuilder“**
(`NexoBuilder.html`). Oder selbst bauen:

```bash
npm install
npm run build:single
```

Danach `dist-single/index.html` (bzw. `NexoBuilder.html`) per Doppelklick im Browser (Chrome, Edge oder Firefox) öffnen.
Die Datei kann beliebig kopiert werden und funktioniert offline.

### Entwicklungsserver

```bash
npm install
npm run dev
```

und <http://localhost:5173> öffnen.

### Projekte teilen und gemeinsam bearbeiten

Funktioniert im Windows-Programm. Ihr braucht einen Ordner, den ihr gemeinsam nutzt – z.B. in **OneDrive**,
**Google Drive** oder **Dropbox** (Ordner anlegen und für die anderen freigeben).

1. Projekt öffnen → oben auf **Teilen** klicken → Namen eintragen → **Ordner wählen und teilen** → den gemeinsamen Ordner wählen.
   Liegen darin schon andere Dateien, legt NexoBuilder einen Unterordner mit dem Projektnamen an.
2. Die anderen klicken auf der Startseite (oder im Projektmenü) auf **Geteiltes Projekt öffnen** und wählen denselben Ordner.
3. Ab jetzt kommen Änderungen automatisch bei allen an – meist nach wenigen Sekunden, je nachdem wie schnell der
   Cloud-Dienst die Dateien überträgt. Oben zeigt ein Punkt den Zustand: grün = aktuell, gelb = überträgt bzw. Ordner
   gerade nicht erreichbar (Änderungen werden nachgeholt), rot = Fehler.

Gut zu wissen:

- Jedes Item, jeder Ordner und jede Glyphe ist eine eigene Datei. Arbeiten mehrere gleichzeitig an verschiedenen Items,
  bleibt alles erhalten. Ändern zwei Personen gleichzeitig **dasselbe** Item, gilt die zuletzt gespeicherte Änderung.
- **Rückgängig** nimmt nur deine eigenen Änderungen zurück, nie die der anderen.
- Wer offline arbeitet, bekommt die Änderungen der anderen beim nächsten Start – und die eigenen werden dann übertragen.
- **Teilen beenden** trennt nur die Verbindung; deine Kopie und der Ordner bleiben erhalten.
- Die Dateien im geteilten Ordner bitte nicht von Hand ändern.

### Lokaler Testserver

Im Windows-Programm gibt es links unten den Bereich **Testserver**. Damit läuft ein Minecraft-Server (Paper) mit Nexo
direkt auf deinem PC – und alles, was du in NexoBuilder änderst, ist nach wenigen Sekunden im Spiel.

1. **Testserver** öffnen → **JAR auswählen …** → deine Nexo-JAR wählen (die gekaufte Datei, z.B. von Polymart).
   Sie wird nur in den lokalen Testserver kopiert und nirgendwohin hochgeladen.
2. Minecraft-Version wählen (Standard: die Version des Projekts), deinen **Minecraft-Namen** eintragen und die
   **Minecraft-EULA** akzeptieren.
3. **Server starten**. Beim ersten Mal lädt NexoBuilder Paper und – falls nötig – Java herunter (einige Minuten).
4. In Minecraft (gleiche Version) → **Mehrspieler → Direktverbindung → `localhost`**. Das Resourcepack kommt automatisch.

Danach:

- Jede Änderung (neues Item, anderes Modell, Eigenschaften, Rezepte, Glyphen …) wird automatisch nach `plugins/Nexo`
  übertragen und mit `nexo reload all` geladen; Nexo schickt das neue Pack an alle Spieler.
- Im Item-Editor legt **Im Testserver geben** das Item direkt in dein Inventar.
- Die **Konsole** zeigt die Server-Ausgabe; dort kannst du Befehle eingeben (ohne `/`).
- Dein Name bekommt beim Start OP-Rechte. Die Welt ist flach, im Kreativmodus und friedlich.
- Beim Schließen von NexoBuilder wird der Server sauber gestoppt (die Welt wird gespeichert).

NexoBuilder stellt Nexo im Testserver so ein, dass das Resourcepack vom eigenen PC kommt (`Pack.server.type: SELFHOST`,
Adresse `127.0.0.1`, Port 8082). Der Server liegt im App-Datenordner unter `testserver/server` (Knopf **Ordner**).

### Installation der exportierten Items auf dem Server

1. Export-ZIP („Für den Nexo-Ordner“) in `plugins/Nexo/` entpacken.
2. `/nexo reload all` ausführen (oder Server neu starten).
3. Items mit `/nexo give <spieler> <item_id> [anzahl]` (z.B. `/nexo give @s ruby_sword`) oder über `/nexo inventory` holen.

## Was wird erzeugt?

Beispiel für ein Projekt mit dem Namespace `meinpack`:

```
items/waffen/waffen.yml
pack/external_packs/meinpack/pack.mcmeta
pack/external_packs/meinpack/assets/meinpack/models/item/waffen/rubin_schwert.json
pack/external_packs/meinpack/assets/meinpack/textures/item/waffen/rubin_schwert/klinge.png
```

```yaml
rubin_schwert:
  itemname: "<red>Rubin-Schwert"
  material: PAPER
  Pack:
    model: meinpack:item/waffen/rubin_schwert
  Components:
    item_model: nexo:rubin_schwert
    max_stack_size: 1
```

- Texturen liegen unter `textures/item/…` bzw. für eigene Blöcke unter `textures/block/…` – nur diese Ordner
  landen automatisch in den Textur-Atlanten von Minecraft.
- `Components.item_model: nexo:<id>` sorgt dafür, dass Nexo für jedes Item ein eigenes ItemModel erzeugt
  (empfohlen ab 1.21.4, abschaltbar in den Projekt-Einstellungen).
- Die YAML wird im YAML-1.1-Modus geschrieben (wie Bukkit/SnakeYAML sie liest), damit Texte wie `yes` oder `1:30`
  nicht falsch interpretiert werden.

## Entwicklung

```bash
npm test          # Unit-Tests (Konverter, YAML, Export)
npm run typecheck # TypeScript
npm run build     # Produktions-Build nach dist/
npm run app       # Desktop-Programm (Electron) lokal starten
npm run icon      # App-Icon (build/icon.png) neu erzeugen
```

Neue Version veröffentlichen: Version in `package.json` erhöhen, in `CHANGELOG.md` einen Abschnitt
`## <version>` ergänzen und dann auf GitHub unter **Actions → Build → Run workflow** starten
(oder einen Tag `v<version>` pushen). GitHub Actions baut und testet die exe und erstellt den Release
`v<version>` mit Installer, Portable-exe und HTML-Datei.

Aufbau:

- `src/core/model` – Import von `.bbmodel`, Java-JSON und PNG
- `src/core/nexo` – Eigenschafts-Schema, YAML-Erzeugung
- `src/core/export` – Export-Planung, Prüfungen, ZIP
- `src/core/sync` – Abgleich geteilter Projekte (Dateiformat, Zusammenführen, Konflikte)
- `src/core/testserver` – Dateien und Nexo-Einstellungen für den lokalen Testserver
- `src/ui` – Oberfläche (React), 3D-Vorschau (three.js)
- `electron/` – Desktop-Programm (Electron), Konfiguration in `electron-builder.yml`;
  `share.cjs` regelt den Zugriff auf geteilte Ordner (nur selbst gewählte Ordner, nur Projektdateien),
  `testserver.cjs` lädt Paper/Java herunter und steuert den lokalen Testserver
