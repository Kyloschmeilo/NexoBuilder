import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import type { Project } from '../types';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { createGlyph } from '../nexo/glyphs';
import { createSound } from '../nexo/sounds';
import { createPainting } from '../nexo/paintings';
import { readShareFolder, SyncEngine, ShareFolderError, type SyncFileInfo, type SyncFs, type SyncState } from './engine';
import { RECOVERY_FOLDER_ID } from './merge';
import { PROJECT_FILE } from './format';

/** Gemeinsamer Ordner im Speicher – wie ein OneDrive-Ordner, den beide sehen */
class MemoryFolder {
  files = new Map<string, { content: string; mtimeMs: number }>();
  private time = 1000;
  writes = 0;
  fs(): SyncFs {
    return {
      list: async () => [...this.files].map(([path, f]) => ({ path, mtimeMs: f.mtimeMs, size: f.content.length })),
      read: async (path) => this.files.get(path)?.content ?? null,
      write: async (path, content): Promise<SyncFileInfo> => {
        this.writes++;
        const mtimeMs = ++this.time;
        this.files.set(path, { content, mtimeMs });
        return { path, mtimeMs, size: content.length };
      },
    };
  }
  /** Datei von außen ersetzen (z.B. Cloud-Dienst lädt eine andere Fassung herunter) */
  put(path: string, content: string) {
    this.files.set(path, { content, mtimeMs: ++this.time });
  }
  json(path: string) {
    return JSON.parse(this.files.get(path)!.content);
  }
}

/** Eine Person mit NexoBuilder: Projekt + Undo-Verlauf wie im echten Store */
class Client {
  project: Project;
  past: Project[] = [];
  engine!: SyncEngine;
  applied: string[] = [];
  constructor(
    project: Project,
    readonly folder: MemoryFolder,
    readonly name: string,
    public clock: { t: number },
    state: SyncState | null = null,
  ) {
    this.project = project;
    this.connect(state);
  }
  connect(state: SyncState | null) {
    this.engine = new SyncEngine(
      this.folder.fs(),
      {
        getProject: () => this.project,
        applyRemote: (transform, changes) => {
          this.project = transform(this.project);
          this.past = this.past.map(transform);
          this.applied.push(...changes.map((c) => `${c.byName}:${c.kind}:${c.label}${c.deleted ? ':gelöscht' : ''}`));
        },
      },
      { clientId: `id-${this.name}`, userName: this.name },
      state,
      () => this.clock.t,
    );
  }
  edit(recipe: (draft: Project) => void) {
    this.past.push(this.project);
    this.project = produce(this.project, recipe);
    this.engine.noteLocalChange(this.project);
  }
  undo() {
    this.project = this.past.pop()!;
    this.engine.noteLocalChange(this.project);
  }
  async sync() {
    return this.engine.sync();
  }
}

