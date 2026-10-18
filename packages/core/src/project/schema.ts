/**
 * Schemas of the stored project data (IndexedDB, project files, shared folders). Stored data is untrusted and may
 * come from any earlier version, so they are lenient: a bad field falls back to its default, a bad list or map
 * entry is dropped. Entries without the fields that identify them (ids) are dropped as a whole.
 *
 * Migrations (as preprocessing steps):
 *  - armor settings moved from `item.config.$armor` to `item.armor`
 *  - issues stored with imported models: `params` became `args`
 *
 * The TypeScript types stay in types.ts and the entity modules; the `SchemaChecks` at the end make sure both agree.
 */
import { z } from 'zod';
import {
  type Covers,
  type Fits,
  isPlainObject,
  type Issue,
  issueCode,
  type LabelArg,
  lenientBoolean,
  lenientEnum,
  lenientList,
  lenientNumber,
  lenientRecord,
  lenientString,
  listOf,
  nullableNumber,
  optional,
  recordOf,
  type SchemaChecks,
  schemaKey,
  stringList,
  uid,
  uniqueId,
  withoutUndefined,
} from '@resourcepackbuilder/utils';
import {
  type ImportedModel,
  itemIdSyntaxError,
  JavaModelSchema,
  type ModelTexture,
  ModelTextureSchema,
} from '@resourcepackbuilder/minecraft';
import { toArmorSettings, type ArmorSettings } from './armor';
import { CHAT_TEXT_HEIGHT, DEFAULT_FONT_ASCENT, type Glyph } from './media/glyph';
import type { MediaFile } from './media/entry';
import type { MediaEntryByKind, MediaKind } from './media/kinds';
import type { Painting } from './media/painting';
import { INGREDIENT_LETTERS, RECIPE_TYPES, type Recipe, type RecipeIngredient } from './recipes/model';
import type { JukeboxSong, Sound, SoundFile } from './media/sound';
import { itemIdFromName } from './ids';
import { defaultSettings, DEFAULT_PACK_NAME } from './factory';
import { DEFAULT_PACK_TARGET, PACK_TARGETS } from './target';
import { migrateNexoConfig } from './legacyNexoConfig';
import type {
  ConfigObject,
  ConfigValue,
  CraftEngineAttributeData,
  CraftEngineProjectData,
  Folder,
  Item,
  Project,
  ProjectSettings,
} from './types';

/** Former location of the armor settings inside the item configuration */
const LEGACY_ARMOR_KEY = '$armor';

const id = () => z.string().min(1);

/* ------------------------------------------------------------ Issues */

const LabelArgSchema = z
  .object({ key: z.string().transform(schemaKey), args: optional(lenientRecord(z.union([z.string(), z.number()]))) })
  .transform(withoutUndefined);
const MessageArgsSchema = recordOf(z.union([z.string(), z.number(), LabelArgSchema]));

/** An issue stored with an imported model (only level, code and args are kept). */
export const IssueSchema = z.preprocess(
  // Migration: `params` became `args`
  (raw) => (isPlainObject(raw) && raw.args === undefined && raw.params !== undefined ? { ...raw, args: raw.params } : raw),
  z
    .object({
      level: lenientEnum(['error', 'warning', 'info'], 'info'),
      code: z.string().transform(issueCode),
      args: optional(MessageArgsSchema),
    })
    .transform(withoutUndefined),
);

/* ------------------------------------------------------------ Models */

export const ImportedModelSchema = z
  .object({
    source: lenientEnum(['bbmodel', 'json', 'png'], 'json'),
    fileName: lenientString(),
    json: JavaModelSchema.catch({}),
    textures: lenientList(ModelTextureSchema),
    issues: lenientList(IssueSchema),
    requiresVersion: optional(z.string()),
  })
  .transform(withoutUndefined);

/* ------------------------------------------------------------ Glyphs, sounds, paintings */

export const MediaFileSchema = z.object({ name: lenientString(), dataUrl: z.string(), width: lenientNumber(0), height: lenientNumber(0) });

export const GlyphSchema = z.object({
  id: id(),
  glyphId: z.string(),
  kind: lenientEnum(['image', 'gif', 'reference'], 'image'),
  file: MediaFileSchema.nullable().catch(null),
  ascent: lenientNumber(DEFAULT_FONT_ASCENT),
  height: lenientNumber(CHAT_TEXT_HEIGHT),
  font: lenientString(),
  permission: lenientString(),
  placeholders: stringList(),
  isEmoji: lenientBoolean(false),
  tabcomplete: lenientBoolean(false),
  rows: lenientNumber(1),
  columns: lenientNumber(1),
  frameCount: nullableNumber(),
  offset: nullableNumber(),
  reference: lenientString(),
  index: lenientNumber(1),
});

