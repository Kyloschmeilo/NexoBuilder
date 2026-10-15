# Changelog

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
