# CraftEngine target – implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Projects can target CraftEngine as well as Nexo. Editor, export and test server each follow the project's target.

**Architecture:** Each package that holds Nexo-specific code gets a target seam, with Nexo as its first implementation:
- `core/form`: the generic form DSL plus a `FormSchema`.
- `export/targets`: `PackTarget`.
- `test-server`: `ServerAdapter`.

CraftEngine is added next to Nexo in each package: `core/craftEngine`, `export/targets/craftEngine`, and `test-server/craftEngine`. Golden tests freeze the Nexo export before anything moves.

**Tech Stack:** TypeScript, npm workspaces and turbo, vitest, zod 4, `yaml` (Document API), immer, Next.js static export inside Electron (esbuild-bundled main), next-intl (`en` and `de` catalogues), shadcn/Base UI.

**Spec:** `docs/superpowers/specs/2026-10-16-craftengine-target-design.md`

**Commits:** one commit or more per task. Each message starts with `CraftEngine (Tn):`, is written in English, and ends with the co-author line from the session. Before every commit, `npm run typecheck`, `npm run lint` and `npm test` pass from the repo root. Commit locally only, never push.

**About the detail level:** this plan covers P0–P4, roughly 20 features in an existing 8k-line core plus app, so it can't spell out every line in advance. Each task names:
- the files it touches
- the interfaces it produces and consumes
- the behavior its tests must pin

Implementers read the files they touch first and follow the patterns they find there.

## Global Constraints

- **The Nexo output stays byte-identical.** The P0 golden snapshot (`packages/export/src/golden/`) must pass unchanged after every task. The only exception is T2, which may update the fixture project's field name and nothing else.
- `Item.nexoId` is hard-renamed to `itemId` everywhere, including sync format, IndexedDB data, tests and i18n args, with **no migration**.
- `core/project` must not import `core/nexo`, `core/craftEngine` or `core/targets`. ESLint enforces this; extend the rule to the new entry points.
- Every new user-facing string goes in `packages/i18n/src/messages/en/*.json` and `de/*.json`, and the parity test must pass. German uses real umlauts. CraftEngine property labels use the English CraftEngine key name in both languages, as Nexo's do.
- Copy rules from the repo: plain, active voice, no em-dash asides.
- Each package exports only through its `package.json` `exports` and barrels. Add new subpaths there (`@resourcepackbuilder/core/form`, `/craftEngine`, `/targets`).
- Use CraftEngine 26.9.2's bundled configs and plugin source as the schema truth (paths are in the spec).
- Never call `AskUserQuestion` or block on the user. Decide, write the decision in the commit body, and continue.

## Review Focus

1. **Old project data after the hard rename.** A stored project with `nexoId` and no `itemId` must load with a usable, unique ID made from the display name, without crashing. Tested in T2.
2. **A test server running for the other target.** With the server started for Nexo and a CraftEngine project open, sync, give and reload are refused with a message, and no file is written into `plugins/Nexo`. Tested in T5 and T9.
3. **Path traversal through pack names.** A CraftEngine pack name like `../x`, or a configuration path outside `resources/<pack>/`, is refused by `syncPathSegments`. Tested in T9.
4. **Mixed-target multi export.** A Nexo project and a CraftEngine project exported together each land under their own plugin directory, each listed in the install guide. Tested in T8.
5. **A raw YAML overlay on CraftEngine items** that sets a key the form also sets: the overlay wins, and unknown keys are kept and exported. Tested in T8.

---

## Phase P0 – target seam (no visible change)

### Task 1: Golden snapshot of the Nexo export

**Files:**
- Create: `packages/export/src/golden/fixture.ts`. It builds a fixture project with:
  - two folders and items with models
  - a bow with variants, an armor item and an item with a recipe
  - one glyph, one sound and one painting
  - `useItemModel` on

  Reuse the helpers in `packages/test-utils` and the existing export tests.
