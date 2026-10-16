import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import {
  createFolder,
  createGlyph,
  createItem,
  createPainting,
  createProject,
  createSound,
  insertFolder,
  insertItem,
  type Project,
  RECOVERY_FOLDER_ID,
} from '@resourcepackbuilder/core/project';
import { readShareFolder, SyncEngine, ShareFolderError, type ShareFileInfo, type SyncFs, type SyncState } from './engine';
import { entityPath, isShareFilePath, parseEntityKey, parseEntityPath, PROJECT_FILE, README_FILE } from './format';

/** Shared in-memory folder – like a OneDrive folder that both see */
class MemoryFolder {
  files = new Map<string, { content: string; mtimeMs: number }>();
  private time = 1000;
  writes = 0;
  fs(): SyncFs {
    return {
      list: async () => [...this.files].map(([path, f]) => ({ path, mtimeMs: f.mtimeMs, size: f.content.length })),
      read: async (path) => this.files.get(path)?.content ?? null,
      write: async (path, content): Promise<ShareFileInfo> => {
        this.writes++;
        const mtimeMs = ++this.time;
        this.files.set(path, { content, mtimeMs });
        return { path, mtimeMs, size: content.length };
      },
    };
  }
  /** Replace a file from outside (e.g. the cloud service downloads a different version) */
  put(path: string, content: string) {
    this.files.set(path, { content, mtimeMs: ++this.time });
  }
  json(path: string) {
    return JSON.parse(this.files.get(path)!.content);
  }
}

