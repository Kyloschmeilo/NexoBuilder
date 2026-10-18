# UI rework and full coverage: plan

Spec: `docs/superpowers/specs/2026-10-18-ui-rework-full-coverage-design.md`
Research (read the sections each task names): `<workspace>/research/{architecture,ux-redesign,nexo-features,craftengine-features}.md`

Execution: subagent-driven, waves of parallel tasks in separate git worktrees. Each task branches from the
integration branch `feat/ui-rework-full-coverage` at the wave's start. The controller merges each task branch back
after its review. Tasks in the same wave own disjoint files, except the declared shared files, which they edit
append-only.

## Global constraints

- Commits: Conventional Commits in English, `type(scope): lower-case imperative`, with scopes `ui`, `app`, `core`,
  `export`, `i18n`, `desktop`, and so on. End each message with
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Commit only on your task branch. Never push.
- Before every commit, these must pass: `npm run typecheck && npm run lint && npm test`. Run `npm run check:encoding`
  and `npx prettier --check <changed files>` too.
- Every user-facing string goes in en **and** de (real umlauts), through the typed i18n catalogues. No hard-coded UI
  copy.
- Doc comments: JSDoc on exported symbols and a module header comment, describing what the code does (never its
  history). Match the surrounding style.
- Copy: sentence case, active voice, buttons say what happens, no uppercase-tracked labels (UX spec §7).
- Keep the `data-testid` attributes used by `scripts/test-windows-exe.cjs`, or update the script in the same commit.
- CraftEngine wiki base: `https://xiao-momi.github.io/craft-engine-wiki/`. Nexo docs base: `https://docs.nexomc.com/`.
- Golden export snapshots (`packages/export/src/golden/*.golden.json`) are regenerated with the repo's update
  command, never hand-edited.
- Do not add a `CHANGELOG.md` entry. Put the changelog line at the end of your report instead; the controller writes
  the changelog.
- The UI follows the Workbench design system and the 5-theme decision in the spec. Where the UX research contradicts
  the spec, the spec wins.

## Wave 1: foundations (parallel)

### Task 1: Theme tokens, 5 color themes, theme picker, fonts

Files: `packages/ui/src/styles.css`, `packages/ui/src/fonts.css`, `packages/ui/package.json`,
`packages/ui/src/{SectionLabel,SectionCard,CollapsibleSection}.tsx`, `packages/ui/src/components/*.tsx` (density and
radius only), `packages/ui/src/lib/highlighter.tsx`, `apps/resourcepackbuilder/src/components/YamlCode.tsx`,
`apps/resourcepackbuilder/src/theme/*`, the existing settings UI where the theme is chosen today
(`features/settings/*`, plus `shell/TopBar.tsx` only to remove the old theme button if it is replaced), and i18n keys
under the settings namespace.

1. Replace the token set with the semantic tokens of UX §2.1: `--canvas`, `--surface`, `--surface-raised`,
   `--surface-sunken`, `--line`, `--line-strong`, `--text`, `--text-muted`, `--text-faint`, `--accent`,
   `--accent-soft`, `--accent-contrast`, `--success`, `--warning`, `--danger`, `--target-nexo`, `--target-ce`, and
   `--yaml-{key,string,number,bool,comment}`. Keep the shadcn names (`--background`, `--foreground`, `--primary`,
   `--card`, `--muted`, `--border`, `--input`, `--ring`, …) as aliases. `--success` no longer aliases primary.