- Create: `packages/export/src/golden/golden.test.ts`.
- Create: `packages/export/src/golden/nexo.golden.json`, written by the test on its first run when it's missing, then checked in.

**Produces:**
- `goldenSnapshot(multi, mode) => Record<path, sha256hex>` (in the test file), covering every mode (`full`, `pack`, `items`) and both pack placements (folder and zip).

- [ ] Step 1: Write the fixture and the test. The test compares sorted paths and a sha256 of each file's content (nested zips hashed by their sorted entries) against the JSON.
- [ ] Step 2: Run `npx vitest run src/golden` in `packages/export`. The first run writes the JSON when the env `UPDATE_GOLDEN=1` is set. Without it, a missing file fails.
- [ ] Step 3: Run it again without the env and expect PASS. Commit with the JSON.

### Task 2: `Project.target` and the hard rename `nexoId` → `itemId`

**Files:**
- Modify: `packages/core/src/project/types.ts`, `schema.ts` (`itemSchema`, `projectSchema`), `factory.ts`, `ids.ts`, `newItems.ts`, `operations.ts`, `repair.ts`, and every `nexoId` use found by `rg -n nexoId` across `packages/` and `apps/`. That includes the sync format (`packages/sync/src/format.ts`), export, test-server, the app, Electron and the i18n message args named `nexoId`.

**Produces:**
- `PackTargetId`, `PACK_TARGETS` and `DEFAULT_PACK_TARGET = 'nexo'`, exported from `@resourcepackbuilder/core/project`.
- `Project.target: PackTargetId`, which the lenient schema defaults to `'nexo'`.
- `createProject(..., target)`, a factory parameter defaulting to `'nexo'`.
- `Item.itemId`. The lenient item schema derives a missing or invalid `itemId` the same way new items get one (from `displayName`, made unique by `repairProject`). The old `nexoId` key is ignored.

- [ ] Step 1: Add these tests to `migrate.test.ts`:
  - A project without `target` gets `'nexo'`.
  - An item with only `nexoId: 'ruby'` and `displayName: 'Ruby Sword'` loads with `itemId` derived from the display name (not `'ruby'`), unique within the project.
  - Two such items with the same display name get distinct IDs.
- [ ] Step 2: Run them and expect FAIL.
- [ ] Step 3: Rename across the repo, add `target`, and update the fixtures. The golden JSON may change only through the fixture field name. Rerun with `UPDATE_GOLDEN=1` only if the hashes really differ, and check in the diff that only the expected entries changed.
- [ ] Step 4: Run `npm run typecheck && npm run lint && npm test` from the root and expect PASS. Commit.

### Task 3: `core/form` and `core/targets` entry points

**Files:**
- Move: `packages/core/src/nexo/form/{fields,fieldSchema,options,properties}.ts` and `form/schema/build.ts` (the generic builder) to `packages/core/src/form/`. `PropertyGroup` becomes `string`.
- Create: `packages/core/src/form/index.ts` and `packages/core/src/form/types.ts`, with `FormSchema` as in the spec plus `tabs: Array<{ id: string; group: string }>`.
- Modify: `packages/core/src/nexo/form/schema.ts` exports `NEXO_FORM: FormSchema` built from the existing groups. Keep `PROPERTIES`, `PROPERTY_BY_ID` and the rest as Nexo-only aliases only where Nexo code still needs them.
- Create: `packages/core/src/targets/index.ts` with `formFor(target: PackTargetId): FormSchema`. It returns `NEXO_FORM` until T7 adds CraftEngine.
- Modify: `packages/core/package.json` exports (`./form`, `./targets`), and the ESLint boundary rule in `eslint.config.js` (`project/` may not import `form/` internals that import `nexo`; `form/` may not import `nexo/`).
- Modify the app: `features/item/ItemEditor.tsx` (tabs from `formFor(project.target).tabs`), `features/item/properties/*`, `components/editor/*` and every import of the moved names. They pass the schema into `activeProperties(schema, owner, group)` and the rest.

