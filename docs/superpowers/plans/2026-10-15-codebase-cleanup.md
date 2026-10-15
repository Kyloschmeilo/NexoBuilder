# Codebase cleanup – implementation plan

Spec: `docs/superpowers/specs/2026-10-15-codebase-cleanup-design.md`. Executed on `ammo-rework`, one commit per phase.
Workstreams inside a phase run in parallel and own disjoint files; a workstream never edits files it does not own
(it reports needed changes instead). Every workstream ends with typecheck + tests of what it owns.

## Phase 1 – core, packages, Electron (parallel)

### W1 core: structure, issues, export, models, sync (owns `packages/core/src/**` except `nexo/**`)
1. Dissolve `types.ts` and `util.ts` into the modules listed in the spec (`project/types.ts`, `model/types.ts`,
   `issues.ts`, `project/ids.ts`, `text.ts`, `binary/*`, `minecraft/resourceLocation.ts`, `minecraft/versions.ts`,
   `object.ts`); keep `errors.ts` content in `issues.ts`. Update every import in core (nexo imports too – path-only edits
   in nexo are allowed). Package `exports` stays `./*`, so app imports must be updated in Phase 2 (list them).
2. New `Issue` shape (`code`, `args`, `target`, `context`); adapt export/model/sync/selection; replace `params`/`texts`/
   `detail`/`context.*` codes; `issues.json` adjusted (en+de, parity). Code-coverage test kept.
3. Export split: `PackWriter`, `paths.ts`, `itemModels.ts`, `armor.ts`, `validate/*`; `planExport` orchestration only;
   one path map for zip + listing; bad data URLs reported, not thrown.
4. `model/bbmodel/` split; validate once via `analyseElements` → `{ issues, requiresVersion }`; dedupe FACE_NAMES,
   bounds, deepClone; mcmeta without probe texture.
5. Sync: apply-before-record in `pollNow`; injectable `now` in merge; typed list kinds (no `as unknown as`);
   `parseEntityKey('project')` fix; `README.txt`; German identifiers (`_projekte`, `f_wiederhergestellt`, `Bild`,
   `ordner`, `erstellt mit`) → English.
6. Move in: `migrateProject` (from app persistence, plus `$armor` → `item.armor` using W2's `ArmorSettings`),
   importer drafts (from app `ui/importer.ts`, as pure functions + tests), MiniMessage parser (from ui), asset-ref
   collection, `folderYamlFile`, `versionSupport`, `namespaceError`, `sanitizeId`, `validateItemId`, `uniqueId`.
7. Delete dead exports; un-export file-internal ones; cycle guards in folder recursion; empty-id duplicate fix;
   `Item.armor` field.
8. Tests: migration, PackWriter bad data URL, sync apply-before-record, importer drafts, moved helpers.

### W2 core nexo (owns `packages/core/src/nexo/**`, `packages/i18n/src/messages/*/schema.json`)
1. `schema/` split by group with a `prop()` builder deriving path/key/message keys; animation helper; armor fields
   from `ARMOR_LAYERS`; `options` via `labeled()`; variants labels derived from slot. Keys stay identical unless a
   rename removes an inconsistency (then update schema.json en+de). `messageKeys.test.ts` stays green.
2. Armor settings as typed `ArmorSettings` on `item.armor` (W1 adds the field + migration); remove `isInternalKey`
   `$armor` filtering; `slotForMaterial` into `armor.ts`; `ensureSection` helper in itemConfig.
3. One resource-id regex, shared data-URL sniffing (`binary/*` from W1), one context-issue reporter, shared YAML
   header; `placeholder` on `BaseField`; validation out of `fields.ts`.
4. Entity folders where it helps (`glyphs/`, `sounds/`, `paintings/`, `recipes/`); dead/internal exports; English
   doc comments/fallbacks (`zustand` → `state`).

### W3 Electron + repo (owns `apps/resourcepackbuilder/electron/**`, `apps/resourcepackbuilder/scripts/make-icon.mjs`,
`electron-builder.yml`, root config files, `.github/**`, `README.md`, `CHANGELOG.md`, `.gitignore`,
`packages/config/**`, `packages/i18n/src/messages/*/desktop.json`)
1. Electron per spec: `@ts-check` + `tsconfig.electron.json`, split testserver, `ipc.cjs`, `fsUtil.cjs`,
   `testHooks.cjs`, desktop catalogue from `packages/i18n` (`desktop` namespace, registered in `messages.ts` by W4),
   bug fixes 10, security items, bridge rename to `window.resourcepackBuilder` (renderer side done in Phase 2).
