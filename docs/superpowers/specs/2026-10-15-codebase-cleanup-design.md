# Codebase cleanup – design

Date: 2026-10-15 · Branch: `ammo-rework` · Follows the shadcn/Tailwind/i18n migration (`4f08d9f`).

## Goal

Bring the whole repository (app, all packages, Electron, scripts, config, docs) to a clean, conventional structure:
clear ownership per layer, no UI hacks, no duplicated helpers, typed contracts at every boundary, and the known
correctness bugs fixed. Behaviour visible to the user stays the same unless listed under "Bug fixes".

Non-goals: new features, a new visual design, changing the Nexo output format, bumping the release version.
The vendored shadcn components stay complete (the user asked for all of them) even where unused.

## Findings this design answers

Five read-only audits (app state/shell, app views, ui/preview/i18n packages, core export/model/sync, core nexo +
Electron + repo config) found, in short:

- **App shell:** one god store mixing project/history with UI state; dialogs stored as data *with callbacks*;
  `DialogHost` is a two-stage switch without exhaustiveness; `MainArea` is an if/else chain on selection kinds that are
  listed in three places; controllers (autosave, share, test server) are started from a component via a module latch;
  module-level mutable singletons everywhere; `plan` prop-drilled into every view; ~18 `useStore(s => s.project)!`.
- **Layering:** `ui/projectActions.ts` and `ui/importer.ts` are not UI; state modules produce translated UI strings;
  `i18n/locale.ts` imports the desktop bridge and touches `localStorage` at import time; the IPC contract is typed only
  on the renderer side; the `ui` package depends on `core` (FieldRenderer, IssueList, MiniMessage) so it is not a
  generic UI kit; the app imports the MiniMessage parser from the React package.
- **Views:** the parallel migration left 3–4 copies each of tooltip wrappers, icon buttons, hints, section labels,
  page headers, status-tone maps, thumbnails, file readers, item-id/namespace validation, model import; 553-line and
  578-line view files; propagation hacks; effects mirroring props; fixed pixel layouts that overflow at ~1000px width.
- **Core:** `planExport` (~190 lines) and `convertBBModel` (~240 lines) do everything inline; validation runs twice for
  bbmodels; `Issue` has four overlapping ways to carry arguments (`params`, `texts`, `detail`, nested context codes);
  `types.ts` mixes layers and imports from `nexo/`; `util.ts` is a grab-bag; many dead or file-internal exports;
  German leftovers in identifiers/file names.
- **Nexo:** `schema.ts` (1780 lines) repeats derivable data (every path, key and message key follows from the tree
  position); armor settings stored as `$armor` inside the YAML config and filtered out in five places.
- **Electron:** 781-line `testserver.cjs`; the sender guard and atomic write duplicated; no type checking; test env
  variables honoured in production; a third (desktop) message catalogue outside the parity test.
- **Repo:** CI e2e script still targets old CSS classes and German button texts (will fail); README/CHANGELOG German and
  outdated; no lint/format tooling; turbo pipeline gaps; `next-intl` bundled into the installer as a runtime dependency.

## Target architecture

### Packages

| Package | Owns | Depends on |
|---|---|---|
| `core` | Domain model, Nexo schema, import (models, importer drafts), export plan/zip, sync, test-server files, MiniMessage parser, issue/error types. No DOM, no React. | – |
| `i18n` | Catalogues (incl. new `desktop` namespace), locales, `Messages`/key types, parity check (subpath). | – |
| `ui` | Vendored shadcn components, theme (`styles.css`, fonts) and **generic** shared components (Tip, IconButton, SectionLabel, StatusDot/StatusBadge + `Tone`, Thumb, DropZone, CopyButton, CollapsibleSection, PageHeader…). No `core` dependency, no app catalogue namespaces except `ui`/`common`. | i18n (types) |
| `preview` | three.js preview + thumbnails; exports only `ModelPreview`, `useThumbnail`. Geometry helpers that are pure move to core. | core, ui |
| `config` | Shared tsconfig bases (incl. a `node`/`electron` base that is actually used). | – |

Nexo-aware React components (FieldRenderer + editors, IssueList, MiniMessage view, YamlView) move from `ui` into the
app (`src/components/`), since only the app uses them.

### App (`apps/resourcepackbuilder/src`)