const SoundFileSchema = z.object({ name: lenientString(), dataUrl: z.string(), size: lenientNumber(0) });

const JukeboxSongSchema = z.object({
  duration: lenientString(),
  description: lenientString(),
  comparatorOutput: nullableNumber(),
  range: nullableNumber(),
});

export const SoundSchema = z.object({
  id: id(),
  soundId: z.string(),
  files: lenientList(SoundFileSchema),
  stream: lenientBoolean(false),
  volume: nullableNumber(),
  pitch: nullableNumber(),
  distance: nullableNumber(),
  jukebox: JukeboxSongSchema.nullable().catch(null),
});

export const PaintingSchema = z.object({
  id: id(),
  paintingId: z.string(),
  title: lenientString(),
  author: lenientString(),
  width: lenientNumber(1),
  height: lenientNumber(1),
  randomPlace: lenientBoolean(false),
  file: MediaFileSchema.nullable().catch(null),
  animated: lenientBoolean(false),
  frametime: lenientNumber(2),
});

/** The schema of each media kind (see MEDIA_KINDS). */
export const MEDIA_SCHEMAS: { [K in MediaKind]: z.ZodType<MediaEntryByKind[K], unknown> } = {
  glyph: GlyphSchema,
  sound: SoundSchema,
  painting: PaintingSchema,
};

/* ------------------------------------------------------------ Recipes */

const RECIPE_TYPE_NAMES = RECIPE_TYPES.map((t) => t.type) as [Recipe['type'], ...Recipe['type'][]];

const IngredientSchema = z
  .object({
    source: lenientEnum(['minecraft', 'nexo', 'tag'], 'minecraft'),
    id: lenientString(),
    amount: optional(z.number()),
  })
  .transform(withoutUndefined);

/** A recipe needs its id and a known type; the shaped grid always has 9 cells. */
export const RecipeSchema = z.object({
  id: id(),
  type: z.enum(RECIPE_TYPE_NAMES),
  resultAmount: lenientNumber(1),
  grid: z
    .array(z.unknown())
    .catch([])
    .transform((cells) => INGREDIENT_LETTERS.map((_, i) => (typeof cells[i] === 'string' ? (cells[i] as string) : ''))),
  ingredients: lenientRecord(IngredientSchema),
  input: IngredientSchema.nullable().catch(null),
  cookingTime: lenientNumber(200),
  experience: lenientNumber(0.1),
});

/* ------------------------------------------------------------ Items */

/** A configuration value; invalid entries inside lists and objects are dropped. */
export const ConfigValueSchema: z.ZodType<ConfigValue, unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), listOf(ConfigValueSchema), ConfigObjectSchema]),
);
export const ConfigObjectSchema: z.ZodType<ConfigObject, unknown> = z.lazy(() => recordOf(ConfigValueSchema));

const ArmorSchema = z.record(z.string(), z.unknown()).transform((value): ArmorSettings => toArmorSettings(value));

/** Moves the legacy `config.$armor` to `armor`, brings Nexo keys up to date and fills in the id from the map key (`fallbackId`). */
function migrateItemInput(raw: unknown, fallbackId: string | undefined): unknown {
  if (!isPlainObject(raw)) return raw;
  const item: Record<string, unknown> = { ...raw };
  if (typeof item.id !== 'string' && fallbackId !== undefined) item.id = fallbackId;
  if (isPlainObject(item.config) && LEGACY_ARMOR_KEY in item.config) {
    const { [LEGACY_ARMOR_KEY]: legacyArmor, ...config } = item.config;
    item.config = config;
    if (!isPlainObject(item.armor)) item.armor = legacyArmor;
  }
  if (isPlainObject(item.config)) item.config = migrateNexoConfig(item.config);
  return item;
}

/** An item; `now` is the fallback for its timestamps. */
export function itemSchema(now: number) {
  return (
    z
      .object({
        id: id(),
        itemId: lenientString(),
        displayName: lenientString(),
        folderId: lenientString(),
        model: ImportedModelSchema.nullable().catch(null),
        config: ConfigObjectSchema.catch({}),
        rawYaml: lenientString(),
        assets: lenientRecord(ModelTextureSchema),
        recipes: lenientList(RecipeSchema),
        variants: optional(lenientRecord(lenientList(ImportedModelSchema))),
        armor: optional(ArmorSchema),
        translations: optional(lenientRecord(z.string())),
        createdAt: lenientNumber(now),
        updatedAt: lenientNumber(now),
      })
      // A missing or invalid item ID is derived from the display name like for new items (projectSchema makes it unique)
      .transform((item) => ({ ...item, itemId: itemIdSyntaxError(item.itemId) ? itemIdFromName(item.displayName) : item.itemId }))
      .transform(withoutUndefined)
  );
}