2. Define 5 themes × light/dark through `[data-color-theme="deepslate|amethyst|copper|prismarine|crimson"]` combined
   with `.dark`. The palette values come from the approved preview:
   - Deepslate: dark bg `#111519`, panel `#171c22`, raised `#1f252d`, line `#2a323c`, text `#e3e8ee`, dim `#8693a3`,
     accent `#58a6dc`. Light bg `#eceff3`, panel `#ffffff`, raised `#f5f7fa`, line `#d3d9e1`, text `#17202b`,
     dim `#5a6676`, accent `#1d6aa3`.
   - Amethyst: dark `#15121b` / `#1c1824` / `#251f2f` / `#342b42` / `#ece6f5` / `#9a8fae`, accent `#b48ef2`. Light
     `#f1eef6` / `#ffffff` / `#f8f6fb` / `#dcd4e8` / `#211a2c` / `#695e7b`, accent `#7144c6`.
   - Copper: dark `#151312` / `#1c1917` / `#25211e` / `#35302b` / `#eee8e1` / `#a29789`, accent `#dc8c55`. Light
     `#ecebe8` / `#ffffff` / `#f6f5f3` / `#dad5cf` / `#231d18` / `#6c6156`, accent `#a95a26`.
   - Prismarine: dark `#0f1716` / `#141e1d` / `#1b2624` / `#273634` / `#e1ece9` / `#86a09b`, accent `#4cc2b0`. Light
     `#eaf0ef` / `#ffffff` / `#f4f8f7` / `#cfdcd9` / `#14211f` / `#566c68`, accent `#137a6c`.
   - Crimson: dark `#161112` / `#1d1618` / `#271d1f` / `#3a2a2d` / `#f0e5e6` / `#a8898d`, accent `#e0566a`. Light
     `#f1ecec` / `#ffffff` / `#f8f4f4` / `#e0d3d4` / `#261719` / `#74585c`, accent `#b3263c`.
   - Mapping: bg→`--canvas`, panel→`--surface`, raised→`--surface-raised`, `--surface-sunken` is a step darker than bg
     (dark) or lighter (light), line→`--line`, text→`--text`, dim→`--text-muted`.
   - Semantic colors (dark/light): success `#4cbb7f`/`#1f8550`, warning `#e0a83a`/`#9a6a00`, danger
     `#e5675e`/`#c23b33`. Target markers: Nexo `#e3a63c`/`#a86c08` (gold), CE `#4fb3a2`/`#17806f` (teal). Prismarine
     uses CE `#7fb0e0`/`#2a64a0` so it does not clash with its accent. Check the contrast of `--text-muted` on
     `--surface` (at least 4.5:1) in all 10 variants and adjust lightness where needed.
3. Workbench shape tokens: `--radius-control: 4px`, `--radius-panel: 6px`, `--radius-overlay: 8px`, body 13 px, type
   steps from UX §2.1 shifted down by 1 px (micro 11, meta 12, label 13, body 13, title 15, page 18). Controls are
   30 px high (compact 26 px), tree rows 28 px, and the focus ring is 2 px accent. `prefers-reduced-motion` turns
   transitions off.
4. Fonts: add `@fontsource/ibm-plex-sans` (400, 500, 600) and `@fontsource/ibm-plex-mono` (400, 500). Remove the
   previous UI and mono faces from use. Keep the brand wordmark face only if `BrandMark` needs it.
5. Theme picker: a store or hook `useColorTheme()` (persisted in localStorage, default `deepslate`) that sets
   `data-color-theme` on `<html>` before first paint, so there is no flash: an inline script or the existing boot
   path. In Settings, add an "Appearance" block with a swatch picker for the 5 themes (names plus 4 color chips) and
   the light/dark/system choice.
6. Drop the uppercase and tracking from the section label components. Update the YAML highlighter colors to the
   `--yaml-*` tokens.
Verify: all checks pass. Run the app (`npm run dev`, port shown in the console) and take screenshots of the item
editor in Deepslate dark, Amethyst light and Crimson dark into `<workspace>/shots/task-1/`.

### Task 2: Docs-link infrastructure, URL fix, schema flags

Files: `packages/core/src/form/*` (new `docs.ts` with `withDocs`, new flags), `packages/core/src/craftEngine/form/schema/docs.ts`,
`packages/core/src/craftEngine/form/schema.ts` (comment only), `packages/core/src/nexo/form/schema/*.ts` (wrap each
group with docs), a new `packages/core/src/nexo/form/schema/docs.ts`, `apps/resourcepackbuilder/electron/src/main.ts`
(Help menu: fix the CE wiki URL and add a "Nexo docs" entry), the tests in core, and the logic catalog `TypedType`
definitions (`craftEngine/logic/*`).

1. Move `withDocs` into `core/form`, so both targets can use it (ESLint forbids `nexo/` importing `craftEngine/`).
2. Replace every `https://momirealms.net/craft-engine-wiki` with `https://xiao-momi.github.io/craft-engine-wiki`. Check
   each CE docs sub-path against the live wiki (fetch the page or its sidebar) and fix any path that 404s.
3. Add Nexo docs URLs for every Nexo property, sub-field where useful, model variant, media page and recipe type,
   using `nexo-features.md` §16. Verify anchors that contain `+`, `(` or `&` by fetching the GitBook page and reading
   the real heading ids. Where an anchor cannot be verified, link the page without an anchor.