**Produces:**
- `FormSchema`.
- `activeProperties(schema, owner, group)`, `availableProperties(schema, owner, group)`, `propertyConflict(schema, owner, def)`, `unknownConfigPaths(schema, config)` and `propertyById(schema, id)`.
- `formFor(target)`.
- `NEXO_FORM` with `messages: 'schema'`.

- [ ] Step 1: Move the existing form tests to `core/src/form/*.test.ts` and adapt them to the schema parameter.
- [ ] Step 2: Move the code, update the call sites, and run typecheck, lint and test. The golden must be unchanged. Commit.

### Task 4: Export `PackTarget` seam with the Nexo implementation

**Files:**
- Create: `packages/export/src/targets/types.ts` (`PackTarget`, `TargetLayout`, `WrittenItemModels = { mainKey: string | null; variantKeys; itemModel; extraConfig }`).
- Create: `packages/export/src/targets/nexo/` (`index.ts`, `layout.ts`, `pluginFiles.ts`). Move the Nexo specifics from these files into it:
  - `plan.ts`: `buildItemConfig`, `writeVariants` and the item YAML grouping.
  - `paths.ts`: `NEXO_PLUGIN_DIR`, `nexoPluginPath`, `itemYamlFile` and `packLocation`.
  - `rootFiles.ts`, `installGuide.ts`, `media.ts` and the recipe files.
- Create: `packages/export/src/targets/index.ts` with `PACK_TARGET_IMPLS` and `packTargetFor(project)`.
- Modify:
  - `plan.ts`: shared steps only (validation, PackWriter, models, armor, then `target.buildItem` and `target.planPluginFiles`).
  - `types.ts`: `ExportPlan { target; items; packFiles; pluginFiles; nexo?: { soundEntries; paintingEntries }; issues }`.
  - `zip.ts`: `pluginFolderEntries(multi, opts)` with the paths prefixed by each project's `layout.pluginDir` relative root. Keep the archive paths exactly as today for Nexo, so the golden holds.
  - `selection.ts` and `index.ts`.
  - The callers: `packages/test-server/src/files.ts`, the app's `shell/PlanProvider.tsx`, `services/testServerSync.ts`, `features/export/*` and `useRunExport.ts`.

**Produces:**
- `planExport(project, options)` (same signature).
- `ExportPlan.pluginFiles`.
- `pluginFolderEntries(multi, { packAsFolder? })`, which replaces `nexoFolderEntries`.
- `packTargetFor(project): PackTarget`.

- [ ] Step 1: Run the golden. It is the test for this task.
- [ ] Step 2: Refactor in small commits. After each, run typecheck, lint and test, with the golden passing.

### Task 5: Test-server `ServerAdapter`, `pluginJars` and target-aware desktop

**Files:**
- Create: `packages/test-server/src/adapter.ts` (`ServerAdapter`, `SERVER_ADAPTERS`, `serverAdapterFor(target)`).
- Create: `packages/test-server/src/nexo/` (`adapter.ts`, `settings.ts`, `log.ts`), moving `patchNexoSettings`, the give and pack commands, the Nexo log regexes, `SYNC_DIRS` and `NEXO_BLOCK_UPDATE_SETTINGS`.
- Keep in `serverLog.ts` the shared Paper patterns (`started`, `portInUse`) and `stripAnsi`. `parseServerLogLine(adapter, line)` combines them with the plugin patterns.
- Modify `config.ts`:
  - `PluginJarInfo` replaces `NexoJarInfo`.
  - `TestServerConfig.pluginJars: Partial<Record<PackTargetId, PluginJarInfo>>`.
  - `pluginJarFileName(target, version)`.
  - `NEXO_JAR_FILE_PATTERN` stays.
  - Add `CRAFT_ENGINE_JAR_FILE_PATTERN = /^craft-engine-paper-plugin-[\w.-]{1,64}\.jar$/`.
