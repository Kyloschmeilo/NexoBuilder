# Storage locations and export destinations – design

Date: 2026-10-16 · Branch: `ammo-rework` · Builds on the cleanup (spec `2026-10-15-codebase-cleanup-design.md`).

## Goal

The user decides where a project lives and where an exported pack goes:

- **Project storage location** (per project, changeable): *Local (this device)*, *Folder on disk*, *Shared folder*
  (synced by Google Drive / OneDrive / Dropbox / Nextcloud …), *S3* (any S3-compatible service, collaborative).
- **Export destinations** (per project, remembered): *Download ZIP* (today), *Local folder* (write files directly,
  e.g. a server's `plugins/Nexo`), *S3* (pack ZIP and/or unpacked files, optional public URL).
- **S3 connections** are named accounts in app settings; secrets are encrypted with the OS keychain and never leave the
  Electron main process.
- A new package `@resourcepackbuilder/s3` wraps `@aws-sdk/client-s3`.

Decisions taken with the user: storage applies to both projects and exports; S3 projects are collaborative like shared
folders; custom endpoints (R2, MinIO, B2, Wasabi …) are supported; secrets via Electron `safeStorage`; local = internal
app storage *and* an extra "folder on disk" option; projects can be moved between locations, existing projects stay
local; "shared" keeps using a synced folder (no cloud APIs); several named S3 connections; export destinations are
stored per project and remembered.

Non-goals: Google Drive/OneDrive APIs or OAuth; S3 in the browser dev build; writing the pack URL into Nexo's
`settings.yml` automatically; deleting data at the old location when moving; server-side encryption/KMS options.

## Concepts

### Storage location (device-local, per project)

```ts
type StorageLocation =
  | { kind: 'local' }
  | { kind: 'folder'; path: string }                                   // single user, file watcher
  | { kind: 'sharedFolder'; path: string; userName: string }           // collaborative, file watcher
  | { kind: 's3'; connectionId: string; bucket: string; prefix: string; userName: string }; // collaborative, polling
```

- Stored by the app's project repository next to the project (replaces today's `ShareConfig`; migration:
  `ShareConfig { folder, userName }` → `{ kind: 'sharedFolder', path: folder, userName }`). It is **device-local**: a
  collaborator opens the same S3 project through their own connection; connection ids never enter project data.
- Every project keeps its working copy in the internal app storage (IndexedDB) as today. A non-local location adds a
  **remote backend** that the existing `SyncEngine` keeps in sync with that copy (same envelope-per-entity file format
  as shared folders today). `folder` and `sharedFolder` use the same backend and file format; `folder` simply has no
  other participants (identity = this device, no remote-change notices).
- Remote backends implement core's `SyncFs` (`list`, `read`, `write`) plus change notification:
  folders → file watcher (as today); S3 → polling (default 5 s while the app is focused, 30 s in the background;
  constant in one place). The share service generalises to a **storage sync service** that works for any backend.

### Moving a project

Project settings → "Storage": shows the current location and **Move to…** (local, folder, shared folder, S3).
Moving = flush autosave → write a full copy (all envelopes) to the target → switch the location → reconnect. The old
location is left untouched (the dialog says so). Moving to *local* = today's "stop sharing". Moving to a target that
already contains a *different* project is refused; a target with the *same* project id asks before replacing (same
rule as `openSharedProject` today).

### Opening a project from a location

Projects dialog gets **Open from…**: folder, shared folder, S3 (connection + bucket + prefix → inspect → list projects
found there, like `share:inspect` lists projects in subfolders today). The existing ownership check applies (a remote
project may not silently replace an unrelated local one).

### Export destinations (device-local, per project)

```ts
type ExportDestination =
  | { id: string; kind: 'download' }
  | { id: string; kind: 'folder'; path: string; clean: boolean }  // clean = remove files we wrote last time that are gone now
  | { id: string; kind: 's3'; connectionId: string; bucket: string; zipKey?: string; filesPrefix?: string;
      publicRead: boolean; publicUrlBase?: string };
```

- Stored in the project repository per project (device-local, like the location), plus the last used destination.
  The export dialog lists them, lets the user add/edit/remove, and runs the export to the chosen one.
- The export content is unchanged: core produces the same file map it zips today (pack + plugin files in the chosen
  export mode). `folder` writes that map into the folder (only inside the user-chosen folder; atomic writes);
  `s3` uploads the ZIP to `zipKey` and/or every file under `filesPrefix` (multipart for large objects, correct
  `Content-Type`), optional `public-read` ACL. Key templates support `{project}` and `{namespace}`.
- After an S3 export the dialog shows the object URL(s): `publicUrlBase + key` if set, else the connection's endpoint
  URL (virtual-hosted or path-style), with a copy button and a hint when the object is not public. Buckets that block
  ACLs: the upload still succeeds without ACL and the dialog explains that public access must be granted by bucket
  policy/CDN (detected from the S3 error code).

### S3 connections (app settings, device-local)

```ts
interface S3ConnectionInfo {           // what the renderer sees
  id: string; name: string; endpoint?: string; region: string; forcePathStyle: boolean;
  accessKeyId: string; hasSecret: boolean;
}
interface S3ConnectionInput extends Omit<S3ConnectionInfo, 'id' | 'hasSecret'> {
  id?: string; secretAccessKey?: string;   // omitted on edit = keep the stored secret
}
```

- Settings → **Storage accounts**: list, add, edit, delete, **Test** (credentials + optional bucket: `HeadBucket` /
  `ListObjectsV2 max 1`), translated error mapping (invalid credentials, access denied, no such bucket, endpoint
  unreachable, TLS).