4. Add `docs?: string`, `category?: string` and `premium?: boolean` to `TypedType` if they are missing. Fill `docs`
   for all CE functions, conditions, events, loot entries, number providers and block behaviors.
5. Schema flags (UX §5, items 1–4): `Field.advanced?: boolean`, and `PropertyBase.category?: string`,
   `common?: boolean` and `aliases?: string[]`. All optional, with no behavior change.
6. Test: every property and typed type of both forms has `docs` starting with the target's base URL.
Verify: all checks pass.

### Task 3: Split the big i18n catalogues per group

Files: `packages/i18n/src/messages/{en,de}/{ceSchema,schema}.json` → `messages/{en,de}/ceSchema/<group>.json` and
`messages/{en,de}/schema/<group>.json`, deep-merged into the same `ceSchema` / `schema` namespaces in
`packages/i18n/src/messages.ts` (or wherever the catalogues are assembled). Also the tests in core, i18n and app that
read the single JSON files with `readFileSync`; they move to a shared loader.
Keys stay identical, and the typed key generation and parity tests keep working. Split by the schema's property
groups (CE: general, data, settings, blockSettings, blockBehavior, furniture, events, loot, …; Nexo: general,
appearance, components, mechanics, furniture, …) plus a `misc.json` for the remainder.
Verify: all checks pass, and the key count before and after is the same (write the counts in the report).

### Task 4: Nexo correctness fixes (chunk A)

Files: `packages/core/src/nexo/**`, `packages/export/src/**` (Nexo only), the matching i18n keys, tests and goldens.
Do `nexo-features.md` §0 and chunk A (§15):
- `requires_supporting` → `require_supporting`, with a read-side migration of saved projects.
- Remove `misc.burns_in_fire` / `misc.burns_in_lava`. Migrate existing values to `Components.damage_resistant` the way
  Nexo's converter does.
- Move per-item `repair.nexo_durability_only` out of the item schema (it is a `mechanics.yml` key). Remove it when the
  app does not write `mechanics.yml`, and migrate it away.
- Make `cullable` a three-state value, and add the state `force` key.
Verify: all checks pass, goldens regenerated, migration tests added.

## Wave 2: primitives and shell (after wave 1 is merged)

### Task 5: Editor primitives (`packages/ui/src/editor/`)

UX §3.1–3.3 and §3.7 primitives, styled for Workbench: `Page`, `PageHeader`, `SectionNav`, `Section`, `SubSection`,
`Panel`, `FieldRow` (label | control | key rail, docs icons beside the label tinted by target, `MoreOptions`
support), `FieldGroup`, `MoreOptions`, `DocsLink`, `Help`, `EmptyHint`, `StatusPill`, `ListEditor`, `MapEditor`,
`SegmentedControl`. Export them from `packages/ui/src/index.ts`. Turn the app's `components/editor/FieldShell.tsx` into
a thin adapter onto `FieldRow`, so every existing editor picks up the look. Add a dev-only primitives page
(`apps/resourcepackbuilder/src/dev/Primitives.tsx`, reachable through a hidden view) that shows every primitive.

### Task 6: Shell (Workbench layout)

UX §2.2 and Phase 0c, adapted to Workbench:
- The new AppShell grid: activity rail, sidebar, page and output dock, resizable, with the dock always visible on
  wide screens and an overlay below 1280 px.
- `ActivityBar` with `activities.ts` as data. A slim `TopBar`.
- `OutputDock` with YAML and Checks tabs, plus the `outputFor` registry.
- `CommandPalette` (Ctrl+K), Ctrl+J for the dock.
- `store/ui.ts` fields: activity, dockTab, dockWidth, sidebarWidth, editorSection, expandedFeatures.
- Settings as a page, with the theme picker from Task 1 moved there.

### Task 7: Catalog and typed-entry components

`CatalogDialog` (UX §3.6) with adapters from property groups and typed sources. `FeatureList` / `FeatureRow`
(UX §3.4). `TypedEntryCard` (UX §3.5) with the YAML fallback for unknown types. `Vector3Input`, `BooleanSwitch`. Unit
tests for the adapters and the catalog search ordering.

## Wave 1b: feature coverage, data first (after Tasks 2 and 3 merge; runs in parallel with Wave 2)