/** Projects are migrated with one `now` for all their items – the schema is built once for it. */
let cachedItemSchema: { now: number; schema: ReturnType<typeof itemSchema> } | undefined;

/** Parses one stored item (the map key is the fallback id); null when it is no item. */
export function parseItem(raw: unknown, now: number, fallbackId?: string): Item | null {
  if (cachedItemSchema?.now !== now) cachedItemSchema = { now, schema: itemSchema(now) };
  const parsed = cachedItemSchema.schema.safeParse(migrateItemInput(raw, fallbackId));
  return parsed.success ? parsed.data : null;
}

/* ------------------------------------------------------------ Folders, settings, project */

/** A folder; references to missing folders and items are cleaned up by repairProject afterwards. */
export const FolderSchema = z.object({
  id: id(),
  name: lenientString(),
  parentId: z.string().nullable().catch(null),
  folderIds: stringList(),
  itemIds: stringList(),
});

/** Project settings; missing or invalid ones get the defaults of a project named `projectName`. */
export function settingsSchema(projectName: string) {
  const defaults = defaultSettings(projectName);
  return z
    .object({
      minecraftVersion: lenientString(defaults.minecraftVersion),
      useItemModel: lenientBoolean(defaults.useItemModel),
      packName: lenientString(defaults.packName),
      packDescription: lenientString(defaults.packDescription),
      packIcon: z.string().nullable().catch(null),
      externalPackAsZip: lenientBoolean(defaults.externalPackAsZip),
      itemsInProjectFolder: lenientBoolean(defaults.itemsInProjectFolder),
      yamlFileMode: lenientEnum(['folder', 'item'], 'folder'),
      ceCategoriesFromFolders: lenientBoolean(defaults.ceCategoriesFromFolders),
    })
    .catch(defaults);
}

/** The project's attribute system; like the CraftEngine configuration, an empty one is left out. */
export const CraftEngineAttributeSchema = z
  .object({
    definitions: optional(lenientList(ConfigObjectSchema)),
    operations: optional(lenientList(ConfigObjectSchema)),
    equipmentSets: optional(lenientList(ConfigObjectSchema)),
    damageRules: optional(lenientList(ConfigObjectSchema)),
  })
  .transform((data) => withoutUndefined(data))
  .transform((data) => (Object.keys(data).length > 0 ? data : undefined));

/** The project-wide CraftEngine configuration; a bad part is dropped, an empty one leaves the whole out. */
export const CraftEngineProjectSchema = z
  .object({
    lootSources: optional(lenientList(ConfigObjectSchema)),
    templates: optional(lenientList(ConfigObjectSchema)),
    globalVariables: optional(lenientRecord(z.string())),
    attributes: optional(CraftEngineAttributeSchema),
    lang: optional(lenientRecord(recordOf(z.string()))),
    translations: optional(lenientRecord(recordOf(z.string()))),
    categories: optional(lenientList(ConfigObjectSchema)),
    configuredFeatures: optional(lenientList(ConfigObjectSchema)),
    placedFeatures: optional(lenientList(ConfigObjectSchema)),
    atlases: optional(lenientList(ConfigObjectSchema)),
    pack: optional(ConfigObjectSchema),
    configFactories: optional(lenientList(ConfigObjectSchema)),
  })
  .transform((data) => withoutUndefined(data))
  .transform((data) => (Object.keys(data).length > 0 ? data : undefined));

