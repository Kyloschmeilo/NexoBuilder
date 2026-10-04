/**
 * Plant den kompletten Export eines Projekts: Item-YAMLs, Modelle, Texturen, Rüstungen
 * und alle Prüfungen. Das Ergebnis enthält fertige Dateiinhalte und kann direkt gezippt werden.
 *
 * Aufbau des Resourcepacks (assets/<namespace>/…):
 *   models/{item|block}/<ordner…>/<item_id>.json
 *   textures/{item|block}/<ordner…>/<item_id>/<textur>.png   (+ .png.mcmeta)
 *   equipment/<set>.json + textures/entity/equipment/humanoid[_leggings]/<set>.png
 *
 * Texturen liegen bewusst unter textures/item bzw. textures/block: Nur diese Ordner landen
 * automatisch im Item- bzw. Block-Atlas von Minecraft (auch ab 1.21.11 mit getrennten Atlanten).
 */
import type { ConfigObject, Issue, IssueLevel, Item, JavaModelJson, ModelTexture, Project } from '../types';
import { buildPackMcmeta, getMcVersion } from '../minecraft/versions';
import { analyseElements, isVanillaReference } from '../model/javaModel';
import { parseTexturePlaceholder } from '../model/common';
import { validateTexture } from '../model/textures';
import { getPath } from '../nexo/configPath';
import { buildItemConfig } from '../nexo/itemConfig';
import { validateTextFormat, type Field } from '../nexo/fields';
import { ASSET_TOKEN_PREFIX, PROPERTIES } from '../nexo/schema';
import { itemsToYaml } from '../nexo/yaml';
import { buildRecipeFiles, recipeKeys, validateRecipe } from '../nexo/recipes';
import { getFolderChain, getFolderSlugs, getItemsInTreeOrder, isBlockItem } from '../project/tree';
import {
  compareVersions,
  dataUrlToBytes,
  deepClone,
  ITEM_ID_PATTERN,
  isPlainObject,
  NAMESPACE_PATTERN,
  slugify,
} from '../util';

export interface ProjectIssue extends Issue {
  itemId?: string;
  folderId?: string;
}

export type ExportMode = 'full' | 'pack' | 'items';

export type FileContent = string | Uint8Array;

export interface ItemPlan {
  item: Item;
  folderSlugs: string[];
  modelKey: string | null;
  modelFile: string | null;
  modelJson: JavaModelJson | null;
  config: Record<string, unknown>;
  yamlFile: string;
}

export interface ExportPlan {
  items: ItemPlan[];
  /** Dateien relativ zum Wurzelverzeichnis des Resourcepacks */
  packFiles: Map<string, FileContent>;
  /** Dateien relativ zum Nexo-Plugin-Ordner (items/…) */
  itemFiles: Map<string, string>;
  /** Rezept-Dateien relativ zum Nexo-Plugin-Ordner (recipes/<typ>/…) */
  recipeFiles: Map<string, string>;
  issues: ProjectIssue[];
}

const BLOCK_VARIATION_LIMITS: Record<string, number> = { NOTEBLOCK: 1149, STRINGBLOCK: 127, CHORUSBLOCK: 63 };

export function textureDirFor(item: Item): 'item' | 'block' {
  return isBlockItem(item) ? 'block' : 'item';
}

export function modelPathFor(project: Project, item: Item): string {
  return [textureDirFor(item), ...getFolderSlugs(project, item.folderId), item.nexoId].join('/');
}

export function modelKeyFor(project: Project, item: Item): string | null {
  return item.model ? `${project.namespace}:${modelPathFor(project, item)}` : null;
}

export interface PlanOptions {
  /** Binärdateien (Texturen) dekodieren. Für die Live-Prüfung im Editor nicht nötig. */
  includeBinaries?: boolean;
}

