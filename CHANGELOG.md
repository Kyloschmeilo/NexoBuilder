# Changelog

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

- Die mitgelieferte Anleitung nennt jetzt die richtige Befehlsform `/nexo give <spieler> <item_id> [anzahl]`
  und `/nexo reload all`.

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
