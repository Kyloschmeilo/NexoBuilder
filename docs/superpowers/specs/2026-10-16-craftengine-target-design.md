# CraftEngine target – design

Date: 2026-10-16 · Branch: `craftengine` (from `ammo-rework` at e5e09cd) · Design page: https://claude.ai/artifact/Dt8Xngjy2LadXkNVJ1KuG6

## Goal

Each project targets one server plugin: **Nexo** (today) or **CraftEngine**. You choose the target when you create the project, and it never changes. These parts stay shared:

- the item tree
- model import and the 3D preview
- assets, media, issues and share sync
- the test server's Paper and Java handling

Only these parts differ per target:

- the editor's property schema
- the generated YAML and the file layout
- the plugin-specific spots of the test server

Non-goals:

- Converting projects between targets.
- Storage locations S2–S4 (separate plan).
- CraftEngine Premium-only features beyond a badge.
- JS scripting, worldgen features, subpacks, `$$version` keys and the item updater. These stay in the raw YAML overlay, written out unchanged.

Decided by the user:

- `Item.nexoId` is **hard-renamed to `itemId`, with no migration**. Old data loses its IDs, and the lenient schema's fallback applies.
- Work happens on local commits only.
- A local Paper and CraftEngine server may be run to capture log lines.

CraftEngine reference material (earlier research, read-only) is in `C:\Users\hombe\AppData\Local\Temp\claude\C--Workspaces-ResourcepackBuilder\8de5f319-7a69-4a89-a141-c4edc400b117\scratchpad\`:

- `craftengine-docs-map.md`: all 177 wiki pages condensed, with gaps from the code marked "(code)".
- `ce-jar/x/`: the extracted 26.9.2 jar, with `config.yml`, `commands.yml` and the bundled packs `resources/default_assets` and `resources/default_templates`.
- `ce/plugin/`: the plugin source.
- `ce/wiki/`: the wiki source.

When the wiki and the jar disagree, the jar's bundled configs and the plugin source win.

## Concepts

```ts
// core/project
export type PackTargetId = 'nexo' | 'craftengine';   // lowercase id; the entry point is still `core/craftEngine`
export const PACK_TARGETS = ['nexo', 'craftengine'] as const;
interface Project { …; target: PackTargetId }      // lenient schema default: 'nexo'
interface Item { …; itemId: string }               // was nexoId; config stays the target's own shape
interface Project { …; craftEngine?: { lootSources?; templates?; globalVariables?; attributes? } }   // project-wide CraftEngine data
```

`Item.config` stays a `ConfigObject`, and its shape belongs to the project's target: Nexo YAML for Nexo, CraftEngine item YAML for CraftEngine. Folders, media (glyphs, sounds, paintings), recipes, variants, armor, assets and settings stay shared. The CraftEngine target writes them in its own format.

### Form schema (editor seam)

The field DSL is generic: `Field`, `fieldToSchema`, `checkFieldValue`, options, the property helpers and the `field.*` builder. It moves from `core/src/nexo/form` to a new entry point, `@resourcepackbuilder/core/form`. The property helpers then take a `FormSchema` value instead of reading module constants:

```ts
// core/form
export interface FormSchema {
  target: PackTargetId;
  groups: Array<{ id: string; label: string; description: string }>;   // message keys
  properties: PropertyDef[];                                             // group: string
  /** i18n namespace of label/description keys ('schema' for Nexo, 'ceSchema' for CraftEngine) */
  messages: string;
  /** Dotted config paths the form manages (CraftEngine: `data.item_name`; Nexo: its top-level keys) */
  managedPaths: string[];
}
activeProperties(schema, owner, group) / availableProperties / propertyConflict / unknownConfigPaths(schema, config) …
```

`core/nexo` exports `NEXO_FORM: FormSchema`, and `core/craftEngine` exports `CRAFT_ENGINE_FORM: FormSchema`. The app picks one with `formFor(project.target)` from a tiny `core/targets` entry point. That entry point is the only module that imports both targets; `core/project` may still not import either of them.

The editor tabs come from the schema: `FormSchema.tabs` lists the property tabs in order. The fixed tabs `general`, `model`, `recipes` and `yaml` stay in the app. CraftEngine adds `block`, `furniture`, `events` and `loot` sections as the phases land.

### Export seam

```ts
// export/src/targets/types.ts
export interface PackTarget<W extends WrittenItemModels = WrittenItemModels> {
  id: PackTargetId;
  /** Item ID rule. Nexo keeps its own; CraftEngine follows the editor rule `[a-z0-9_]+`. */
  itemIds: ItemIdRule;
  /** Builds the item's config from the written models; reports through itemExport. */
  buildItem(itemExport: ItemExport, written: W): Record<string, unknown>; // W: what this target's writeModels returned
  /** Item key in YAML: Nexo `itemId`, CraftEngine `<namespace>:<itemId>`. */
  yamlKey(project: Project, item: Item): string;
  /** Every plugin-side file (item YAML, recipes, media, pack.yml …) relative to `layout.pluginDir`. */
  planPluginFiles(project: Project, plans: ItemPlan[], writer: PackWriter, issues: Issue[]): Map<string, FileContent>;
  layout: TargetLayout;
}
export interface TargetLayout {
  /** 'plugins/Nexo' | 'plugins/CraftEngine' */
  pluginDir: string;
  /** Where the resource pack goes inside pluginDir (Nexo: pack/external_packs/<name>[/|.zip]; CE: resources/<pack>/resourcepack/) */
  packLocation(project: Project, asZip: boolean): string;
  /** Install guide text (README in the zip) */
  installGuide(multi: MultiExportPlan, rootFiles: Map<string, string>): string;
  reloadCommand: string;
}
export const PACK_TARGET_IMPLS: Record<PackTargetId, PackTarget>;
```

`ExportPlan` changes:

- It loses `itemFiles`, `recipeFiles`, `glyphFiles`, `soundEntries` and `paintingEntries`.
- It gains `target: PackTargetId` and `pluginFiles: Map<string, FileContent>`.
- Nexo's root files `sounds.yml` and `paintings.yml` are merged across projects. They stay a Nexo concern: the Nexo target keeps the entries in a target-private part of the plan (`plan.nexo`), and `buildRootFiles` reads them from there.

`nexoFolderEntries` becomes `pluginFolderEntries(multi, opts)`, which uses each project's layout. A multi-project export may mix targets: each project's files go under its own plugin directory.

The CraftEngine layout inside `plugins/CraftEngine/`:

```
resources/<pack>/pack.yml
resources/<pack>/configuration/items/<folder…>.yml    # items, blocks, furniture, recipes of that folder (or per item)
resources/<pack>/configuration/{images,sounds,paintings,equipments,categories}.yml
resources/<pack>/configuration/lang/<locale>.yml       # P3
resources/<pack>/resourcepack/pack.png + assets/…      # PackWriter output, unchanged paths
```

### Test-server seam

```ts
// test-server/src/adapter.ts
export interface ServerAdapter {
  target: PackTargetId;
  /** Plugin folder under the server dir: 'plugins/Nexo' | 'plugins/CraftEngine' */
  pluginDir: string;
  /** How the JAR is obtained */
  jar: { kind: 'manual'; descriptorName: string } | { kind: 'modrinth'; project: 'craftengine'; loader: 'paper' };
  /** Plugin config the app patches, relative to pluginDir: 'settings.yml' | 'config.yml' */
  configFile: string;
  patchConfig(current: string | null, options: { packPort: number }): string;
  paperGlobalOverrides: Array<[string[], unknown]>;
  /** Paths (relative to pluginDir) the project may write; null = refused */
  syncPathSegments(relativePath: string, project: { packName: string }): string[] | null;
  reloadCommand: string;
  isReloadCommand(command: string): boolean;
  giveCommand(yamlKey: string, amount: number, player: string): string;
  resendPackCommand(player: string): string | null;
  /** The plugin's log reports the pack build; without it nobody waits for a build. Nexo and CraftEngine: true */
  reportsPackBuild: boolean;
  /** The plugin builds the pack on startup by itself. Nexo: true. CraftEngine: false, so the app sends the reload command once the server logs "Done". */
  buildsPackOnStart: boolean;
  parseLogLine(line: string): ServerLogEvent | null; // shared Paper patterns + plugin patterns
}
export const SERVER_ADAPTERS: Record<PackTargetId, ServerAdapter>;
```

Config, contract and runtime changes:

- `TestServerConfig.nexoJar` becomes `pluginJars: Partial<Record<PackTargetId, PluginJarInfo>>`. The lenient read of `testserver.json` maps an old `nexoJar` to `pluginJars.nexo`. It's local machine state, so this costs one line.
- The IPC channel `testserver:choose-nexo-jar` becomes `testserver:choose-plugin-jar(target)`. `testserver:download-plugin(target)` is new, for Modrinth.
- `read-settings` becomes `read-plugin-config(target)`.
- `start(target)` starts a server for that target in `<userData>/testserver/<target>/server`. The existing directory is moved there once.
- `TestServerState` carries the `target` of the running server. Sync, give and reload are refused when the open project's target differs, and the UI says which plugin the server runs.
- The CraftEngine JAR comes from `https://api.modrinth.com/v2/project/craftengine/version?loaders=["paper"]&game_versions=["<paper version>"]`. The response is parsed with zod, the file is checked against the `sha512` Modrinth lists, and the newest release is picked. A manual JAR (Premium) is still possible through `choose-plugin-jar`.