export function planExport(project: Project, options: PlanOptions = {}): ExportPlan {
  const includeBinaries = options.includeBinaries ?? true;
  const issues: ProjectIssue[] = [];
  const packFiles = new Map<string, FileContent>();
  const itemFiles = new Map<string, string>();
  const ns = project.namespace;
  const targetVersion = project.settings.minecraftVersion;

  validateProjectSettings(project, issues);
  validateFolders(project, issues);

  const items = getItemsInTreeOrder(project);
  validateItemIds(items, issues);

  /* ------------------------------------------------------------ Rüstungen */
  const armorSets = collectArmorSets(items, issues);
  for (const set of armorSets.values()) {
    const layers: Record<string, Array<{ texture: string }>> = {};
    if (set.layer1) {
      const path = `assets/${ns}/textures/entity/equipment/humanoid/${set.id}.png`;
      addTextureFile(packFiles, path, set.layer1, includeBinaries);
      layers.humanoid = [{ texture: `${ns}:${set.id}` }];
    }
    if (set.layer2) {
      const path = `assets/${ns}/textures/entity/equipment/humanoid_leggings/${set.id}.png`;
      addTextureFile(packFiles, path, set.layer2, includeBinaries);
      layers.humanoid_leggings = [{ texture: `${ns}:${set.id}` }];
    }
    if (Object.keys(layers).length > 0) {
      packFiles.set(`assets/${ns}/equipment/${set.id}.json`, json({ layers }));
    }
  }

  /* ------------------------------------------------------------ Items */
  const plans: ItemPlan[] = [];
  const usedVariations = new Map<string, Item>();
  for (const item of items) {
    const label = `„${item.displayName || item.nexoId}“`;
    const add = (level: IssueLevel, message: string) => issues.push({ level, message: `${label}: ${message}`, itemId: item.id });
    const folderSlugs = getFolderSlugs(project, item.folderId);

    // Modell & Texturen
    let modelKey: string | null = null;
    let modelFile: string | null = null;
    let modelJson: JavaModelJson | null = null;
    if (item.model) {
      const modelPath = modelPathFor(project, item);
      modelKey = `${ns}:${modelPath}`;
      modelFile = `assets/${ns}/models/${modelPath}.json`;
      const textureRefs = new Map<string, string>();
      const usedNames = new Set<string>();
      for (const texture of item.model.textures) {
        let name = slugify(texture.name, 'texture');
        let n = 2;
        while (usedNames.has(name)) name = `${slugify(texture.name, 'texture')}_${n++}`;
        usedNames.add(name);
        const texPath = `${modelPath}/${name}`;
        textureRefs.set(texture.id, `${ns}:${texPath}`);
        for (const issue of validateTexture(texture, 'Textur')) add(issue.level, issue.message);
        if (texture.dataUrl) addTextureFile(packFiles, `assets/${ns}/textures/${texPath}.png`, texture, includeBinaries);
      }
      modelJson = resolveModelTextures(item.model.json, textureRefs);
      validateModel(modelJson, targetVersion, add, new Set(textureRefs.values()));
      packFiles.set(modelFile, json(modelJson));
    } else {
      add('info', 'Kein Modell – das Item nutzt das Aussehen des Basis-Materials.');
    }

    // Konfiguration
    const armorSetId = getArmorSetId(item);
    const armorAssetId = armorSetId && armorSets.get(armorSetId)?.hasTextures ? `${ns}:${armorSetId}` : null;
    const built = buildItemConfig({ project, item, modelKey, armorAssetId });
    if (built.rawYamlError) add('error', `Fehler im zusätzlichen YAML: ${built.rawYamlError}`);
    validateItemConfig(item, built.config, targetVersion, add, usedVariations);
    const keys = recipeKeys(item);
    for (const recipe of item.recipes ?? []) {
      for (const issue of validateRecipe(recipe, project, keys.get(recipe.id) ?? recipe.type)) add(issue.level, issue.message);
    }

    const yamlFile = yamlFileFor(project, item, folderSlugs);
    plans.push({ item, folderSlugs, modelKey, modelFile, modelJson, config: built.config, yamlFile });
  }

  /* ------------------------------------------------------------ Item-Dateien */
  const byFile = new Map<string, ItemPlan[]>();
  for (const plan of plans) {
    const list = byFile.get(plan.yamlFile) ?? [];
    list.push(plan);
    byFile.set(plan.yamlFile, list);
  }
  for (const [file, list] of byFile) {
    const header = `# Erstellt mit NexoBuilder – Projekt "${project.name}"`;
    itemFiles.set(file, itemsToYaml(list.map((p) => ({ id: p.item.nexoId, config: p.config })), header));
  }

  /* ------------------------------------------------------------ Pack-Grunddateien */
  packFiles.set('pack.mcmeta', json(buildPackMcmeta(targetVersion, project.settings.packDescription || project.name)));
  if (project.settings.packIcon) {
    try {
      packFiles.set('pack.png', includeBinaries ? dataUrlToBytes(project.settings.packIcon) : new Uint8Array(0));
    } catch {
      issues.push({ level: 'warning', message: 'Das Pack-Icon konnte nicht gelesen werden und wird ignoriert.' });
    }
  }

  const recipeFiles = buildRecipeFiles(project, items);

  return { items: plans, packFiles, itemFiles, recipeFiles, issues };
}