Rules for every feature task:
- Data first. The schema in `packages/core/src/{nexo,craftEngine}/form/schema/*`, the core model and migration, the
  exporter, validation, i18n (en + de in the split group files) and tests. Every new property and typed type carries
  `docs` (`withDocs`) with a verified URL, plus `category`, `common` and `aliases` where they help the catalog.
  Optional or rarely used fields get `advanced: true`.
- A plain schema field shows up through the generic renderer automatically. Where a feature needs a hand-written
  editor (block states, furniture variants, display elements, recipes, media cards), extend the existing component
  minimally and functionally. Wave 3 migrates those screens to the new design and keeps every field you add.
- A key that is only in the jar or source and not in the docs gets `advanced: true`, and its help text says which
  plugin version reads it.
- Golden snapshots are regenerated and the change in the snapshot is explained in the report.
- Research references: `nexo-features.md` §15 chunk letters, `craftengine-features.md` §13 chunk numbers. The
  research sections cited by each chunk hold the exact keys, types, enums and defaults.

### Task 4 (moved here): Nexo correctness fixes. Runs after Task 3 merges.

### Task 8: CraftEngine block behaviors, all types (CE chunks 2 and 3, plus 18 particle options)
Every behavior type in `craftengine-features.md` §3.4 and §12 (the vine crop pair included) becomes a `TypedType` in a
`blockBehaviors` logic catalog with its params. `block.behaviors` becomes `typedList('blockBehaviors')`, rendered by
the existing typed-list editor. The preset forms of chunk 3 also generate their states and item behavior. Required
state properties are checked in `ce/blockBehaviors.ts`. The shared `particleFields()` (chunk 18) is used by the
particle behaviors and the `particle` function. Owns: the `craftEngine/logic/*` catalog files for behaviors and
particles, `schema/blockBehavior.ts`, `ce/blockBehaviors.ts`, `ce/blockStates.ts` (state builders only),
`ceSchema/blockBehavior.json`, and a minimal change to `CraftEngineBlockSection.tsx`.

### Task 9: CraftEngine block settings and states/model completion (CE chunks 4 and 5)
Owns `schema/blockSettings.ts`, `ce/block.ts`, the variant-settings helpers in `ce/blockStates.ts`,
`CraftEngineStatesEditor.tsx`, the `ceSchema/blockSettings.json` slice, and the auto `settings.item` for blocks in
`ce/itemConfig.ts` `buildBlock`. If it touches the state builders, coordinate with Task 8 by limiting its own edits to
model and variant helpers.

### Task 10: CraftEngine furniture and display elements (CE chunks 6 and 7)
Shared display-element params, furniture settings, hitboxes, seats, variant extras, and a `furnitureBehaviors`
catalog of 3 types. Owns `ce/furniture.ts`, `ce/blockRenderer.ts`, the new `logic/furnitureBehaviors.ts`, and
`DisplayElementsEditor.tsx`, `BlockRendererEditor.tsx`, `CraftEngineFurnitureSection.tsx`,
`FurnitureVariantEditor.tsx`, `FurniturePreview.tsx`.

### Task 11: CraftEngine item behaviors and item settings (CE chunks 8 and 11)
Owns the new `schema/itemBehavior.ts` group, `schema/settings.ts`, `ce/attributes.ts` (shared specs only), and the
behaviors assembly in `ce/itemConfig.ts`. It touches `ce/furniture.ts` only through a small `BuiltFurniture` extension
agreed by name (`placementExtras`).

### Task 12: CraftEngine item data and item updater (CE chunks 10 and 13)
Owns `schema/data.ts`, `schema/general.ts`, the new `logic/itemUpdaters.ts`, and the `ceSchema/{data,general}.json`
slices.

### Task 13: Item model definition trees for both targets (CE chunk 12, Nexo chunk I)
One shared tree model (model, composite, condition, select, range_dispatch, special, empty, bundle/selected_item,
tints), a CE writer and a Nexo writer (`export/src/targets/nexo/itemModels.ts`), and the root model fields. The user's
tree takes precedence over the auto-generated paths. A structured tree editor in the item Model area, built as a
self-contained component (`features/item/model/itemModelTree/*`).

### Task 14: Recipes for both targets (CE chunk 9, Nexo chunk G)
New types per target (gated by target), ingredient extensions, recipe-level keys, CE processors and transforms, and
Nexo `disabled_recipes.yml` if the app already writes plugin files. Owns `core/src/project/recipes/*`,
`ce/recipes.ts`, `nexo/recipes/*`, the recipes part of `export/src/targets/*/pluginFiles.ts`, and
`features/item/recipes/*`.