CraftEngine's `config.yml` patch uses the yaml Document API, so comments survive. It sets:

- `resource-pack.self-host.ip: 127.0.0.1`
- `resource-pack.self-host.port: <packPort>`
- `resource-pack.self-host.one_time_token: false`
- `resource-pack.delivery.send-on-join: true`
- `resource-pack.delivery.kick-if-declined: false`

CraftEngine uses no paper-global overrides. The patch also sets `forced-locale: en`, because CraftEngine logs in the system language and the log patterns are English. The app seeds this file before the first start.

The CraftEngine commands are:

- Reload: `ce reload all`. CraftEngine builds no pack on startup, so the app sends it once after "Done".
- Give: `ce item give <player> <ns:id> <n>`. Check the argument order against `commands.yml` in the jar.
- Resend the pack: `ce resource send <player>` if the jar has it; otherwise null.

The CraftEngine log patterns are captured from a real server run and pinned as fixture tests.

## CraftEngine item mapping (P1)

| App                                                                                     | CraftEngine YAML                                                                                          |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `itemId`                                                                                | key `<namespace>:<itemId>` under `items:`                                                                 |
| `displayName`                                                                           | `data.item_name`                                                                                          |
| material                                                                                | `material`                                                                                                |
| main model (written by PackWriter to `assets/<ns>/models/<path>.json`)                  | `model: <ns>:<path>`                                                                                      |
| variant slots (bow pulling, crossbow, fishing rod cast, shield blocking, elytra broken) | `models: [...]`, in CraftEngine's fixed slot order (bow 4, crossbow 6, fishing_rod 2, shield 2, elytra 2) |
| properties                                                                              | `data.*` (components), `settings.*`, `behavior`, `events` (P4)                                            |
| raw YAML                                                                                | merged over the built config last (same as Nexo)                                                          |

