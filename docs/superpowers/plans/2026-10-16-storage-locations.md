# Storage locations and export destinations – implementation plan

Spec: `docs/superpowers/specs/2026-10-16-storage-locations-design.md`. Starts after the cleanup naming pass (W9) has
landed, so file names are final. Branch `ammo-rework`; each workstream commits its own paths at checkpoints
(`git add -- <paths>` + `git commit -- <paths>`), subject prefix `Storage (<S1..S4>):`.

## Phase A (parallel)

### S1 – `packages/s3` (owns `packages/s3/**`, root lockfile changes for its deps)
1. Package scaffold (TS, vitest, lint, typecheck scripts, turbo), deps `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`,
   dev `aws-sdk-client-mock`, `esbuild`.
2. API per spec (client factory with endpoint/region/forcePathStyle/credentials, list (paginated), get text/bytes,
   put (contentType, publicRead), uploadLarge (multipart above 8 MB), head, delete(s), testConnection, objectUrl),
   `S3Error` with stable codes + mapping from SDK errors (incl. `AccessControlListNotSupported` → `aclNotSupported`).
3. Tests with client mock; `build` script → `dist/s3.cjs` self-contained bundle; README section.

### S2 – core (owns `packages/core/src/storage/**` (new) and `exportFileMap` in `packages/core/src/export/**`)
1. `StorageLocation`, `RemoteRef`, `ExportDestination` types + validation (bucket names, prefixes, key templates
   `{project}`/`{namespace}`, folder paths non-empty) + tests.
2. `exportFileMap(plan, options)` returning `{ path, bytes, contentType }[]`; zip built from it (tests prove identical
   zip contents).
3. Issue/error codes for storage in `issues.json` (en + de).

### S3 – Electron + contract (owns `apps/resourcepackbuilder/electron/**`, `src/platform/desktopApi.ts`,
`electron-builder.yml`, app `package.json` scripts, `packages/i18n/src/messages/*/desktop.json`)
1. Contract additions from the spec (types written first so S4 can start against them).
2. `storage/connections.cjs` (safeStorage, JSON store, no plaintext fallback), `storage/folderBackend.cjs` (from
   `share.cjs`), `storage/s3Backend.cjs` (SyncFs + inspect over the S1 bundle — until S1 lands, code against its
   documented API), `exportTargets.cjs`, IPC registration with the sender guard, `storage:changed` event, polling
   for S3 refs in main or renderer (decide: renderer-driven polling keeps main stateless — preferred).
3. Ship the S1 bundle: build step copies `packages/s3/dist/s3.cjs` into `electron/generated/` (gitignored) and
   electron-builder includes it; turbo `build`/`dist:win` depend on `@resourcepackbuilder/s3#build`.
4. Tests for path/key confinement and the connections store (fake safeStorage); checkJs green.

## Phase B – app (S4, after A; owns `apps/resourcepackbuilder/src/**`, `packages/i18n/src/messages/*/storage.json` +
registration)
1. Repository: location + export destinations + last destination per project; `ShareConfig` migration.
2. `storageSync` service generalising `shareSync` (backend per location, watch vs poll with focus-aware interval,
   backoff, status); remove the share-specific service/store/naming where superseded.
3. UI: Settings → "Storage" (current location, Move to… flow with confirm rules) and "Storage accounts" (list/add/
   edit/delete/test); Projects dialog "Open from…" (folder, shared folder, S3); TopBar status chip shows the location
   kind + sync status (replaces the share chip); export dialog destinations (list/add/edit/remove, run, result with
   URLs + copy, ACL hint). Browser build: hide non-local options.
4. `storage` namespace (en + de). Tests per spec. Typecheck/lint/tests/build green.

## Phase C – coordinator
Integration fixes, full test/lint run, Electron smoke test (connections store, folder project, folder export; S3
against MinIO if Docker is available, otherwise document the manual test), browser walkthrough of the new settings/
dialogs in en/de light/dark, README + CHANGELOG, commit.