/** A whole stored project (before repairProject): only the name is required; `now` is the fallback for timestamps. */
export function projectSchema(now: number) {
  return z.looseObject({ name: z.string() }).transform((raw) => {
    const items: Record<string, Item> = {};
    const derivedIds: string[] = [];
    if (isPlainObject(raw.items)) {
      for (const [key, value] of Object.entries(raw.items)) {
        const item = parseItem(value, now, key);
        // Like folders, an item is addressed by its map key, so a differing stored id is replaced by it
        if (item) items[key] = { ...item, id: key };
        if (item && isPlainObject(value) && value.itemId !== item.itemId) derivedIds.push(key);
      }
    }
    // Derived IDs may collide; they get numbered. IDs the user stored stay as they are, duplicates included.
    const taken = new Set(
      Object.entries(items)
        .filter(([key]) => !derivedIds.includes(key))
        .map(([, item]) => item.itemId),
    );
    for (const key of derivedIds.sort((a, b) => items[a].createdAt - items[b].createdAt || (a < b ? -1 : 1))) {
      items[key].itemId = uniqueId(items[key].itemId, taken);
      taken.add(items[key].itemId);
    }
    const folders: Record<string, Folder> = {};
    if (isPlainObject(raw.folders)) {
      for (const [key, value] of Object.entries(raw.folders)) {
        const folder = FolderSchema.safeParse(isPlainObject(value) ? { ...value, id: key } : value);
        if (folder.success) folders[key] = folder.data;
      }
    }
    const project: Project = {
      formatVersion: 1,
      id: lenientString(uid('p_')).parse(raw.id),
      name: raw.name,
      target: lenientEnum(PACK_TARGETS, DEFAULT_PACK_TARGET).parse(raw.target),
      namespace: lenientString(DEFAULT_PACK_NAME).parse(raw.namespace),
      settings: settingsSchema(raw.name).parse(raw.settings),
      folders,
      items,
      rootFolderIds: stringList().parse(raw.rootFolderIds),
      glyphs: lenientList(GlyphSchema).parse(raw.glyphs),
      sounds: lenientList(SoundSchema).parse(raw.sounds),
      paintings: lenientList(PaintingSchema).parse(raw.paintings),
      createdAt: lenientNumber(now).parse(raw.createdAt),
      updatedAt: lenientNumber(now).parse(raw.updatedAt),
    };
    // Only set when the project has some, so other projects keep their shape
    const craftEngine = optional(CraftEngineProjectSchema).parse(raw.craftEngine);
    if (craftEngine) project.craftEngine = craftEngine;
    return project;
  });
}

/* ------------------------------------------------------------ Type checks */

type Out<S extends z.ZodType> = z.output<S>;
type ItemOut = Out<ReturnType<typeof itemSchema>>;
type SettingsOut = Out<ReturnType<typeof settingsSchema>>;

export type ProjectSchemaChecks = SchemaChecks<
  [
    Fits<Out<typeof IssueSchema>, Issue>,
    Fits<Out<typeof LabelArgSchema>, LabelArg>,
    Fits<Out<typeof ImportedModelSchema>, ImportedModel>,
    Covers<Out<typeof ImportedModelSchema>, ImportedModel>,
    Fits<Out<typeof ModelTextureSchema>, ModelTexture>,
    Fits<Out<typeof MediaFileSchema>, MediaFile>,
    Covers<Out<typeof MediaFileSchema>, MediaFile>,
    Fits<Out<typeof GlyphSchema>, Glyph>,
    Covers<Out<typeof GlyphSchema>, Glyph>,
    Fits<Out<typeof SoundFileSchema>, SoundFile>,
    Fits<Out<typeof JukeboxSongSchema>, JukeboxSong>,
    Covers<Out<typeof JukeboxSongSchema>, JukeboxSong>,
    Fits<Out<typeof SoundSchema>, Sound>,
    Covers<Out<typeof SoundSchema>, Sound>,
    Fits<Out<typeof PaintingSchema>, Painting>,
    Covers<Out<typeof PaintingSchema>, Painting>,
    Fits<Out<typeof IngredientSchema>, RecipeIngredient>,
    Covers<Out<typeof IngredientSchema>, RecipeIngredient>,
    Fits<Out<typeof RecipeSchema>, Recipe>,
    Covers<Out<typeof RecipeSchema>, Recipe>,
    Fits<ItemOut, Item>,
    Covers<ItemOut, Item>,
    Fits<Out<typeof FolderSchema>, Folder>,
    Covers<Out<typeof FolderSchema>, Folder>,
    Fits<SettingsOut, ProjectSettings>,
    Covers<SettingsOut, ProjectSettings>,
    Fits<NonNullable<Out<typeof CraftEngineProjectSchema>>, CraftEngineProjectData>,
    Covers<NonNullable<Out<typeof CraftEngineProjectSchema>>, CraftEngineProjectData>,
    Fits<NonNullable<Out<typeof CraftEngineAttributeSchema>>, CraftEngineAttributeData>,
    Covers<NonNullable<Out<typeof CraftEngineAttributeSchema>>, CraftEngineAttributeData>,
  ]
>;