- Stored by the main process in `userData/storage-connections.json`; `secretAccessKey` is encrypted with
  `safeStorage.encryptString` (base64). If `safeStorage.isEncryptionAvailable()` is false, saving a secret fails with a
  clear message (no plaintext fallback). Secrets are never sent to the renderer, logged, or included in errors.
- Deleting a connection used by a project or destination is allowed after a confirm; those projects show
  "connection missing" and offer to pick another connection.

## Packages and layers

| Layer | Responsibility |
|---|---|
| `packages/s3` (new, Node-only) | Thin typed wrapper over `@aws-sdk/client-s3` (+ `@aws-sdk/lib-storage` for multipart): `createS3Client(config)`, `listObjects(prefix)` (paginated), `getObjectText/Bytes`, `putObject(key, body, { contentType, publicRead })`, `uploadLarge`, `headObject`, `deleteObject(s)`, `testConnection(bucket?)`, `objectUrl(key)`, typed `S3Error` with a stable `code` (`invalidCredentials`, `accessDenied`, `noSuchBucket`, `unreachable`, `aclNotSupported`, `unknown`). Unit tests with `aws-sdk-client-mock`. Builds a self-contained CJS bundle (esbuild, platform node) that Electron loads. |
| `packages/core` | `StorageLocation`, `ExportDestination` types + validation (key templates, prefixes), `exportFileMap(plan)` used by zip and destinations alike (one source of truth), sync format unchanged, `SyncFs` unchanged. |
| Electron main | `storage/connections.cjs` (safeStorage store), `storage/s3Backend.cjs` (SyncFs + inspect over the S3 bundle), existing folder backend generalised (`storage/folderBackend.cjs`, today's `share.cjs`), `exportTargets.cjs` (folder write, S3 upload), IPC channels below, all with the existing sender guard. |
| App | Repository stores location + destinations; `storageSync` service (generalised `shareSync`) picks the backend per location; projects dialog "Open from…"; settings "Storage" (location + move) and "Storage accounts"; export dialog destinations. Browser build: only `local` + `download` (other options hidden). |
| i18n | New `storage` namespace (en + de): locations, move/open flows, connections, test results, error codes, export destinations. |

### IPC contract additions (`src/platform/desktopApi.ts`)

```ts
type RemoteRef =
  | { kind: 'folder'; path: string }
  | { kind: 's3'; connectionId: string; bucket: string; prefix: string };

'storage:choose-folder':  { args: [purpose: 'project' | 'export']; result: string | null };
'storage:inspect':        { args: [ref: RemoteRef]; result: RemoteInspectResult };   // projects found
'storage:list':           { args: [ref: RemoteRef]; result: ShareFileInfo[] };
'storage:read':           { args: [ref: RemoteRef, path: string]; result: string | null };
'storage:write':          { args: [ref: RemoteRef, path: string, content: string]; result: ShareFileInfo };
'storage:watch':          { args: [ref: RemoteRef]; result: 'watching' | 'polling' };
'storage:unwatch':        { args: [ref: RemoteRef]; result: void };
'connections:list':       { args: []; result: S3ConnectionInfo[] };
'connections:save':       { args: [input: S3ConnectionInput]; result: S3ConnectionInfo };
'connections:delete':     { args: [id: string]; result: void };
'connections:test':       { args: [input: S3ConnectionInput | { id: string }, bucket?: string]; result: S3TestResult };
'export:to-folder':       { args: [path: string, files: ExportFile[], options: { clean: boolean }]; result: ExportResult };
'export:to-s3':           { args: [dest: S3ExportTarget, payload: { zip?: Uint8Array; files?: ExportFile[] }]; result: S3ExportResult };
// event: 'storage:changed' (payload: RemoteRef id string) — replaces 'share:changed'
```

The `share:*` channels are replaced by `storage:*` (folder refs behave exactly like today's share folders, including
the "only folders the user picked" rule and realpath checks). S3 refs are validated in main: the connection must
exist, bucket/prefix must be valid S3 names, keys are always `prefix + relativePath` with `..`/absolute paths rejected.

## Error handling

- All storage/export failures surface as `CoreError`/app error codes translated at the UI edge; S3 errors map to the
  `S3Error` codes above. Sync errors keep the project usable locally (status "offline / retrying" with backoff),
  exactly like a temporarily unavailable shared folder today.
- Credentials problems on an S3 project show a status with "Fix connection" → opens Storage accounts.

## Security

- Secrets only in main, encrypted at rest via OS keychain; renderer gets `hasSecret` only.
- IPC sender guard on every channel; folder writes only inside user-chosen roots (realpath); S3 keys confined to the
  configured prefix; no secrets in logs/errors/telemetry; HTTPS endpoints required unless the endpoint host is
  `localhost`/`127.0.0.1` (MinIO dev).

## Testing

- `packages/s3`: client-mock tests for every operation and error mapping, pagination, multipart threshold.
- Core: destination/location validation, `exportFileMap` = zip contents, key templates.
- Electron: connections store round-trip with a fake `safeStorage`, path/key confinement, `node --check` + checkJs.
- App: storage sync service with fake backends (watch vs poll), move flow (full copy, refusal/confirm rules), ShareConfig
  migration, export destination store.
- Manual: MinIO in Docker (if available) or a real bucket — create S3 project, open it in a second app instance via
  the same connection, edit both, export ZIP to S3 with public URL; folder export into a temp server folder.