### Task 15: Media for both targets (CE chunk 14, Nexo chunk H)
Glyph, emoji, sound, jukebox and equipment completeness. Owns `core/src/project/media/*`, `ce/media.ts`,
`nexo/{glyphs,sounds}/*`, `export/src/equipment.ts`, `features/{media,glyphs,sounds,paintings}/*`, and `media.json`.

### Task 16: CraftEngine project-level sections (CE chunks 15, 16, 17, 19, 20, done in that order)
Translations and lang, the categories editor, worldgen features and atlases, pack.yml and template power features, and
script files. One agent, because they all extend the shared lists (`ViewName`, `VIEWS`, `CRAFT_ENGINE_VIEWS`,
`CraftEngineProjectData`, `pluginFiles.ts`, `SECTION_ORDER`). New views follow the existing CE views' structure;
Wave 3 restyles them.

### Task 17: Nexo furniture, custom blocks and mechanics (Nexo chunks C, E, and the mechanics part of F)
Owns `nexo/form/schema/{furniture,mechanics,shared}.ts`, `nexo/form/options.ts`, `project/variants.ts` (directional
faces), `export/src/targets/nexo/itemModels.ts` (only the variant slots; coordinate with Task 13 by adding new slots in
a separate function), and `export/src/validate/itemConfig.ts`.

### Task 18: Nexo components and item root keys (Nexo chunk D, plus F's root, Pack and drop keys)
Owns `nexo/form/schema/{components,general,appearance,attributes}.ts` and `nexo/itemConfig.ts` (`TOP_LEVEL_ORDER`,
item_model precedence).

### Task 19: Nexo new content kinds (Nexo chunk J)
Dialogs as a media kind, Carpentry block types behind an "addon installed" project setting, and multipack templates.
Runs after Tasks 15 and 17 merge, because it touches their files.

## Wave 3: screen migrations (after Tasks 5, 6 and 7 are merged)

Every screen moves to the Workbench primitives (`packages/ui/src/editor`), the catalog and typed-entry components
(Task 7) and the shell (Task 6). Rules for every migration:
- Keep every field and feature the feature tasks (8–18) added. A migration restyles and restructures; it never drops
  options. Before you finish, list the fields of every editor you touched and compare them to the old one.
- Follow the UX spec §4 pattern for the screen, its acceptance checklist (§6) and its copy rules (§7). The Workbench
  look of the approved preview is binding.
- Every feature row, typed entry and catalog card shows its docs link, tinted by target, where the schema has `docs`.
- Screenshots: Deepslate dark and Amethyst light, 1440 and 1024, Nexo and CraftEngine where the screen differs, with
  playwright-core headless (see task-1-report.md). Never use the claude-in-chrome tools.
- The tests in the app cover new behavior (store commands, adapters, ordering). The e2e selectors stay valid.
- Each task owns the files listed. `sections.ts` (Task 20) mounts the section components that the other tasks export;
  they never edit `ItemEditor.tsx`.

### Task 20: Item editor frame and features (UX M1 + M2)
`Page` + `SectionNav` + the slim `PageHeader`; sections from `features/item/sections.ts`; Basics; Advanced (raw YAML);
remove the YAML tab, since the dock shows the YAML. Property groups become sub-sections with a `FeatureList` and an
"Add feature" `CatalogDialog` prefiltered to the group. Fill `category`, `common` and `aliases` on the Nexo and CE
property groups so the catalog has real facets. Owns `features/item/{ItemEditor,ItemHeader,GeneralTab,YamlTab}.tsx`,
the new `features/item/sections.ts` and `sections/*`, `features/item/properties/*`, `components/ItemIdentityFields.tsx`,
`components/miniMessage/*`, and `components/IssueCountBadges.tsx`. The command palette can search the current item's
settings ("hardness" → jump or add).

### Task 21: Field editors (UX M3)
The control rules of UX §3.2 (switch / segmented / select / combobox by option count; Vector3 for vectors; resource-id
picker; MiniMessage preview chip). Lists and maps onto `ListEditor` and `MapEditor`; `MoreOptions` in `ObjectEditor`.
Set `advanced: true` on rarely used fields across both schemas, where the research marks them advanced or jar-only.
Owns `components/editor/editors/*.tsx` (except TypedListEditor, NumberProviderEditor and ChoiceEditor, which Task 25
owns), `components/editor/inputs/*`, `components/editor/values.ts`, `components/CheckboxField.tsx` and
`components/FormField.tsx`.