- Modify `packages/desktop-contract/src/{api,schemas}.ts`:
  - The channels `testserver:choose-plugin-jar` `[target]`, `testserver:read-plugin-config` `[target]`, `testserver:start` `[target]` and `testserver:download-plugin` `[target]`. The last one returns an error `pluginDownloadUnsupported` for Nexo.
  - `TestServerState.target: PackTargetId | null`.
  - The lenient config parse maps an old `nexoJar` to `pluginJars.nexo`.
- Modify Electron, `apps/resourcepackbuilder/electron/src/testServer/*`:
  - `paths.ts`: server dirs `testserver/<target>/server`, plus a one-time move of the old `testserver/server`.
  - `nexoJar.ts` becomes `pluginJar.ts`, with the descriptor name from the adapter.
  - `serverFiles.ts`: install the jar for the target and apply the adapter's paper-global overrides.
  - `server.ts`: reload, log and give through the adapter.
  - `sync.ts`: the whitelist and config file from the adapter, writing under `adapter.pluginDir`.
  - `state.ts` and `index.ts`.
- Modify the app's `services/testServerSync.ts`, `features/testServer/*` and `ItemHeader.tsx` give:
  - They use `serverAdapterFor(project.target)`.
  - They refuse to act when `server.target !== project.target`, with a new message `testServer.wrongTarget` in `en` and `de`.
  - Start passes `project.target`.
  - The "choose Nexo JAR" UI becomes "choose plugin JAR" for the target.

**Produces:**
- `ServerAdapter`, `serverAdapterFor(target)` and `PluginJarInfo`.
- The IPC `choosePluginJar(target)`, `readPluginConfig(target)`, `start(target)` and `downloadPlugin(target)`.

- [ ] Step 1: Move the tests (`files.test.ts`, `serverLog.test.ts`, `server.test.ts` and the rest) onto the Nexo adapter, unchanged in expectations. Add a test that a config with `nexoJar` parses into `pluginJars.nexo`.
- [ ] Step 2: Add tests for the target mismatch: `testServerSync` with `server.target='nexo'` and a project target of `'craftEngine'` does not call `api.sync` and sets the error. A fake for the craftEngine adapter is fine until T9.
- [ ] Step 3: Implement it, run typecheck, lint and test, and commit. `npm run build` must succeed, since Electron bundles with esbuild.

## Phase P1 – CraftEngine items, export, test server

### Task 6: Target choice when creating a project

**Files:**
- Modify: `apps/resourcepackbuilder/src/features/projects/NewProjectForm.tsx`. Add two cards (radio group) for Nexo and CraftEngine, each with one line of description. Nexo is the default.
- Modify: the project list (`ProjectsDialog`, `Welcome`, and the project summaries in `core/project`), which gain `target` and a badge.
- Modify: `packages/core/src/project/` (summary type) and i18n `app.json` in `en` and `de`.
- Modify: the project settings dialog, which shows the target read-only.

- [ ] Step 1: Add a test in core for the summary carrying `target`, and an app test if the feature already has tests (follow the existing pattern).
- [ ] Step 2: Implement it, run typecheck, lint and test, and commit.

### Task 7: `core/craftEngine` form schema (general, data, settings, behavior)

**Files:**
- Create: `packages/core/src/craftEngine/form/schema/{general,data,settings}.ts`, `form/schema.ts` (`CRAFT_ENGINE_FORM`, `messages: 'ceSchema'`, tabs `general | model | data | settings | recipes | yaml`) and `index.ts`.
- Create: `packages/i18n/src/messages/{en,de}/ceSchema.json`, registered wherever namespaces are listed (follow how `schema` is registered).
- Modify: `packages/core/package.json` (export `./craftEngine`), `core/targets/index.ts` (`formFor('craftEngine')`) and the ESLint boundaries.
- Modify: the app's properties panel, which reads labels from `schema.messages`.

