# UI rework and full Nexo / CraftEngine coverage

Date: 2026-10-18 · Branch: `feat/ui-rework-full-coverage` · Status: approved direction (see Decisions)

## Goal

1. Rework the whole UI so it is clear and consistent, and scales to every option of both plugins.
2. Expose every configurable CraftEngine and Nexo feature as GUI. This includes, for example, all CraftEngine block
   behaviors (https://xiao-momi.github.io/craft-engine-wiki/configuration/block/behaviors).
3. Give every feature a docs-link icon for its target: the CraftEngine wiki (correct base
   `https://xiao-momi.github.io/craft-engine-wiki/`) or the Nexo docs (`https://docs.nexomc.com/`).

## Decisions (made by the user)

- **Design system: Workbench.** A dense pro tool. Four panes: activity rail (48 px), sidebar (asset tree / registry
  list), page (editor), and an output dock (YAML + Checks) that is always visible on wide screens. Fonts are IBM Plex
  Sans (UI) and IBM Plex Mono (keys, ids, YAML). Control radius is 4 px, panel radius 6 px. Hairline 1 px borders, no
  card shadows (shadows only on overlays). Field rows lay out as label | control | key rail, with docs icons beside the
  label. Sections in the page are separated by a top rule and a small muted title, not by boxed cards.
- **Color themes are user-selectable.** There are 5 themes, each with light and dark variants. The theme choice and
  the light/dark/system choice are independent settings, persisted per device.
  - Deepslate: cool slate, lapis accent
  - Amethyst: violet-tinted, amethyst accent (the user's own default)
  - Copper: warm stone, copper accent
  - Prismarine: deep sea green, teal accent
  - Crimson: nether brick, crimson accent
  The palettes are those of the approved preview (https://claude.ai/artifact/C2KkZkEEFXXaMd2VXSgunc), mapped onto the
  token names of the UX spec §2.1. Nexo and CraftEngine marker colors are fixed tokens (`--target-nexo`,
  `--target-ce`), readable on every theme.
- Default theme for new installs: Deepslate, mode: system.

## Reference material

The research reports live in the plan workspace (`.superpowers/sdd/<plan>/research/`, git-ignored) and are the
detailed source for every task:
- `architecture.md`: data model, form DSL, the generic renderer, how to add a field end to end, hotspots, conventions.
- `ux-redesign.md`: audit, IA, the component inventory (§3), editor patterns (§4), schema additions (§5), phases (§6),
  acceptance checklist, copy rules. **Where it conflicts with the Decisions above (fonts, radii, palette, card style),
  the Decisions win.**
- `nexo-features.md`: Nexo 1.30 catalogue with docs URLs, gaps grouped into chunks A–J, a docs-link table (§16).
- `craftengine-features.md`: the CraftEngine wiki catalogue with gaps grouped into chunks.

## Architecture (summary)

- Tokens in `packages/ui/src/styles.css`. Themes are applied as `data-color-theme="<id>"` on `<html>` next to the
  next-themes `class="dark"`. Each theme defines the full semantic token set for light and dark. The shadcn aliases
  (`--background`, `--primary`, …) stay mapped onto the semantic tokens.
- Generic primitives in `packages/ui/src/editor/` (i18n-free; labels through `UiLabelsProvider`). App adapters that
  know the form schema go in `apps/resourcepackbuilder/src/components/{editor,catalog,features}/`.
- One "typed entry" pattern (CatalogDialog + TypedEntryCard) for everything that means picking a type and then filling
  in its fields: CE block behaviors, item behaviors, events/functions/conditions, loot, recipes, Nexo mechanics,
  furniture elements and hitboxes.
- Docs: `PropertyDef.docs` and `TypedType.docs` hold one URL each (forms are per target). `withDocs` lives in
  `core/form`. Each target has its own docs map module. A test asserts that every property and typed type of both
  forms has a docs URL with the correct base.
- Feature coverage is data first: schema definitions in `packages/core/src/{nexo,craftEngine}/form/schema/*`, exporter
  support where the output is not a plain pass-through, i18n in en + de, validation where the plugin would reject the
  value, and tests (golden export snapshots regenerated, never hand-merged).

## Out of scope

Target conversion between Nexo and CraftEngine. JS scripting. Worldgen. Premium-only CraftEngine features beyond a
badge plus a raw-YAML editor. Whatever a plugin only reads from its own global config files is out of scope unless the
app already writes that file.

## Verification

`npm run typecheck`, `npm run lint`, `npm test`, `npm run check:encoding`, `npm run format:check` pass on every merge.
UI tasks also take screenshots in both modes, plus at least two themes, at 1024 px and 1440 px. A final test-server
boot of Paper with each plugin loads an exported sample project without config errors.