/* ====================================================================== Dateien & Pfade */

function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

function addTextureFile(files: Map<string, FileContent>, path: string, texture: ModelTexture, includeBinaries: boolean) {
  files.set(path, includeBinaries ? dataUrlToBytes(texture.dataUrl) : new Uint8Array(0));
  if (texture.mcmeta && Object.keys(texture.mcmeta).length > 0) {
    files.set(`${path}.mcmeta`, json(texture.mcmeta));
  }
}

export function yamlFileFor(project: Project, item: Item, folderSlugs: string[]): string {
  const base = ['items'];
  if (project.settings.itemsInProjectFolder) base.push(slugify(project.name, 'nexobuilder'));
  const dir = [...base, ...folderSlugs];
  const fileName = project.settings.yamlFileMode === 'item' ? item.nexoId : folderSlugs[folderSlugs.length - 1] ?? 'items';
  return `${dir.join('/')}/${fileName}.yml`;
}

/** Ersetzt die Textur-Platzhalter im Modell durch die endgültigen Pfade. */
export function resolveModelTextures(model: JavaModelJson, refs: Map<string, string>): JavaModelJson {
  const result = deepClone(model);
  if (result.textures) {
    for (const [key, value] of Object.entries(result.textures)) {
      const id = parseTexturePlaceholder(value);
      if (id) {
        const ref = refs.get(id);
        if (ref) result.textures[key] = ref;
        else delete result.textures[key];
      }
    }
  }
  return result;
}

/* ====================================================================== Rüstungen */

interface ArmorSet {
  id: string;
  layer1?: ModelTexture;
  layer2?: ModelTexture;
  hasTextures: boolean;
  items: Item[];
}

export function getArmorSetId(item: Item): string | null {
  const armor = item.config.$armor;
  if (!isPlainObject(armor)) return null;
  const set = typeof armor.set === 'string' ? armor.set.trim() : '';
  return set || null;
}

function resolveAsset(item: Item, value: unknown): ModelTexture | undefined {
  if (typeof value !== 'string' || !value.startsWith(ASSET_TOKEN_PREFIX)) return undefined;
  return item.assets?.[value.slice(ASSET_TOKEN_PREFIX.length)];
}