**Content:** take the properties from `craftengine-docs-map.md` §3a "Item data (`data`)" and "Item settings (`settings`)", checked against the jar's `default_assets` items:
- `material` and `data.item_name` are managed keys, the same as Nexo's `material` and `itemname`.
- `data`: lore, custom_name, tooltip_style, hide_tooltip, dyed_color, trim, food, equippable, use_remainder, unbreakable, max_damage, enchantment, jukebox_playable, painting_variant, components (map), remove_components, and so on.
- `settings`: the documented keys, such as fuel_time, break_power, tags, repairable, renameable, dye_color, the anvil and drag repair keys, and equipment.
- Premium-only keys carry `badge: 'premium'` (a new optional `PropertyBase.badge`), and the app shows the badge.

- [ ] Step 1: Write the tests. Every `CRAFT_ENGINE_FORM` property path is unique. Every label key exists in both `ceSchema` catalogues (follow `messageKeys.test.ts`). `fieldToSchema` accepts each property's `defaultValue()`.
- [ ] Step 2: Implement it, run typecheck, lint and test, and commit.

### Task 8: CraftEngine export target

**Files:**
- Create in `packages/core/src/craftEngine/`:
  - `itemConfig.ts`: `buildCraftEngineItem(ctx) => { config, rawYamlError }`. It maps per the spec table and merges raw YAML last, reusing `parseRawYaml`, which moves to `core/form` or a shared `core/yaml` entry point if it's target-neutral.
  - `yaml.ts`: `sectionsToYaml({ items, blocks?, furniture?, recipes? })`.
  - `pack.ts`: `buildPackYml(project)`, which writes namespace, author `ResourcepackBuilder`, version, description and `enable: true`.
- Create in `packages/export/src/targets/craftEngine/`:
  - `index.ts` and `layout.ts`: `pluginDir: 'plugins/CraftEngine'`, the pack under `resources/<pack>/resourcepack/`, and config files under `resources/<pack>/configuration/items/…` following `yamlFileMode`.
  - `installGuide.ts`: drop `resources/<pack>` into `plugins/CraftEngine/resources/` and run `/ce reload all`.
  - `variants.ts`: the `models:` slot order per material, from the spec table. Bow, crossbow, fishing_rod, shield and elytra map from the app's `VARIANTS` slots.
- Create: `packages/export/src/golden/craftEngine.golden.json`, plus a CraftEngine fixture and a YAML string test for one item.

**Tests:**
- A CraftEngine fixture item with a model, a bow with pulling variants, and raw YAML overriding `data.item_name` and adding an unknown key. The exact YAML string is asserted.
- The layout paths.
- A mixed multi export (Review Focus 4).
- Validation issues use `ce.` codes. Pin a missing model, and an `itemId` with characters outside `[a-z0-9_.-/]`.

- [ ] Steps: write the failing tests, then implement, then run typecheck, lint and test. Commit.

### Task 9: CraftEngine `ServerAdapter` and the Modrinth download

**Files:**
- Create: `packages/test-server/src/craftEngine/{adapter,config,log}.ts`:
  - `patchCraftEngineConfig(current, { packPort })`, with the keys from the spec, unchanged text when already correct, and comments preserved.
  - Commands, checked against `ce-jar/x/commands.yml`.
  - `syncPathSegments`: `resources/<packName>/(pack.yml|configuration/…|resourcepack/…)` only.
  - Log patterns, provisional until T10.
- Create: `packages/test-server/src/modrinth.ts`, with a zod schema of the version list and `pickCraftEngineVersion(versions, paperVersion)`, which returns the newest `release` with a `paper` loader and a matching `game_versions` entry.
- Create: `apps/resourcepackbuilder/electron/src/testServer/modrinth.ts`, which downloads the file, verifies the sha512, moves it into the plugin store and records `pluginJars.craftEngine`.
- Modify: the app's test-server UI. For a CraftEngine project it shows "Download CraftEngine" instead of "Choose JAR", with "choose manually" kept as a secondary action.