2. Root ESLint flat config + Prettier config (do NOT format the repo yet), `lint` scripts/turbo task, turbo fixes,
   CI (lint/typecheck/test on both jobs, release heading), dependency placement in package.json files, English
   descriptions, `.gitignore`.
3. README (English, current architecture), CHANGELOG Unreleased (English).

### W4 packages ui / i18n / preview (owns `packages/ui/**` incl. adding variants to vendored `badge`, `alert`,
`button`, `packages/i18n/src/*.ts`, `packages/preview/**`)
1. ui becomes generic: add shared components (Tip with disabled-trigger support, IconButton with tones, SectionLabel
   with actions, `Tone` + StatusDot/StatusBadge, Thumb, PageHeader/PageShell, CollapsibleSection, CopyButton,
   DropZone without flicker, files helpers `readFileAs`/`fileStem`/`readPngFile`/`pickFiles` with cancel);
   Badge `success|warning|info`, Alert `info|warning` variants; fixed destructive Button variant.
2. Move FieldRenderer (+ split into editors/values per spec), inputs, IssueList, MiniMessage view, YamlView into
   `apps/resourcepackbuilder/src/components/{editor,…}` (this is the only app path W4 touches), strict
   `useSchemaText`, stable row keys, `useDraft` hook; remove ui's core dependency; explicit named exports.
3. i18n: `SchemaKey`/key types, `satisfies Messages`, parity on a `./parity` subpath, register `desktop` namespace,
   next-intl augmentation via a types entry instead of side-effect imports.
4. preview: renderer created once per mount, model swap only, loop only while needed, `forceContextLoss`, try/finally
   in thumbnails, exports only `ModelPreview`/`useThumbnail`; pure geometry into core if trivial (else keep).

## Phase 2 – app foundation (single workstream W5)

Owns `apps/resourcepackbuilder/src/**` except `components/` from W4.
1. Fix all imports broken by Phase 1 (core module moves, ui split).
2. `store/` (project, ui, notifications, dialogs, plan), `services/` + `bootstrap.ts`, `platform/`, `commands/`,
   `shell/` per spec; promise dialogs + typed registry; `views` map; `useOpenProject`, `usePlan`; bug fixes 1–6, 11.
3. Move every view/dialog file into `features/<feature>/` (mechanical moves, imports updated) so Phase 3 works on
   final locations; delete `ui/` leftovers (`projectActions`, `importer`, `hooks`).
4. Tests for stores, serial task, dialog service.

## Phase 3 – features (parallel)

All three use the shared ui components, `usePlan`, `useOpenProject`, commands, promise dialogs; remove local
duplicates, propagation hacks, prop-mirroring effects, magic numbers, inline styles (except runtime values), fixed
widths (container queries), and add `data-testid` where the e2e script needs it (list in the brief).
- **W6 item feature** (`features/item/**`, `components/editor/**`).
- **W7 shell + project features** (`shell/**`, `features/{folder,projects,settings,share,export,newItem,pasteConfig,moveItem}/**`).
- **W8 media + test server** (`features/{glyphs,sounds,paintings,testserver}/**`).

## Phase 4 – integration (coordinator)

0. Repo-wide naming pass per the spec's naming conventions (files, folders, types, functions, variables) in every
   package, Electron and scripts; renames applied with all references updated.

1. Typecheck/lint/test everything; fix cross-workstream breaks.
2. Prettier format the whole repo; `eslint --fix`; commit separately ("format") so review diffs stay readable.
3. E2E script on roles/test ids; run it against a local `dist:win` build if feasible.
4. Browser walkthrough per spec (en/de, light/dark, 1000/1500px); fix findings.
5. Final README/CHANGELOG touch-ups; commit; summary for the user.