/** A person using ResourcepackBuilder: project + undo history like in the real store */
class Client {
  project: Project;
  past: Project[] = [];
  engine!: SyncEngine;
  applied: string[] = [];
  /** The project is closed (e.g. while another one is open) */
  closed = false;
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
        getProject: () => (this.closed ? null : this.project),
        applyRemote: (transform, changes) => {
          this.project = transform(this.project);
          this.past = this.past.map(transform);
          this.applied.push(...changes.map((c) => `${c.byName}:${c.kind}:${c.label}${c.deleted ? ':deleted' : ''}`));
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
  const item = createItem({ displayName: 'Rubinschwert', itemId: 'ruby_sword', folderId: folder.id, model: null });
  insertItem(project, item);
  project.glyphs.push(createGlyph('g_herz', 'herz', null, 'image'));
  return project;
}

async function setup() {
  const folder = new MemoryFolder();
  const clock = { t: 10_000 };
  const anna = new Client(sampleProject(), folder, 'Anna', clock);
  const { written } = await anna.sync();
  expect(written).toBe(4); // project.json, folder, item, glyph
  const shared = await readShareFolder(folder.fs());
  expect(shared).not.toBeNull();
  const ben = new Client(shared!.project, folder, 'Ben', clock, shared!.state);
  return { folder, clock, anna, ben };
}

const firstItem = (p: Project) => Object.values(p.items)[0];
const firstFolder = (p: Project) => p.folders[p.rootFolderIds[0]];
/** Comparable content: keys sorted, without updatedAt (each copy sets it itself) */
const content = (p: Project) =>
  JSON.stringify({ ...p, updatedAt: 0 }, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
      : value,
  );

describe('entity keys and paths', () => {
  it('round-trips every kind of entry', () => {
    for (const kind of ['folder', 'item', 'glyph', 'sound', 'painting'] as const) {
      expect(parseEntityKey(`${kind}:x_1`)).toEqual({ kind, id: 'x_1' });
      expect(parseEntityPath(entityPath({ kind, id: 'x_1' }))).toEqual({ kind, id: 'x_1' });
    }
    expect(parseEntityPath(PROJECT_FILE)).toEqual({ kind: 'project' });
  });

  it('rejects unknown kinds, including inherited object keys', () => {
    expect(parseEntityKey('constructor:x')).toBeNull();
    expect(parseEntityKey('toString:x')).toBeNull();
    expect(parseEntityPath('constructor/x.json')).toBeNull();
    expect(parseEntityPath('items/x (1).json')).toBeNull();
    expect(isShareFilePath('items/x_1.json')).toBe(true);
    expect(isShareFilePath('other/x_1.json')).toBe(false);
  });
});

describe('Shared projects', () => {
  it('writes a project as individual files and reads it back completely', async () => {
    const { folder, anna, ben } = await setup();
    expect([...folder.files.keys()].sort()).toEqual(
      [
        PROJECT_FILE,
        `folders/${firstFolder(anna.project).id}.json`,
        `items/${firstItem(anna.project).id}.json`,
        'glyphs/g_herz.json',
      ].sort(),
    );
    expect(content(ben.project)).toBe(content(anna.project));
    // Nothing to do when connecting
    const writes = folder.writes;
    expect(await ben.sync()).toEqual({ applied: [], written: 0 });
    expect(folder.writes).toBe(writes);
  });

  it('transfers changes in both directions', async () => {
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

  it('new items, folders and glyphs reach the others', async () => {
    const { clock, anna, ben } = await setup();
    clock.t += 10;
    const sub = createFolder('Bögen', firstFolder(anna.project).id);
    const bow = createItem({ displayName: 'Langbogen', itemId: 'longbow', folderId: sub.id, model: null });
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

  it('sounds and paintings are shared as separate files – including order and deletion', async () => {
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

  it('deletion reaches the others (tombstone file)', async () => {
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
    expect(ben.applied).toContain('Anna:item:Rubinschwert:deleted');
  });

  it('concurrent changes to the same item: the newer one wins for everyone', async () => {
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
    // Both write before having seen the other's change
    await anna.engine.flush();
    await ben.engine.flush();
    await anna.sync();
    await ben.sync();
    await anna.sync();
    expect(anna.project.items[itemId].displayName).toBe('Bens Name');
    expect(ben.project.items[itemId].displayName).toBe('Bens Name');
  });

  it('if the file is replaced by an older version, the newer one restores its own', async () => {
    const { folder, clock, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    const path = `items/${itemId}.json`;
    const old = folder.files.get(path)!.content;
    clock.t += 10;
    anna.edit((d) => {
      d.items[itemId].displayName = 'Neu';
    });
    await anna.sync();
    folder.put(path, old); // cloud service restored the old version
    await anna.sync();
    expect(folder.json(path).data.displayName).toBe('Neu');
    await ben.sync();
    expect(ben.project.items[itemId].displayName).toBe('Neu');
  });

  it('an own, not yet written change is not overwritten', async () => {
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
    await ben.sync(); // sees Anna's file but keeps its own newer change
    expect(ben.project.items[itemId].displayName).toBe('Von Ben (später)');
    await anna.sync();
    expect(anna.project.items[itemId].displayName).toBe('Von Ben (später)');
  });

  it('two people add items to the same folder at the same time – both are kept', async () => {
    const { clock, anna, ben } = await setup();
    const folderId = firstFolder(anna.project).id;
    clock.t += 10;
    const a = createItem({ displayName: 'Axt', itemId: 'axe', folderId, model: null });
    anna.edit((d) => insertItem(d, a));
    clock.t += 10;
    const b = createItem({ displayName: 'Bogen', itemId: 'bow', folderId, model: null });
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

  it('an item in a concurrently deleted folder is not lost', async () => {
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
    const rescued = createItem({ displayName: 'Neu', itemId: 'neu', folderId, model: null });
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

  it('undo only reverts own changes, not those of others', async () => {
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

  it('after a restart only what really changed is written', async () => {
    const { folder, clock, anna } = await setup();
    const state = anna.engine.state;
    const writes = folder.writes;
    anna.connect(state);
    expect(await anna.sync()).toEqual({ applied: [], written: 0 });
    expect(folder.writes).toBe(writes);

    // Change that was saved but did not make it into the folder before closing
    const itemId = firstItem(anna.project).id;
    anna.project = produce(anna.project, (d) => {
      d.items[itemId].displayName = 'Offline geändert';
    });
    clock.t += 10;
    anna.connect(state);
    expect((await anna.sync()).written).toBe(1);
    expect(folder.json(`items/${itemId}.json`).data.displayName).toBe('Offline geändert');
  });

  it('ignores conflict copies, foreign and incomplete files', async () => {
    const { folder, anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    folder.put(`items/${itemId} (Konflikt).json`, '{"kaputt": true}');
    folder.put('notizen.txt', 'hallo');
    folder.put(`items/${itemId}.json`, '{"format":"resourcepackbuilder-share","vers'); // currently being downloaded
    const result = await ben.sync();
    expect(result.applied).toEqual([]);
    expect(ben.project.items[itemId].displayName).toBe('Rubinschwert');
  });

  it('refuses a folder that contains another project', async () => {
    const { folder, anna } = await setup();
    const other = createProject('Anderes');
    const data = folder.json(PROJECT_FILE);
    folder.put(PROJECT_FILE, JSON.stringify({ ...data, id: other.id, rev: data.rev + 1, data: { ...data.data, id: other.id } }));
    await expect(anna.sync()).rejects.toBeInstanceOf(ShareFolderError);
  });

  it('reads a remote change again if it could not be applied yet', async () => {
    const { anna, ben } = await setup();
    const itemId = firstItem(anna.project).id;
    anna.edit((draft) => {
      draft.items[itemId].displayName = 'Smaragdschwert';
    });
    await anna.sync();
    // Ben's project is closed while the change arrives – nothing can be applied
    ben.closed = true;
    expect((await ben.sync()).applied).toEqual([]);
    ben.closed = false;
    const result = await ben.sync();
    expect(result.applied.map((c) => c.label)).toEqual(['Smaragdschwert']);
    expect(ben.project.items[itemId].displayName).toBe('Smaragdschwert');
  });

  it('migrates items from older versions (armor in the config)', async () => {
    const { folder, anna, ben } = await setup();
    const item = firstItem(anna.project);
    const path = `items/${item.id}.json`;
    const envelope = folder.json(path);
    envelope.rev += 1;
    envelope.data.config.$armor = { set: 'ruby', layer1: '@asset:a1' };
    folder.put(path, JSON.stringify(envelope));
    await ben.sync();
    expect(ben.project.items[item.id].armor).toEqual({ set: 'ruby', layer1: '@asset:a1' });
    expect(ben.project.items[item.id].config.$armor).toBeUndefined();
  });

  it('skips envelopes with invalid data from other installations and cleans up lenient fields', async () => {
    const { folder, anna, ben } = await setup();
    const glyph = anna.project.glyphs[0];
    const glyphPath = `glyphs/${glyph.id}.json`;
    const glyphEnvelope = folder.json(glyphPath);
    // A broken glyph (no glyphId) is ignored …
    folder.put(glyphPath, JSON.stringify({ ...glyphEnvelope, rev: glyphEnvelope.rev + 1, data: { id: glyph.id, glyphId: 5 } }));
    // … as are folder envelopes whose data belongs to another id, and kinds that do not match the path
    const folderId = firstFolder(anna.project).id;
    const folderEnvelope = folder.json(`folders/${folderId}.json`);
    folder.put(
      `folders/${folderId}.json`,
      JSON.stringify({ ...folderEnvelope, rev: folderEnvelope.rev + 1, data: { ...folderEnvelope.data, id: 'other' } }),
    );
    expect((await ben.sync()).applied).toEqual([]);
    // A glyph with bad optional fields gets defaults instead of crashing the checks
    folder.put(
      glyphPath,
      JSON.stringify({
        ...glyphEnvelope,
        rev: glyphEnvelope.rev + 2,
        data: { id: glyph.id, glyphId: 'herz', placeholders: null, rows: 'x' },
      }),
    );
    await ben.sync();
    expect(ben.project.glyphs[0]).toMatchObject({ glyphId: 'herz', placeholders: [], rows: 1 });
  });

  it('starts from a damaged stored sync state without crashing', () => {
    const folder = new MemoryFolder();
    const clock = { t: 10_000 };
    const damaged = {
      clock: 'x',
      versions: { project: null, 'item:a': { rev: 1, by: 'x', hash: 'h' } },
      files: [],
    } as unknown as SyncState;
    const anna = new Client(sampleProject(), folder, 'Anna', clock, damaged);
    expect(anna.engine.state.clock).toBe(0);
    expect(Object.keys(anna.engine.state.versions)).toEqual(['item:a']);
    expect(anna.engine.state.files).toEqual({});
  });

  it('names the shared folder readme README.txt', () => {
    expect(README_FILE).toBe('README.txt');
  });
});

describe('Shared CraftEngine projects', () => {
  function craftEngineProject(): Project {
    const project = createProject('Burg', 'burg', undefined, 'craftengine');
    const folder = createFolder('Blöcke', null);
    insertFolder(project, folder);
    const item = createItem({ displayName: 'Rubinerz', itemId: 'ruby_ore', folderId: folder.id, model: null });
    item.config = { block: { settings: { hardness: 3 } }, furniture: { settings: { item: 'burg:ruby_ore' } } };
    item.translations = { de_de: 'Rubinerz', en_us: 'Ruby ore' };
    insertItem(project, item);
    project.craftEngine = { lootSources: [{ id: 'burg:ruby_drops', type: 'fixed' }] };
    return project;
  }

  it('round-trips the target, the CraftEngine data and item translations', async () => {
    const folder = new MemoryFolder();
    const clock = { t: 10_000 };
    const anna = new Client(craftEngineProject(), folder, 'Anna', clock);
    await anna.sync();
    const shared = await readShareFolder(folder.fs());
    const ben = new Client(shared!.project, folder, 'Ben', clock, shared!.state);
    expect(ben.project.target).toBe('craftengine');
    expect(ben.project.craftEngine).toEqual(anna.project.craftEngine);
    expect(firstItem(ben.project).translations).toEqual({ de_de: 'Rubinerz', en_us: 'Ruby ore' });
    expect(firstItem(ben.project).config).toEqual(firstItem(anna.project).config);
    expect(content(ben.project)).toBe(content(anna.project));

    // Changes to the CraftEngine data reach the others, removing all of it included
    clock.t += 10;
    anna.edit((d) => {
      d.craftEngine = { lootSources: [{ id: 'burg:other', type: 'fixed' }] };
    });
    expect((await anna.sync()).written).toBe(1);
    await ben.sync();
    expect(ben.project.craftEngine).toEqual({ lootSources: [{ id: 'burg:other', type: 'fixed' }] });
    clock.t += 10;
    ben.edit((d) => {
      delete d.craftEngine;
    });
    await ben.sync();
    await anna.sync();
    expect(anna.project.craftEngine).toBeUndefined();
    expect(anna.project.target).toBe('craftengine');
  });

  it('keeps the own target and CraftEngine data for project files of versions without them', async () => {
    const folder = new MemoryFolder();
    const clock = { t: 10_000 };
    const anna = new Client(craftEngineProject(), folder, 'Anna', clock);
    await anna.sync();
    const envelope = folder.json(PROJECT_FILE);
    delete envelope.data.target;
    delete envelope.data.craftEngine;
    envelope.data.name = 'Burg 2';
    envelope.rev += 1;
    folder.put(PROJECT_FILE, JSON.stringify(envelope));
    await anna.sync();
    expect(anna.project.name).toBe('Burg 2');
    expect(anna.project.target).toBe('craftengine');
    expect(anna.project.craftEngine).toEqual({ lootSources: [{ id: 'burg:ruby_drops', type: 'fixed' }] });
  });

  it('reads an unknown target or broken CraftEngine data leniently', async () => {
    const folder = new MemoryFolder();
    const clock = { t: 10_000 };
    const anna = new Client(craftEngineProject(), folder, 'Anna', clock);
    await anna.sync();
    const envelope = folder.json(PROJECT_FILE);
    envelope.data.target = 'oraxen';
    envelope.data.craftEngine = { lootSources: [5, { id: 'burg:kept' }] };
    folder.put(PROJECT_FILE, JSON.stringify(envelope));
    const shared = await readShareFolder(folder.fs());
    expect(shared!.project.target).toBe('nexo');
    expect(shared!.project.craftEngine).toEqual({ lootSources: [{ id: 'burg:kept' }] });
    envelope.data.craftEngine = 'x';
    folder.put(PROJECT_FILE, JSON.stringify(envelope));
    expect((await readShareFolder(folder.fs()))!.project.craftEngine).toBeUndefined();
  });
});