```
app/          Next routes only (layout, page, globals.css, icon)
shell/        ClientApp, Root (providers + boot state), AppShell (grid), MainArea, DialogHost, keyboard shortcuts, window drop
services/     bootstrap.ts (creates + disposes everything below), autosave, projectRepository (IndexedDB),
              shareSync, testServerSync, desktopLocaleSync
platform/     desktop.ts – typed accessors over the shared IPC contract (`platform/desktopApi.ts`, also used by Electron via JSDoc)
store/        project.ts (project + history), ui.ts (selection, expanded, panels, editor tab), notifications.ts (toasts),
              dialogs.ts (promise-based confirm/prompt + typed feature-dialog registry), plan.ts (derived export plan)
commands/     project lifecycle, folders, items, assets, glyphs/sounds/paintings, clipboard – the only code that mutates
features/     folder/, item/, glyphs/, sounds/, paintings/, testserver/, export/, share/, settings/, projects/, newItem/,
              pasteConfig/, moveItem/ – each holds its views and dialogs
components/   app-wide components: PageShell/PageHeader usage, editor/ (FieldRenderer etc.), IssueList, MiniMessage, YamlView
i18n/, theme/ as today, without side effects at import time
```

Rules:

- **Stores** hold state and minimal setters. `project` store: `mutate` stamps `updatedAt` only when something changed;
  `applyRemote` repairs selection inside the same update. `ui` store repairs selection from a single
  `selectionExists(project, selection)`; view selections are `{ kind: 'view', view: 'glyphs' | 'sounds' | 'paintings' | 'testServer' }`.
- **Commands** are plain functions; they are the only place that calls `mutate`. Each user action is **one** mutate
  (one undo step). Commands may update UI state (selection) explicitly; domain helpers they need live in core.
- **Dialogs:** `await confirm({...})` / `await prompt({...})` return promises (no callbacks in store data; nested
  confirms no longer replace the dialog underneath – a small stack). Feature dialogs are opened by id through a typed
  registry `{ component, requiresProject }`; `DialogHost` renders from the registry, exhaustively typed.
- **Main area:** a `views` map from selection kind to component instead of an if/else chain.
- **Plan:** computed once (deferred) in `store/plan.ts`/a provider; components call `usePlan()`; no prop drilling.
- **Project access:** `useOpenProject()` narrows (used below the project branch); no `!` on store reads.
- **Services:** created once by `bootstrap()` before render, each returns `dispose()`; no module-level mutable state;
  coalescing work uses one shared `createSerialTask()` helper (replaces the hand-rolled dirty/again flags in share and
  test-server sync). Services emit typed events/codes; UI-facing text is produced in the UI (or via `errorMessage`).
- **Errors:** user-facing errors are `CoreError`/`AppError(code, args)` translated at the edge with `errorMessage`.
- **i18n:** keys typed end-to-end; `SchemaKey` type for schema keys; `useSchemaText` becomes strict (no "has key?"
  fallback); `richTags` shared from `i18n/`.

### Core

- `types.ts` dissolves into `project/types.ts`, `model/types.ts`, `issues.ts` (Issue, MessageArgs, CoreError).
  `util.ts` dissolves into `project/ids.ts`, `text.ts` (slugify, stripFormatting), `binary/dataUrl.ts`, `binary/png.ts`,
  `minecraft/resourceLocation.ts` (all id/namespace/pack-name patterns, `sanitizeId`, `namespaceError`,
  `validateItemId`), `minecraft/versions.ts` (compareVersions, version constants), `object.ts` (deepClone/merge).
- **Issue:** `{ level, code, args?, target?, context? }`. `args` values are `string | number | { key: SchemaKey, args? }`
  (translated labels), replacing `params` + `texts`. `target` = `{ kind: 'item'|'folder'|'glyph'|'sound'|'painting', id }`
  replaces the scattered `itemId/folderId/glyphId/...` fields. `context` = ordered list of `{ code, args }` frames
  ("in item X", "variant Y", "project Z") rendered as a prefix, replacing `detail` nesting. `projectId` on multi-export.
- **Export:** `PackWriter` (json/binary/texture/duplicates; tolerates bad data URLs by reporting an issue), `paths.ts`,
  `itemModels.ts`, `armor.ts`, validators in `validate/`; `planExport` becomes orchestration. One path map drives both the
  zip and the path listing. Glyphs/sounds/paintings expose uniform `emit`/`validate`.
- **Models:** `model/bbmodel/` split (types, textures, elements, display, index); convert first, then validate once via
  `analyseElements` returning `{ issues, requiresVersion }`.
- **Nexo:** `schema/` split by group with a `prop()` builder that derives path, key and every message key from the tree
  position (explicit overrides only where they differ); `options` via a `labeled()` helper; animation props from one
  helper; armor fields generated from `ARMOR_LAYERS`. Armor settings move from `config.$armor` to a typed `item.armor`
  (migration in core `migrateProject`, used by persistence and sync). Entity folders `nexo/{glyphs,sounds,paintings,recipes}/`
  with model/yaml/validate where it helps.