**Tests:**
- The config patch: an empty file, the real jar `config.yml` (copy it to `src/craftEngine/__fixtures__/config.yml`), and idempotence.
- Commands.
- The sync whitelist, including traversal (Review Focus 3).
- `pickCraftEngineVersion`, using a trimmed fixture of `ce-versions.json` from the research scratchpad.

- [ ] Steps: write the failing tests, then implement, then run typecheck, lint and test. Commit.

### Task 10: Real server run and log fixtures

**Do:**
- Write a node script in the scratchpad (not in the repo) that uses the repo's own Paper and Java download code, or the PaperMC API directly. It:
  - downloads Paper for a version CraftEngine 26.9.2 supports (e.g. 1.21.11 or the newest in `game_versions`) and a Java 21+ runtime, if `java` isn't on PATH
  - copies the jar from `ce-jar/` into `plugins/`
  - sets `eula=true` and starts the server headless
  - waits for `Done`, runs `ce reload all`, then `stop`
- Capture the full log.
- Export the T8 CraftEngine fixture project with `buildMultiExportZip`, unzip it into `plugins/CraftEngine/resources/` before a second start, and confirm no `WARN` or `ERROR` lines about the pack's configuration. Fix the builders if CraftEngine complains.
- Put the real pack-status lines (generating, done or uploaded, failed if seen) into `packages/test-server/src/craftEngine/__fixtures__/log.txt`, and pin `parseLogLine` on them.

- [ ] Commit with the fixtures and any builder fixes.

## Phase P2 – blocks and furniture

### Task 11: Single-state blocks

**Data model:**
- `Item.config.block` for a CraftEngine item holds the CraftEngine block definition (`settings`, `state`).
- The builder emits `blocks: { <ns:id>: config.block }` and sets the item's `behavior: { type: block_item, block: <ns:id> }`.
- The UI adds a "Block" section to the model tab, shown when the item is a block (`isBlockItem`, or a toggle).

**Content:**
- `state.auto_state` is a select of the 24 groups from the docs map §3b.
- The texture count decides the parent: 1 means `cube_all`, 2 means column, 3 means bottom, side and top. The textures come from the imported model or uploaded textures.
- Block settings properties (hardness, sounds, tags, luminance, map_color, …) go in a new `blockSettings` group of `CRAFT_ENGINE_FORM`.

**Tests:** the YAML output for a 1, 2 and 3 texture block. An `auto_state` budget count over the project, `countAutoStates(project)`, warns when a group exceeds its capacity, with the capacities from the docs map or the plugin source.

### Task 12: Multi-state blocks and common behaviors

**Content:**
- Properties (13 types), appearances and variants as an editor, a table of properties and an appearance per variant.
- Behaviors as forms: slab, stairs, door, trapdoor, fence, fence_gate, crop, sapling, leaves, lamp (togglable light), seat and storage.
- Other behaviors fall back to raw YAML.

**Tests:** YAML strings for slab, stairs and crop, compared with the jar's `default_assets` examples where present.

### Task 13: Furniture

**Data model:** `Item.config.furniture` holds the CraftEngine furniture definition (`settings`, `variants: { ground|wall|ceiling: { elements, hitboxes, seats } }`, `loot`). The item gets `behavior: { type: furniture_item, furniture: <ns:id> }`.

**UI:**
- A furniture section with variant tabs.
- An element list: item_display and others, with model, position, rotation, scale and billboard.
- A hitbox list: interaction, shulker and custom, with size and position.
- Seats.

**Preview:** show the elements of the selected variant in the existing three.js preview, using `@resourcepackbuilder/preview` with transforms (reuse `buildPreviewModel` per element).

**Tests:** YAML for `bench` and `wooden_chair`, matching the semantics of the jar's examples (same keys).