### Task 22: CraftEngine block and Nexo custom block (UX M4)
A "Places" segmented control (Nothing / Block / Furniture) for both targets. A Behaviors `ListEditor` of
`TypedEntryCard`s with "Add behavior" → `CatalogDialog` over the blockBehaviors catalog (Task 8), with categories
(Plants, Building, Interaction, Redstone, Physics, Light, Storage, …) and presets. A states table; block settings as a
feature list; per-variant settings (Task 9). Nexo custom_block gets the same frame. Exports `BlockSection` for
`sections.ts`. Owns `features/item/model/{CraftEngineBlockSection,CraftEngineStatesEditor,BlockRendererEditor,BlockModelsSection}.tsx`
→ `features/item/block/*`, plus the behavior commands in `commands/items.ts`.

### Task 23: Furniture for both targets (UX M5, plus the rest of Task 17)
A two-pane variant editor; elements, hitboxes, seats and lights as `ListEditor`s with Vector3 inputs; the furniture
behaviors catalog (Task 10). For Nexo: structured hitbox, seat, bed and light editors, and nested forms for
`open_properties` and the FURNITURE-type state properties. Exports `FurnitureSection`. Owns
`features/item/model/{CraftEngineFurnitureSection,FurnitureVariantEditor,DisplayElementsEditor,FurniturePreview,FurnitureModelsSection}.tsx`
→ `features/item/furniture/*`, plus the furniture commands.

### Task 24: Model, textures, variants and the item model tree (UX M6)
Model and Textures as sections; special-appearance variants as a `ListEditor` (target-filtered); the item model tree
editor (Task 13) restyled as a tree with typed node cards. Exports `ModelSection` and `TexturesSection`. Owns
`features/item/model/*` except the files of Tasks 22 and 23, plus `components/ModelPreview.tsx`.

### Task 25: Typed lists: events, loot, number providers, item behaviors and updaters (UX M7)
`TypedEntryCard` + `CatalogDialog` for every logic catalog, with categories and docs, nested lists, and a dialog for
depth over 2. Owns `components/editor/editors/{TypedListEditor,NumberProviderEditor,ChoiceEditor}.tsx`, and the
`category` field in `craftEngine/logic/*` catalogs.

### Task 26: Recipes (UX M8)
A recipe `ListEditor` with "Add recipe" → catalog of the target's types; the shaped grid stays visual; smithing,
brewing, anvil and transmute layouts. Owns `features/item/recipes/*`.

### Task 27: Media and CraftEngine registries as master/detail (UX M9 + M10)
Glyphs, sounds, paintings, jukebox, equipment, loot sources, templates (including a reference of the default
templates), global variables, attributes, and Task 16's new views (translations, categories, worldgen, atlases,
scripts), each as master/detail. The list lives in the sidebar panel; the entry editor is on the page; the dock shows
the output. Owns `features/{media,glyphs,sounds,paintings,craftEngine,lootSources}/*` and
`shell/sidebar/panels/*`.

### Task 28: Folder page, tree, settings page, dialogs and welcome (UX M11–M14)
Folder item table, tree rows, the settings page with `SectionNav`, all dialogs onto the restyled `DialogFrame`, and the
welcome screen with target cards and both docs links. Owns `features/{folder,settings,newItem,export,share,projects,moveItem,pasteConfig}/*`,
`components/DialogFrame.tsx`, `shell/{ConfirmDialog,PromptDialog}.tsx`, `shell/sidebar/{FolderNode,ItemNode,TreeRow,rowStyles}.tsx`
and `packages/ui/src/tree.tsx`.

### Task 29: Test server view (UX M15)
Adopt `Section`, `FieldRow` and `StatusPill`. Owns `features/testServer/*`.

## Wave 4: cleanup and verification

### Task 30: Cleanup
Delete the components no longer used (UX §6 final cleanup list), remove the orphaned i18n keys
(`layout.sidebar.testServer.*` and others), write the `CHANGELOG.md` Unreleased entries from every report's changelog
line, and update the README screenshots.

### Task 31: Plugin verification on a real server
Export a sample project per target that uses many of the new features. Boot the local test server (Paper plus Nexo
1.30 dev from the user's jar, Paper plus the latest CraftEngine) and check the logs for config errors. Fix what the
logs report.
