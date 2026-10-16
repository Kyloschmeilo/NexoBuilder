# ResourcepackBuilder

**Turn Blockbench models into ready-to-use [Nexo](https://docs.nexomc.com/) items – resource pack included.**

ResourcepackBuilder is a **Windows program (.exe)**. You create folders, drop your models in, set the Nexo properties in
forms and export everything as a ZIP that you unpack straight into `plugins/Nexo/`.

![ResourcepackBuilder](docs/screenshot.png)

## Features

- **Folders & items** – folders (also nested) become subfolders of `plugins/Nexo/items`. Move items by drag & drop,
  duplicate and search them.
- **Copy & paste properties** – take the complete configuration of an item (material, lore, attributes, components,
  mechanics, extra YAML, optionally recipes) over to other items – also to a whole folder or to items of another
  project. Name, item id, model, variants, folder and `custom_model_data` stay with the target. Either **replace** or
  only **add**; one Ctrl+Z undoes everything.
- **Model import by drag & drop**
  - `.bbmodel` (Blockbench project, format "Java Block/Item") – converted like Blockbench's own Java export (UVs,
    rotations incl. free rotation from 1.21.11, inflate, display settings, animated textures). Other Blockbench formats
    (e.g. Generic Model) are converted with a warning.
  - `.json` + `.png` (Java model) – textures are matched by file name; parent models can be dropped along.
  - `.png` only – as a 2D item, tool or block (cube_all, pillar, six sides, plant …).
  - Several files at once → several items.
- **3D preview** of every model (incl. display views such as hand, head, inventory) and thumbnails in the tree.
- **Nexo properties in forms** (Nexo 1.29 / Minecraft 26.3):
  - General: lore (with MiniMessage preview), unbreakable, item flags, templates, PersistentData
  - Attributes & enchantments
  - Components: food, consumable, tool, weapon, equippable, glider, durability, max stack size, cooldown, death
    protection, jukebox playable, tooltip, attack range, fuel … (with version hints)
  - Mechanics: Furniture (hitbox, seats, beds, lights, door, storage, drops, states, placements, connectable, text
    entities …), Custom Block (NoteBlock/StringBlock/ChorusBlock, directional, log strip, sapling, stackable),
    Backpack, Commands, Custom Mechanic, Armor Effects, Trident, Repair, Harvesting, Smelting …
  - CustomArmor (worn): player armor, elytra, wolf/horse/llama/nautilus armor, harness and saddles → creates equipment
    models in the pack and sets Equippable automatically
  - Anything else: extra YAML per item
  - All features are named as in the Nexo/Minecraft docs (Components, Mechanics, Max Stack Size …) with an explanation
    on hover
- **Recipes** – crafting table (shaped/shapeless), furnace, blast furnace, smoker, campfire and stonecutter →
  `recipes/<type>/<project>.yml`
- **Special item appearance** – pulling/charged/firework (bow, crossbow), blocking (shield), cast (fishing rod),
  throwing (trident), damaged, dyeable and composite models (`Pack.pulling_models`, `Pack.blocking_model` …) plus a
  separate **GUI model** (a different model in the inventory)
- **Furniture models** – connectable (straight/left/right/inner/outer), placements (floor/wall/roof), lights (switched
  on) and states – ResourcepackBuilder writes the required ItemModels itself
- **Shade & ambient occlusion** switchable per model
- **Glyphs** – emojis and GUI textures (PNG, animated GIFs, multi-bitmap, reference glyphs) with a chat preview →
  `glyphs/<project>.yml`, usable anywhere with `<glyph:id>`
- **Sounds** – OGG files with volume, pitch, stream; as **Jukebox Playable** also music discs (item in one click) →
  `sounds.yml` + `assets/<ns>/sounds/…`
- **Paintings** – custom (also animated) paintings incl. an item to hang them → `paintings.yml` +
  `textures/painting/…` (from Minecraft 1.21.5; `sounds.yml`/`paintings.yml` replace existing files on the server)
- **Checks before exporting** – duplicate ids, invalid values, models outside the allowed range, missing textures,
  version conflicts and more
- **Export as ZIP**
  - `items/<folder>/<folder>.yml` (or one file per item)
  - `recipes/<type>/<project>.yml` (if there are recipes)
  - `glyphs/<project>.yml` (if there are glyphs)
  - `pack/external_packs/<packname>/` (or as `.zip`) with `pack.mcmeta`, models and textures
  - `INSTALL.txt` with the installation steps
  - Alternatively only the resource pack or only the item configs
  - **Selection**: export only certain folders, items and glyphs – and pack several saved projects into one ZIP (each
    project gets `items/<project>/` and its own resource pack; duplicate item ids, pack names or files between the
    projects are reported)