function collectArmorSets(items: Item[], issues: ProjectIssue[]): Map<string, ArmorSet> {
  const sets = new Map<string, ArmorSet>();
  for (const item of items) {
    const armor = item.config.$armor;
    if (armor === undefined) continue;
    const label = `„${item.displayName || item.nexoId}“`;
    const setId = getArmorSetId(item);
    if (!setId) {
      issues.push({ level: 'error', message: `${label}: Für die Rüstungs-Textur fehlt die Set-ID.`, itemId: item.id });
      continue;
    }
    if (!/^[a-z0-9_.-]+$/.test(setId)) {
      issues.push({
        level: 'error',
        message: `${label}: Die Set-ID „${setId}“ darf nur Kleinbuchstaben, Zahlen, _ . - enthalten.`,
        itemId: item.id,
      });
      continue;
    }
    const set = sets.get(setId) ?? { id: setId, hasTextures: false, items: [] };
    set.items.push(item);
    const a = armor as Record<string, unknown>;
    for (const layer of ['layer1', 'layer2'] as const) {
      const tex = resolveAsset(item, a[layer]);
      if (!tex) continue;
      for (const issue of validateTexture(tex, `${label} Rüstungs-${layer}`)) {
        issues.push({ ...issue, itemId: item.id });
      }
      if (tex.width && tex.height && tex.width !== tex.height * 2) {
        issues.push({
          level: 'warning',
          message: `${label}: Die Rüstungs-Textur ${layer} sollte doppelt so breit wie hoch sein (z.B. 64×32), ist aber ${tex.width}×${tex.height}.`,
          itemId: item.id,
        });
      }
      const existing = set[layer];
      if (existing && existing.dataUrl !== tex.dataUrl) {
        issues.push({
          level: 'warning',
          message: `${label}: Für das Rüstungsset „${setId}“ wurde ${layer} mehrfach mit unterschiedlichen Texturen hochgeladen. Es wird die erste verwendet.`,
          itemId: item.id,
        });
      } else if (!existing && tex.dataUrl) {
        set[layer] = tex;
      }
    }
    set.hasTextures = !!(set.layer1 || set.layer2);
    sets.set(setId, set);
  }
  for (const set of sets.values()) {
    if (!set.hasTextures) {
      for (const item of set.items) {
        issues.push({
          level: 'error',
          message: `„${item.displayName || item.nexoId}“: Für das Rüstungsset „${set.id}“ wurde bei keinem Item eine Layer-Textur hochgeladen.`,
          itemId: item.id,
        });
      }
    }
  }
  return sets;
}

/* ====================================================================== Prüfungen */

function validateProjectSettings(project: Project, issues: ProjectIssue[]) {
  if (!NAMESPACE_PATTERN.test(project.namespace)) {
    issues.push({ level: 'error', message: `Der Namespace „${project.namespace}“ darf nur Kleinbuchstaben, Zahlen sowie _ . - enthalten.` });
  } else if (project.namespace === 'minecraft') {
    issues.push({ level: 'error', message: 'Der Namespace „minecraft“ würde Vanilla-Dateien überschreiben. Bitte einen eigenen Namespace wählen.' });
  } else if (project.namespace === 'nexo') {
    issues.push({
      level: 'warning',
      message: 'Der Namespace „nexo“ wird auch von Nexo selbst verwendet. Ein eigener Namespace vermeidet Konflikte.',
    });
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(project.settings.packName)) {
    issues.push({ level: 'error', message: `Der Pack-Name „${project.settings.packName}“ darf nur Buchstaben, Zahlen sowie _ . - enthalten.` });
  }
  if (project.settings.packIcon && !project.settings.packIcon.startsWith('data:image/png')) {
    issues.push({ level: 'warning', message: 'Das Pack-Icon muss eine PNG-Datei sein.' });
  }
}

function validateFolders(project: Project, issues: ProjectIssue[]) {
  const checkSiblings = (ids: string[]) => {
    const seen = new Map<string, string>();
    for (const id of ids) {
      const folder = project.folders[id];
      if (!folder) continue;
      const slug = slugify(folder.name, 'ordner');
      const other = seen.get(slug);
      if (other) {
        issues.push({
          level: 'error',
          message: `Die Ordner „${project.folders[other].name}“ und „${folder.name}“ ergeben denselben Ordnernamen „${slug}“. Bitte einen umbenennen.`,
          folderId: id,
        });
      } else {
        seen.set(slug, id);
      }
      checkSiblings(folder.folderIds);
    }
  };
  checkSiblings(project.rootFolderIds);
  for (const folder of Object.values(project.folders)) {
    if (folder.itemIds.length === 0 && folder.folderIds.length === 0) {
      issues.push({ level: 'info', message: `Der Ordner „${folder.name}“ ist leer und wird nicht exportiert.`, folderId: folder.id });
    }
  }
}