- **Moves into core:** app `importer.ts` (draft building), MiniMessage parser, persistence `migrateProject`, asset
  reference collection, `folderYamlFile`, version-support check, `namespaceError`, unique-id helper.

### Electron

- `// @ts-check` on all `.cjs` with a `tsconfig.electron.json` (checkJs, based on `config/node.json`), typed against the
  shared IPC contract in `src/platform/desktopApi.ts` via JSDoc `import()` types.
- Split `testserver.cjs` into `electron/testserver/*`; one `ipc.cjs` (`handle(channel, fn)` with the sender guard);
  one `fsUtil.cjs` (atomic write with Windows retry, open path).
- Desktop strings move into `packages/i18n` as the `desktop` namespace (JSON loaded from CJS) → covered by parity.
- Test hooks (`RESOURCEPACKBUILDER_*` env) only honoured when `RESOURCEPACKBUILDER_E2E=1`, in one `testHooks.cjs`.
- Permission request handler denies everything; `http:` links not opened externally (https only); single-instance
  early return.
- Bridge renamed `window.nexoDesktop` → `window.resourcepackBuilder`.

### Repo

- ESLint (flat config: typescript-eslint, react-hooks, next) + Prettier at the root, `lint` turbo task, CI runs lint,
  typecheck, tests on both jobs; whole repo formatted once.
- turbo: `test` depends on own `typecheck`; declare outputs; `dist:win` depends on `build`.
- `next-intl` and all renderer libraries are devDependencies of the app (static export → nothing at runtime);
  `jszip`/`playwright-core` declared where used.
- English README, CHANGELOG "Unreleased" rewritten in English (history untouched), English package descriptions,
  `.gitignore` comment translated + `exe-test/`.
- E2E script (`scripts/test-windows-exe.cjs`) selects by role/`data-testid`, forces English, shares the PNG helper.

## Naming conventions

Applied repo-wide (a dedicated naming pass runs after the feature work):

- Files: React components `PascalCase.tsx` named after their main component; other modules `camelCase.ts`; hooks
  `useThing.ts`; folders camelCase. Vendored shadcn files keep their kebab-case names. Electron `.cjs` modules camelCase.
- Identifiers: types/interfaces/classes PascalCase; functions/variables camelCase; module constants UPPER_SNAKE;
  booleans as predicates (`isX`, `hasX`, `canX`); props `onX`, local handlers `handleX`.
- No cryptic abbreviations (`tc`, `ts`, `tSel` → `tCommon`, `tSchema`, `tSelection`), no German, no Nexo branding for
  app concepts (Nexo domain terms such as `nexoId` stay). Names describe what a thing is, not how it is implemented.

## Bug fixes included

1. Autosave saves the project that changed (per-project pending save), and every project switch flushes first.
2. No-op `mutate` creates no undo step, no save, no share change.
3. Deleting a shared project leaves no orphan `sync:` record; `last-project` cleared.
4. Test-server `syncProject` callers always wait for a sync of the latest project with their own `reload` flag;
   `give` waits for the reload instead of a fixed 2.5 s.
5. `moveFolder` guards a missing target; painting/music-disc creation is one undo step.
6. Opening a project file with the open project's id asks before replacing.
7. Sync `pollNow` records file hashes only after changes were applied (no lost remote changes).
8. One corrupt data URL no longer aborts the whole export (reported as an issue).
9. Folder recursion guarded against cycles; empty item id not also reported as duplicate.
10. Electron: failed spawn resets state; config load race fixed; `testserver:sync` with a null file no longer crashes.
11. Toast auto-dismiss owned by the toast UI; autosave warning re-arms after a successful save.
12. `StringListEditor`/`ObjectListEditor` stable row keys (focus no longer jumps on move/remove); DropZone flicker.
13. Layout: main area uses container queries; headers wrap; no horizontal overflow at 1000px window width.

## Persisted-data compatibility

IndexedDB projects and shared folders written by the previous version must keep loading: `migrateProject` (core) moves
`config.$armor` to `item.armor` and fills defaults; sync envelopes go through the same migration. The shared-folder
readme file name changes from `LIESMICH.txt` to `README.txt` (informational file only, never read).

## Verification

- `npm run typecheck`, `npm run lint`, `npm test` (core, i18n, app) green; existing core tests adapted, not weakened.
- New tests: store (`mutate` no-op, selection repair), serial task helper, dialog promise service, migration
  (`$armor` → `item.armor`), PackWriter bad data URL, sync apply-before-record, schema builder key derivation.
- `next build` static export; browser walkthrough (Playwright) of every view and dialog in en/de and light/dark at
  1000px and 1500px width; console free of errors.
- Electron: `tsc -p tsconfig.electron.json` (checkJs) green; `node --check` on all `.cjs`.