The CraftEngine form schema groups are `general` (material, lore, …), `data` (item components), `settings` and `behavior`. `settings.equipment` and armor follow in P3 (`equipments:`).

## Phases

- **P0, the seam, with no visible change.** Golden tests freeze the current Nexo export first: a fixture project goes through `planExport` and `buildMultiExportZip`, and the sorted paths plus a content hash per file are compared to a checked-in snapshot. Then `Project.target`, `itemId`, `core/form`, `PackTarget`, `ServerAdapter`, `pluginJars`, the target-aware test-server dirs and IPC. The Nexo golden must stay byte-identical, except for the `nexoId` key rename in the project data.
- **P1, CraftEngine items.** Target cards in `NewProjectForm`, a target badge in the project list, `CRAFT_ENGINE_FORM` (data, settings), the CraftEngine item builder, pack.yml, the CraftEngine layout and install guide, the CraftEngine `ServerAdapter`, the Modrinth download, and log patterns from a real run.
- **P2, blocks and furniture.**
  - Blocks: a block section for CraftEngine items (`behavior: block_item` plus a `blocks:` entry), `auto_state` groups, a parent chosen by texture count, and block settings. Then multi-state properties and the common behaviors (slab, stairs, door, trapdoor, fence, crop, sapling, leaves, lamp), with an `auto_state` budget warning.
  - Furniture: a furniture section (`behavior: furniture_item` plus `furniture:` variants, elements, hitboxes and seats), with elements shown in the preview.
  - Block entity renderers.
- **P3, content types.** Recipes in CraftEngine's format, images and emoji from glyphs, sounds and jukebox songs, paintings, equipments from armor, categories from folders, and lang for display names.
- **P4, logic.** A catalog (`core/craftEngine/logic`) of triggers per object kind, conditions, functions, number providers and loot sources. A `typedList` field kind, generated from that catalog, with a YAML fallback for types it doesn't cover. On top of it: the events section, loot tables and loot sources, templates, global variables and attributes.

## Error handling

Issues use the existing `Issue` and `issueReporter` with message codes in the `issues` namespace. CraftEngine-specific codes are prefixed `ce.`. Unknown config keys are reported like Nexo's (`unknownConfigPaths` over the target schema). A CraftEngine project on a Nexo test server, or the other way round, is a refused action with a message, never a silent no-op.

## Security

- The Modrinth download is checked against the hash before the file is moved into the plugin store, and the file name is checked against `CRAFT_ENGINE_JAR_FILE_PATTERN`.
- The sync manifest (`sync-manifest.json`) stores the pack name next to the file list. After a pack rename, stale files are checked and deleted against the name they were written for.
- Sync paths go through the adapter's `syncPathSegments`. For CraftEngine, only `resources/<this project's pack>/(pack.yml|configuration/**|resourcepack/**)` with safe segments is allowed.
- The app never deletes CraftEngine's own packs (`default_*`, `internal`).
- Command builders check every argument (`assertCommandArg`, `assertPlayerName`).

## Testing

vitest in each package, run with `npm test` (turbo; typecheck first), plus `npm run lint`. Each phase adds:

- unit tests for its builders (golden YAML strings for a fixture item, block or furniture)
- export layout tests
- adapter tests (config patch, commands, log fixtures, sync whitelist)
- i18n parity (`packages/i18n` parity test) for every new message key in `en` and `de`

The Nexo export golden from P0 guards every later step.