function validateItemIds(items: Item[], issues: ProjectIssue[]) {
  const seen = new Map<string, Item>();
  for (const item of items) {
    const label = `„${item.displayName || item.nexoId}“`;
    if (!item.nexoId) {
      issues.push({ level: 'error', message: `${label}: Die Item-ID fehlt.`, itemId: item.id });
    } else if (!ITEM_ID_PATTERN.test(item.nexoId)) {
      issues.push({
        level: 'error',
        message: `${label}: Die Item-ID „${item.nexoId}“ darf nur Kleinbuchstaben, Zahlen und _ enthalten.`,
        itemId: item.id,
      });
    }
    const other = seen.get(item.nexoId);
    if (other) {
      issues.push({
        level: 'error',
        message: `${label}: Die Item-ID „${item.nexoId}“ wird bereits von „${other.displayName || other.nexoId}“ verwendet. Nexo-IDs müssen eindeutig sein.`,
        itemId: item.id,
      });
    } else {
      seen.set(item.nexoId, item);
    }
  }
}

function validateModel(
  model: JavaModelJson,
  targetVersion: string,
  add: (l: IssueLevel, m: string) => void,
  ownRefs: Set<string>,
) {
  const analysis: Issue[] = [];
  const requires = analyseElements(model, analysis);
  for (const issue of analysis) add(issue.level, issue.message);
  if (requires && compareVersions(requires, targetVersion) > 0) {
    add(
      'error',
      `Das Modell benötigt mindestens Minecraft ${requires} (z.B. wegen freier Rotationen), das Projekt ist aber auf ${getMcVersion(targetVersion).label} eingestellt.`,
    );
  }
  for (const [key, value] of Object.entries(model.textures ?? {})) {
    if (typeof value !== 'string') continue;
    if (value.startsWith('#')) {
      const target = value.slice(1);
      if (target !== 'missing' && model.textures?.[target] === undefined && !model.parent) {
        add('warning', `Textur „${key}“ verweist auf „${value}“, das im Modell nicht definiert ist.`);
      }
    } else if (!isVanillaReference(value) && !ownRefs.has(value)) {
      // Fremde Referenzen müssen von einem anderen Pack bereitgestellt werden
      add('warning', `Textur „${key}“ verweist auf „${value}“, das nicht in diesem Pack enthalten ist.`);
    }
  }
  const usedKeys = new Set<string>();
  for (const el of model.elements ?? []) {
    for (const face of Object.values(el.faces ?? {})) {
      if (face?.texture?.startsWith('#')) usedKeys.add(face.texture.slice(1));
    }
  }
  for (const key of usedKeys) {
    if (key !== 'missing' && model.textures?.[key] === undefined && !model.parent) {
      add('warning', `Flächen verwenden die Textur „#${key}“, die nicht definiert ist (wird lila/schwarz angezeigt).`);
    }
  }
}