### Task 14: Block entity renderers

Elements are attached to block states (`state.entity_renderer` or the documented key in the docs map). They reuse the element editor from T13. Tests: the YAML output.

## Phase P3 – content types

### Task 15: CraftEngine recipes

Map the shared `Recipe` model (`core/project/recipes/model.ts`) to CraftEngine's `recipes:` section:
- shaped, shapeless, smelting, blasting, smoking, campfire_cooking, stonecutting and smithing_transform
- tags as `#ns:tag`, results as `{ id, count }`

The recipes go into the item's YAML file under `recipes:`. Tests: one YAML string per type. Unsupported recipe kinds get an issue.

### Task 16: Images, emoji, sounds, jukebox songs, paintings

The CraftEngine target's `planPluginFiles` writes:
- `configuration/images.yml` from glyphs, with `emoji.yml` entries when a glyph has a chat shortcut
- `configuration/sounds.yml` from sounds, plus `jukebox_songs` for sounds marked as music discs (add the field in core if needed)
- `configuration/paintings.yml` from paintings

The pack files are the same as Nexo's (`PackWriter`). Tests: the YAML strings.

### Task 17: Equipments, categories, lang

- **Equipments:** the shared armor sets become `equipments:` plus the item's `settings.equipment`.
- **Categories:** `categories.yml` from folders (one category per folder, with its items). It's opt-in through a new project setting `ceCategoriesFromFolders`, default on for CraftEngine.
- **Lang:** `display names` stays `data.item_name`. Only when the item uses `<lang:…>` keys does the app write `lang/<locale>.yml` from a per-item translations map (an optional new item field `translations?: Record<locale,string>`, written only for CraftEngine).

Tests: YAML strings.

## Phase P4 – logic builders

### Task 18: Logic catalog and the `typedList` field

**Files:**
- Create: `packages/core/src/craftEngine/logic/{conditions,functions,numbers,triggers,lootSources}.ts`. Each entry is `{ type, fields: FieldSpecs, objectKinds?, premium? }`, taken from the docs map §shared reference and checked against the plugin source registries.
- Create: `packages/core/src/form/fields.ts`, with the new `TypedListField { type: 'typedList'; catalog: string; … }`, and `fieldToSchema` support.
- Create the app editor: `components/editor/editors/TypedListEditor.tsx`. Each entry has a type select and that type's fields. An unknown type shows a YAML textarea for that entry.

**Tests:**
- The catalog's types are unique.
- `fieldToSchema` round-trips a sample entry per type.
- Unknown types are kept unchanged.

### Task 19: Events

An `events` property group on items, blocks and furniture. Each event is `{ on: trigger, conditions?, functions }`. The triggers come from the catalog for that object kind. The writer emits the list form at the right place: item `events`, block `events` and furniture `events`. Raw YAML accepts the map form.

### Task 20: Loot tables and loot sources

- A loot editor (pools, rolls, entries, functions, conditions) for blocks' and furniture's `loot`.
- Project-level loot sources (`Project.craftEngine.lootSources`), written to `configuration/loot_sources.yml`.

### Task 21: Templates and global variables

- `Project.craftEngine.templates` (id, body as config, arguments).
- The built-in `default:*` templates are listed from the jar's `default_templates`.
- A "use template" property with an arguments table.
- `Project.craftEngine.globalVariables`, written to `configuration/global_variables.yml`.

### Task 22: Attributes (experimental)

Custom attributes, item modifiers and equipment sets, written to `attributes:`. The test-server CraftEngine adapter sets `attribute.enable: true` in config.yml when the project uses attributes. Check the key in the jar's config.yml.

### Task 23: Docs and whole-branch review

- Update the `README.md` architecture and feature list, and add a `CHANGELOG.md` entry.
- Run the code-review skill on the branch diff and fix the findings.
- Run the final full `npm run typecheck && npm run lint && npm test && npm run build`.