- **Automatic saving**, undo/redo (Ctrl+Z / Ctrl+Y), project files for backups and handing over.
- **Sharing projects** – work on a project together through a shared folder in OneDrive, Google Drive or Dropbox;
  changes reach everyone within seconds, in both directions.
- **Local test server** – a Paper server with Nexo on your PC that updates itself: changes in the project are in the
  game within seconds, including a new resource pack.
- **English and German, light and dark** – _Settings → This device_ sets the language and the appearance (Light, Dark
  or System); the top bar has a quick theme toggle. Menus and native dialogs follow the chosen language.

## Usage

### Windows program (.exe)

- **Installer:** `ResourcepackBuilder-Setup-<version>.exe` – installs ResourcepackBuilder with start menu and desktop
  shortcuts.
- **Portable:** `ResourcepackBuilder-<version>-portable.exe` – starts directly without installation.

**Download:** on GitHub under **[Releases](https://github.com/SLNE-Development/ResourcepackBuilder/releases/latest)**.
Every push is built as well: **GitHub → Actions → Build → artifact "ResourcepackBuilder-Windows"**.

The program is not digitally signed, so Windows SmartScreen may show "Windows protected your PC" on the first start.
**More info → Run anyway** starts it. Projects are saved automatically in the app data folder (see
_Help → About ResourcepackBuilder_).

### Sharing projects

You need a folder you share with the others – e.g. in **OneDrive**, **Google Drive** or **Dropbox** (create a folder and
share it with them).

1. Open the project → **Share** in the top bar → enter your name → **Choose folder and share** → pick the shared folder.
   If it already contains other files, ResourcepackBuilder creates a subfolder named after the project.
2. The others click **Open shared project…** on the start page (or in the project menu) and pick the same folder.
3. From now on changes reach everyone automatically – usually within seconds, depending on how fast the cloud service
   syncs the files. A dot in the top bar shows the state: green = up to date, yellow = transferring or folder currently
   unreachable (changes are caught up later), red = error.

Good to know:

- Every item, folder and glyph is a file of its own. Several people working on different items at the same time keep
  all their changes. If two people change **the same** item at the same time, the last saved change wins.
- **Undo** only reverts your own changes, never those of the others.
- Working offline, you get the others' changes on the next start – and yours are transferred then.
- **Stop sharing** only disconnects; your copy and the folder stay.
- Please do not edit the files in the shared folder by hand.

### Local test server

The **Test server** area at the bottom left runs a Minecraft server (Paper) with Nexo on your PC – and everything you
change in ResourcepackBuilder is in the game within seconds.

1. Open **Test server** → **Choose JAR…** → pick your Nexo JAR (the purchased file, e.g. from Polymart). It is only
   copied into the local test server and never uploaded anywhere.
2. Choose the Minecraft version (default: the project's version), enter your **Minecraft name** and accept the
   **Minecraft EULA**.
3. **Start server**. The first time, ResourcepackBuilder downloads Paper and – if needed – Java (a few minutes).
4. In Minecraft (same version) → **Multiplayer → Direct Connection → `localhost`**. The resource pack is sent
   automatically.

Then:

- Every change (new item, other model, properties, recipes, glyphs …) is transferred to `plugins/Nexo` automatically
  and loaded with `nexo reload all`; Nexo sends the new pack to all players.
- In the item editor, **Give in test server** puts the item straight into your inventory.
- The **console** shows the server output; you can enter commands there (without `/`).
- Your name gets OP on start. The world is flat, in creative mode and peaceful.
- Closing ResourcepackBuilder stops the server cleanly (the world is saved).

ResourcepackBuilder configures Nexo in the test server so the resource pack comes from your own PC
(`Pack.server.type: SELFHOST`, address `127.0.0.1`, port 8082, no obfuscation). It only reloads once Nexo has finished
the previous pack; the pack state (building / ready / error) is shown in the test-server area, which also offers
**Resend pack**. The server lives in the app data folder under `testserver/server` (button **Folder**).

### Installing exported items on your server

1. Unpack the export ZIP ("For the Nexo folder") into `plugins/Nexo/`.
2. Run `/nexo reload all` (or restart the server).
3. Get the items with `/nexo give <item_id> [amount] [player]` (e.g. `/nexo give ruby_sword 1 Steve`) or via
   `/nexo inventory`.

## What is generated?

Example for a project with the namespace `mypack`:

```
items/weapons/weapons.yml
pack/external_packs/mypack/pack.mcmeta
pack/external_packs/mypack/assets/mypack/models/item/weapons/ruby_sword.json
pack/external_packs/mypack/assets/mypack/textures/item/weapons/ruby_sword/blade.png
```

```yaml
ruby_sword:
  itemname: '<red>Ruby Sword'
  material: PAPER
  Pack:
    model: mypack:item/weapons/ruby_sword
  Components:
    item_model: nexo:ruby_sword
    max_stack_size: 1
```

- Textures go to `textures/item/…`, or `textures/block/…` for custom blocks – only these folders end up in Minecraft's
  texture atlases automatically.
- `Components.item_model: nexo:<id>` makes Nexo create a separate ItemModel for every item (recommended from 1.21.4,
  can be switched off in the project settings).
- The YAML is written in YAML 1.1 mode (as Bukkit/SnakeYAML reads it), so values like `yes` or `1:30` are not
  misinterpreted.

## Development

Requirements: Node.js 22+ and npm. Windows is needed for `dist:win` (or Linux with Wine).

```bash
npm install
npm run dev          # Next.js dev server on http://localhost:3000 (no sharing / test server in the browser)
npm run app          # build and start the desktop program (Electron)
npm test             # unit tests (every package and the app)
npm run typecheck    # TypeScript in every package, incl. the Electron sources (checkJs)
npm run lint         # ESLint in every package
npm run check:encoding  # fails on tracked text files that are not valid UTF-8
npm run format       # Prettier for the whole repository (format:check only checks)
npm run build        # static Next.js export to apps/resourcepackbuilder/out/
npm run dist:win     # Windows installer + portable exe in apps/resourcepackbuilder/release/
npm run icon         # regenerate the app icon (apps/resourcepackbuilder/build/icon.png)
```

All commands run through [Turborepo](https://turborepo.com) across the npm workspaces.

**Releasing:** bump the version in `apps/resourcepackbuilder/package.json`, rename `## Unreleased` in `CHANGELOG.md` to
`## <version>` (and start a new `## Unreleased` above it), then start **Actions → Build → Run workflow** on GitHub (or
push a tag `v<version>`). GitHub Actions lints, type-checks and tests, builds and tests the exe, and creates the release
`v<version>` with the installer and the portable exe; the release notes are the changelog section of that version.

### Architecture

A monorepo with npm workspaces. All packages are named `@resourcepackbuilder/<folder>` and export only what their
`index.ts` barrels list (core has four: `core/project`, `core/form`, `core/nexo` and `core/targets`).

| Package                     | Purpose                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/utils`            | Helpers without domain knowledge: plain objects and config walking, text and IDs, lenient zod schemas, JSON parsing, issues and `CoreError`, asset tokens.                                                                                                                                                                          |
| `packages/minecraft`        | Minecraft resource-pack knowledge without the project model: versions, resource locations, the vanilla catalog and models, PNG/GIF/OGG sniffing, MiniMessage, and the model import (`.bbmodel`, Java JSON, textures).                                                                                                               |
| `packages/core`             | The project model (`core/project`: items, folders, glyphs, sounds, paintings, recipes, migration, tree repair, operations) the generic form DSL behind the field editor (`core/form`), its Nexo mapping (`core/nexo`: item config, the Nexo form schema, YAML) and `core/targets`, which picks a project's form by its pack target. |
| `packages/export`           | Export planning, checks and the pack writer: Nexo YAML, item models, equipment, media, selection over several projects, ZIP and install guide.                                                                                                                                                                                      |
| `packages/sync`             | Sharing projects through a folder: the file format, merging and the sync engine.                                                                                                                                                                                                                                                    |
| `packages/test-server`      | The local test server's rules: config and limits, console commands, log parsing, status, Java/Paper versions and the files synced into `plugins/Nexo`.                                                                                                                                                                              |
| `packages/preview`          | 3D model preview and thumbnails with three.js – no React; the app's `ModelPreview` and `useThumbnail` wrap it.                                                                                                                                                                                                                      |
| `packages/i18n`             | English and German message catalogues per namespace (`src/messages/<locale>/<namespace>.json`), supported locales, typed message keys and the parity check that keeps both languages in step. `./desktop` exports the texts of the Electron main process (`desktop` namespace, not in the UI catalogue).                            |
| `packages/ui`               | Generic React building blocks: the vendored shadcn/ui components (Base UI flavour) in `src/components`, shared components on top of them, and the CastCrafter theme (`src/styles.css`: Tailwind v4 with light/dark design tokens; fonts Chakra Petch, Hanken Grotesk and Martian Mono bundled via `src/fonts.css`).                 |
| `packages/desktop-contract` | The IPC contract between UI and Electron: one channel map (`DESKTOP_API`) from which the preload bridge and all types are derived, zod argument schemas (`./schemas`, main process only) and serialisable `DesktopError`s.                                                                                                          |
| `packages/s3`               | Typed wrapper over the AWS SDK for S3-compatible storage (AWS, R2, MinIO, B2 …), Node only, bundled into the Electron main process once it imports it. Prepared for the upcoming storage locations feature (`docs/superpowers/specs/2026-10-16-storage-locations-design.md`).                                                       |
| `packages/test-utils`       | Node-only test helpers (real PNG files), used by package tests and the app's scripts; never shipped.                                                                                                                                                                                                                                |
| `packages/config`           | Shared TypeScript configuration: `base.json` (browser/React) and `node.json` (Node/Electron).                                                                                                                                                                                                                                       |
| `apps/resourcepackbuilder`  | The app: a Next.js (App Router) **static export** shown in an **Electron** window.                                                                                                                                                                                                                                                  |

Packages build on each other in one direction: `minecraft` on `utils`, `core` on `minecraft`, `export` and `sync` on
`core`, `test-server` on `export`, `preview` on `minecraft`, `desktop-contract` on `sync` and `test-server`, and the app
on all of them. A package may only import the workspace packages
its `package.json` declares (an ESLint rule; turbo rejects cyclic declarations), and inside core `project/` may not
import `nexo/` or `targets/`, and `form/` may not import a target (`nexo/`, `targets/`).

The app lists its runtime libraries (Next.js, React, zustand …) as `devDependencies` on purpose: the renderer is a
static export and the Electron main process is a self-contained bundle, so the installer ships no `node_modules`, and
electron-builder would otherwise pack every `dependency` into it.

The app (`apps/resourcepackbuilder`):

- `src/` – the React UI. Texts come from the next-intl catalogues of `packages/i18n` (English by default); styling is
  Tailwind utilities and the theme tokens only, so every view works in light and dark mode. Language and theme are
  per-device settings. Projects are stored in IndexedDB and saved automatically. Layout:
  - `app/` – Next.js routes only (layout with the pre-paint theme script, page, global CSS);
  - `shell/` – the frame: providers and boot screen, top bar, sidebar, right panel, main area (a map from the
    selection to its view), dialog host, keyboard shortcuts, window drop;
  - `store/` – zustand stores: project + undo history, UI state, clipboard, promise-based `confirm`/`prompt` dialogs;
  - `commands/` – every change to a project goes through these functions (one user action = one undo step);
  - `services/` – long-running work created once by `bootstrap()`: project repository (IndexedDB), autosave, share
    sync, test-server sync, desktop locale sync;
  - `features/<feature>/` – the views and dialogs of each feature (item editor, folder, glyphs, sounds, paintings,
    test server, export, share, settings, projects, new item, …);
  - `components/` – app-wide components, incl. the generic field editor that renders the Nexo property schema;
  - `i18n/`, `theme/`, `platform/` – language store and error translation, theme provider, the desktop bridge.
- `src/platform/desktopApi.ts` – re-exports the IPC contract types of `packages/desktop-contract`;
  `src/platform/desktop.ts` hands out `window.resourcepackBuilder` and turns failed calls back into `DesktopError`s. The
  bridge only exists in the desktop program; in the browser, sharing and the test server are unavailable.
- `electron/` – the desktop program in TypeScript (`electron/src`, own `tsconfig.json` based on `config/node.json`),
  bundled by esbuild (`electron/build.mjs`, part of `npm run build`) into `electron/dist/main.cjs` and `preload.cjs`
  together with the workspace packages it imports (desktop-contract, export, sync, test-server, i18n):
  - `main.ts` serves the export through the `app://bundle` protocol, builds the menus, opens only `https` links
    externally and denies web permissions (except clipboard writes);
  - `preload.ts` builds `window.resourcepackBuilder` from the contract's channel map;
  - `ipc.ts` registers handlers that accept requests from the app's own UI only and check every argument against the
    channel's schema; errors travel as `{ code, args }` and are translated by the UI;
  - `share.ts` gives access to shared folders – only folders the user picked, only project files (core's share
    format), no links leading outside;
  - `testServer/` downloads Paper and Java (responses and SHA-256 checksums verified), prepares and runs the server,
    and syncs the project into `plugins/Nexo`; the pure parts (log parsing, commands, file edits) live in
    `packages/test-server`;
  - `i18n.ts` translates with `@resourcepackbuilder/i18n/desktop`; `fileHelpers.ts` holds the atomic write, folder and
    JSON-with-backup helpers;
  - `testHooks.ts` – overrides for the automated Windows test, honoured only with `RESOURCEPACKBUILDER_E2E=1`.
- `electron-builder.yml` – packaging. The app has no runtime dependencies: the installer only contains the bundles in
  `electron/dist/`, `out/` and the icon.
- `scripts/test-windows-exe.cjs` – end-to-end test of the installed exe (Playwright), run in CI.