function validateItemConfig(
  item: Item,
  config: Record<string, unknown>,
  targetVersion: string,
  add: (l: IssueLevel, m: string) => void,
  usedVariations: Map<string, Item>,
) {
  const material = config.material;
  if (typeof material !== 'string' || !/^[A-Z0-9_]+$/.test(material)) {
    add('error', `Das Material „${String(material)}“ ist ungültig (nur GROSSBUCHSTABEN, Zahlen und _).`);
  }
  const cfg = item.config as ConfigObject;
  for (const def of PROPERTIES) {
    const value = getPath(cfg, def.path);
    if (value === undefined) continue;
    if (def.minVersion && compareVersions(targetVersion, def.minVersion) < 0) {
      add('warning', `„${def.label}“ benötigt Minecraft ${def.minVersion} oder neuer und wird auf ${targetVersion} ignoriert.`);
    }
    if (def.maxVersion && compareVersions(targetVersion, def.maxVersion) > 0) {
      add('warning', `„${def.label}“ gibt es ab Minecraft ${def.maxVersion} nicht mehr.`);
    }
    for (const conflict of def.conflicts ?? []) {
      const other = PROPERTIES.find((p) => p.id === conflict);
      if (other && getPath(cfg, other.path) !== undefined && def.id < other.id) {
        add('error', `„${def.label}“ und „${other.label}“ können nicht gleichzeitig verwendet werden.`);
      }
    }
    for (const message of validateFieldValues(value, def.field, def.label)) add('warning', message);
  }

  const block = getPath(cfg, ['Mechanics', 'custom_block']);
  if (isPlainObject(block)) {
    const type = typeof block.type === 'string' ? block.type : '';
    if (!type) add('error', 'Beim eigenen Block fehlt der Block-Typ.');
    const variation = block.custom_variation;
    if (typeof variation === 'number' && type in BLOCK_VARIATION_LIMITS) {
      const max = BLOCK_VARIATION_LIMITS[type];
      if (variation < 1 || variation > max) add('error', `Die Variation ${variation} liegt außerhalb von 1–${max} für ${type}.`);
      const key = `${type}:${variation}`;
      const other = usedVariations.get(key);
      if (other) {
        add('error', `Die Variation ${variation} (${type}) wird bereits von „${other.displayName || other.nexoId}“ verwendet.`);
      } else {
        usedVariations.set(key, item);
      }
    }
    if (!item.model && (block.model === undefined || block.model === '@model')) {
      add('warning', 'Der Block hat kein Modell. Bitte ein Modell importieren oder im Feld „Modell“ einen Pfad angeben.');
    }
  }

  const components = config.Components;
  if (isPlainObject(components)) {
    const stack = components.max_stack_size;
    if (typeof stack === 'number' && components.max_damage !== undefined && stack > 1) {
      add('error', 'Items mit Haltbarkeit (max_damage) dürfen nicht stapelbar sein – bitte die Stapelgröße auf 1 setzen.');
    }
  }
}

/** Prüft Formate (Dauer, Vektor, Farbe …) innerhalb eines Werts rekursiv. */
function validateFieldValues(value: unknown, field: Field, label: string): string[] {
  const messages: string[] = [];
  const visit = (v: unknown, f: Field, path: string) => {
    if (v === undefined || v === null) return;
    switch (f.type) {
      case 'text': {
        if (typeof v === 'string') {
          const error = validateTextFormat(f.format, v);
          if (error) messages.push(`${path}: ${error} (aktuell „${v}“).`);
        }
        break;
      }
      case 'number':
        if (typeof v === 'number') {
          if (f.min !== undefined && v < f.min) messages.push(`${path}: Der Wert ${v} ist kleiner als ${f.min}.`);
          if (f.max !== undefined && v > f.max) messages.push(`${path}: Der Wert ${v} ist größer als ${f.max}.`);
          if (f.integer && !Number.isInteger(v)) messages.push(`${path}: Es wird eine ganze Zahl erwartet.`);
        }
        break;
      case 'object':
        if (isPlainObject(v)) {
          for (const child of f.fields) {
            if (child.key === '*') continue;
            visit(v[child.key], child, `${path} → ${child.label}`);
          }
        }
        break;
      case 'objectList':
        if (Array.isArray(v)) {
          v.forEach((entry, i) => {
            for (const child of f.fields) {
              if (isPlainObject(entry)) visit(entry[child.key], child, `${path} #${i + 1} → ${child.label}`);
            }
          });
        }
        break;
      case 'map':
        if (isPlainObject(v)) {
          for (const [k, entry] of Object.entries(v)) {
            if (f.reservedKeys?.includes(k)) continue;
            visit(entry, f.value, `${path} → ${k}`);
          }
        }
        break;
      default:
        break;
    }
  };
  visit(value, field, label);
  return messages;
}

export function countIssues(issues: ProjectIssue[]): Record<IssueLevel, number> {
  return {
    error: issues.filter((i) => i.level === 'error').length,
    warning: issues.filter((i) => i.level === 'warning').length,
    info: issues.filter((i) => i.level === 'info').length,
  };
}

export function issuesForItem(issues: ProjectIssue[], itemId: string): ProjectIssue[] {
  return issues.filter((i) => i.itemId === itemId);
}

export function folderLabel(project: Project, folderId: string): string {
  return getFolderChain(project, folderId)
    .map((f) => f.name)
    .join(' / ');
}