function sampleProject(): Project {
  const project = createProject('Mittelalter', 'mittelalter');
  const folder = createFolder('Waffen', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Rubinschwert', nexoId: 'ruby_sword', folderId: folder.id, model: null });
  insertItem(project, item);
  project.glyphs.push(createGlyph('g_herz', 'herz', null, 'image'));
  return project;
}

async function setup() {
  const folder = new MemoryFolder();
  const clock = { t: 10_000 };
  const anna = new Client(sampleProject(), folder, 'Anna', clock);
  const { written } = await anna.sync();
  expect(written).toBe(4); // project.json, Ordner, Item, Glyphe
  const shared = await readShareFolder(folder.fs());
  expect(shared).not.toBeNull();
  const ben = new Client(shared!.project, folder, 'Ben', clock, shared!.state);
  return { folder, clock, anna, ben };
}

const firstItem = (p: Project) => Object.values(p.items)[0];
const firstFolder = (p: Project) => p.folders[p.rootFolderIds[0]];
/** Vergleichbarer Inhalt: Schlüssel sortiert, ohne updatedAt (setzt jede Kopie selbst) */
const content = (p: Project) =>
  JSON.stringify({ ...p, updatedAt: 0 }, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
      : value,
  );

describe('Geteilte Projekte', () => {
  it('schreibt ein Projekt als Einzeldateien und liest es vollständig wieder ein', async () => {
    const { folder, anna, ben } = await setup();
    expect([...folder.files.keys()].sort()).toEqual(
      [PROJECT_FILE, `folders/${firstFolder(anna.project).id}.json`, `items/${firstItem(anna.project).id}.json`, 'glyphs/g_herz.json'].sort(),
    );
    expect(content(ben.project)).toBe(content(anna.project));
    // Beim Verbinden gibt es nichts zu tun
    const writes = folder.writes;
    expect(await ben.sync()).toEqual({ applied: [], written: 0 });
    expect(folder.writes).toBe(writes);
  });

  it('überträgt Änderungen in beide Richtungen', async () => {
    const { clock, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    clock.t += 10;
    anna.edit((d) => {
      d.items[itemId].displayName = 'Feuerschwert';
    });
    expect((await anna.sync()).written).toBe(1);
    const fromAnna = await ben.sync();
    expect(fromAnna.applied.map((c) => c.label)).toEqual(['Feuerschwert']);
    expect(ben.project.items[itemId].displayName).toBe('Feuerschwert');
    expect(ben.applied).toEqual(['Anna:item:Feuerschwert']);

    clock.t += 10;
    ben.edit((d) => {
      d.items[itemId].config.material = 'DIAMOND_SWORD';
      d.name = 'Mittelalter-Pack';
    });
    await ben.sync();
    await anna.sync();
    expect(anna.project.items[itemId].config.material).toBe('DIAMOND_SWORD');
    expect(anna.project.name).toBe('Mittelalter-Pack');
    expect(content(anna.project)).toBe(content(ben.project));
  });

  it('neue Items, Ordner und Glyphen kommen bei den anderen an', async () => {
    const { clock, anna, ben } = await setup();
    clock.t += 10;
    const sub = createFolder('Bögen', firstFolder(anna.project).id);
    const bow = createItem({ displayName: 'Langbogen', nexoId: 'longbow', folderId: sub.id, model: null });
    anna.edit((d) => {
      insertFolder(d, sub);
      insertItem(d, bow);
      d.glyphs.push(createGlyph('g_stern', 'stern', null, 'image'));
    });
    await anna.sync();
    await ben.sync();
    expect(ben.project.items[bow.id].displayName).toBe('Langbogen');
    expect(ben.project.folders[sub.id].itemIds).toEqual([bow.id]);
    expect(firstFolder(ben.project).folderIds).toEqual([sub.id]);
    expect(ben.project.glyphs.map((g) => g.id)).toEqual(['g_herz', 'g_stern']);
    expect(content(ben.project)).toBe(content(anna.project));
  });

  it('Sounds und Gemälde werden als eigene Dateien geteilt – samt Reihenfolge und Löschen', async () => {
    const { folder, clock, anna, ben } = await setup();
    clock.t += 10;
    anna.edit((d) => {
      d.sounds.push(createSound('s_ding', 'ding', [{ name: 'ding.ogg', dataUrl: 'data:audio/ogg;base64,T2dnUw==', size: 4 }]));
      d.sounds.push(createSound('s_dong', 'dong', []));
      d.paintings.push(createPainting('p_bild', 'bild', null));
    });
    await anna.sync();
    expect(folder.files.has('sounds/s_ding.json')).toBe(true);
    expect(folder.files.has('paintings/p_bild.json')).toBe(true);
    await ben.sync();
    expect(ben.project.sounds.map((s) => s.soundId)).toEqual(['ding', 'dong']);
    expect(ben.project.paintings.map((p) => p.paintingId)).toEqual(['bild']);
    expect(ben.applied).toContain('Anna:sound:ding');

    clock.t += 10;
    ben.edit((d) => {
      d.sounds.reverse();
      d.paintings = [];
    });
    await ben.sync();
    await anna.sync();
    expect(anna.project.sounds.map((s) => s.soundId)).toEqual(['dong', 'ding']);
    expect(anna.project.paintings).toEqual([]);
    expect(content(anna.project)).toBe(content(ben.project));
  });

  it('Löschen kommt bei den anderen an (Grabstein-Datei)', async () => {
    const { folder, clock, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    clock.t += 10;
    anna.edit((d) => {
      delete d.items[itemId];
      const f = d.folders[d.rootFolderIds[0]];
      f.itemIds = f.itemIds.filter((id) => id !== itemId);
      d.glyphs = [];
    });
    await anna.sync();
    expect(folder.json(`items/${itemId}.json`)).toMatchObject({ deleted: true });
    await ben.sync();
    expect(ben.project.items[itemId]).toBeUndefined();
    expect(firstFolder(ben.project).itemIds).toEqual([]);
    expect(ben.project.glyphs).toEqual([]);
    expect(ben.applied).toContain('Anna:item:Rubinschwert:gelöscht');
  });

  it('gleichzeitige Änderungen am selben Item: die neuere gewinnt bei allen', async () => {
    const { clock, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    clock.t += 10;
    anna.edit((d) => {
      d.items[itemId].displayName = 'Annas Name';
    });
    clock.t += 10;
    ben.edit((d) => {
      d.items[itemId].displayName = 'Bens Name';
    });
    // Beide schreiben, bevor sie die Änderung des anderen gesehen haben
    await anna.engine.flush();
    await ben.engine.flush();
    await anna.sync();
    await ben.sync();
    await anna.sync();
    expect(anna.project.items[itemId].displayName).toBe('Bens Name');
    expect(ben.project.items[itemId].displayName).toBe('Bens Name');
  });

  it('wird die Datei durch eine ältere Fassung ersetzt, stellt der Neuere seine wieder her', async () => {
    const { folder, clock, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    const path = `items/${itemId}.json`;
    const old = folder.files.get(path)!.content;
    clock.t += 10;
    anna.edit((d) => {
      d.items[itemId].displayName = 'Neu';
    });
    await anna.sync();
    folder.put(path, old); // Cloud-Dienst hat die alte Fassung zurückgespielt
    await anna.sync();
    expect(folder.json(path).data.displayName).toBe('Neu');
    await ben.sync();
    expect(ben.project.items[itemId].displayName).toBe('Neu');
  });

  it('eine eigene, noch nicht geschriebene Änderung wird nicht überschrieben', async () => {
    const { clock, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    clock.t += 10;
    anna.edit((d) => {
      d.items[itemId].displayName = 'Von Anna';
    });
    await anna.sync();
    clock.t += 10;
    ben.edit((d) => {
      d.items[itemId].displayName = 'Von Ben (später)';
    });
    await ben.sync(); // sieht Annas Datei, behält aber die eigene neuere Änderung
    expect(ben.project.items[itemId].displayName).toBe('Von Ben (später)');
    await anna.sync();
    expect(anna.project.items[itemId].displayName).toBe('Von Ben (später)');
  });

  it('zwei Personen legen gleichzeitig Items in denselben Ordner – beide bleiben erhalten', async () => {
    const { clock, anna, ben } = await setup();
    const folderId = firstFolder(anna.project).id;
    clock.t += 10;
    const a = createItem({ displayName: 'Axt', nexoId: 'axe', folderId, model: null });
    anna.edit((d) => insertItem(d, a));
    clock.t += 10;
    const b = createItem({ displayName: 'Bogen', nexoId: 'bow', folderId, model: null });
    ben.edit((d) => insertItem(d, b));
    await anna.engine.flush();
    await ben.engine.flush();
    await anna.sync();
    await ben.sync();
    for (const client of [anna, ben]) {
      expect(client.project.items[a.id]).toBeDefined();
      expect(client.project.items[b.id]).toBeDefined();
      expect(new Set(client.project.folders[folderId].itemIds)).toEqual(new Set(Object.keys(client.project.items)));
      expect(client.project.folders[folderId].itemIds).toHaveLength(3);
    }
    expect(content(anna.project)).toBe(content(ben.project));
  });

  it('Item in einem gleichzeitig gelöschten Ordner geht nicht verloren', async () => {
    const { clock, anna, ben } = await setup();
    const folderId = firstFolder(anna.project).id;
    const oldItem = firstItem(anna.project).id;
    clock.t += 10;
    anna.edit((d) => {
      delete d.items[oldItem];
      delete d.folders[folderId];
      d.rootFolderIds = [];
    });
    clock.t += 10;
    const rescued = createItem({ displayName: 'Neu', nexoId: 'neu', folderId, model: null });
    ben.edit((d) => insertItem(d, rescued));
    await anna.engine.flush();
    await ben.engine.flush();
    await anna.sync();
    await ben.sync();
    await anna.sync();
    for (const client of [anna, ben]) {
      expect(client.project.items[rescued.id].folderId).toBe(RECOVERY_FOLDER_ID);
      expect(client.project.folders[RECOVERY_FOLDER_ID].itemIds).toEqual([rescued.id]);
      expect(client.project.rootFolderIds).toEqual([RECOVERY_FOLDER_ID]);
    }
  });

  it('Rückgängig macht nur eigene Änderungen rückgängig, nicht die der anderen', async () => {
    const { clock, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    clock.t += 10;
    anna.edit((d) => {
      d.name = 'Annas Projektname';
    });
    clock.t += 10;
    ben.edit((d) => {
      d.items[itemId].displayName = 'Bens Item';
    });
    await ben.sync();
    await anna.sync();
    expect(anna.project.items[itemId].displayName).toBe('Bens Item');
    anna.undo();
    expect(anna.project.name).toBe('Mittelalter');
    expect(anna.project.items[itemId].displayName).toBe('Bens Item');
    await anna.sync();
    await ben.sync();
    expect(ben.project.name).toBe('Mittelalter');
    expect(ben.project.items[itemId].displayName).toBe('Bens Item');
  });

  it('nach einem Neustart wird nur geschrieben, was sich wirklich geändert hat', async () => {
    const { folder, clock, anna } = await setup();
    const state = anna.engine.state;
    const writes = folder.writes;
    anna.connect(state);
    expect(await anna.sync()).toEqual({ applied: [], written: 0 });
    expect(folder.writes).toBe(writes);

    // Änderung, die gespeichert wurde, aber vor dem Schließen nicht mehr in den Ordner kam
    const itemId = firstItem(anna.project).id;
    anna.project = produce(anna.project, (d) => {
      d.items[itemId].displayName = 'Offline geändert';
    });
    clock.t += 10;
    anna.connect(state);
    expect((await anna.sync()).written).toBe(1);
    expect(folder.json(`items/${itemId}.json`).data.displayName).toBe('Offline geändert');
  });

  it('ignoriert Konfliktkopien, fremde und unvollständige Dateien', async () => {
    const { folder, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    folder.put(`items/${itemId} (Konflikt).json`, '{"kaputt": true}');
    folder.put('notizen.txt', 'hallo');
    folder.put(`items/${itemId}.json`, '{"format":"nexobuilder-share","vers'); // wird gerade geladen
    const result = await ben.sync();
    expect(result.applied).toEqual([]);
    expect(ben.project.items[itemId].displayName).toBe('Rubinschwert');
  });

  it('verweigert einen Ordner, in dem ein anderes Projekt liegt', async () => {
    const { folder, anna } = await setup();
    const other = createProject('Anderes');
    const data = folder.json(PROJECT_FILE);
    folder.put(PROJECT_FILE, JSON.stringify({ ...data, id: other.id, rev: data.rev + 1, data: { ...data.data, id: other.id } }));
    await expect(anna.sync()).rejects.toBeInstanceOf(ShareFolderError);
  });
});
