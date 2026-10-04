/**
 * Baut aus einem Item das endgültige Nexo-YAML-Objekt:
 *  1. strukturierte Konfiguration bereinigen (leere Felder entfernen, Platzhalter auflösen)
 *  2. automatische Werte ergänzen (itemname, material, Pack.model, Components.item_model)
 *  3. zusätzliches YAML des Nutzers darüberlegen
 */
import type { ConfigObject, ConfigValue, Item, Project } from '../types';
import { deepClone, deepMerge, isPlainObject } from '../util';
import type { Field } from './fields';
import { getPath, setPath } from './configPath';
import { MODEL_TOKEN, PROPERTIES, type PropertyDef } from './schema';
import { parseYaml } from './yaml';

/** Reihenfolge der Schlüssel im YAML (wie in der Nexo-Doku) */
const TOP_LEVEL_ORDER = [
  'itemname',
  'material',
  'template',
  'templates',
  'lore',
  'color',
  'unbreakable',
  'excludeFromInventory',
  'Pack',
  'Components',
  'AttributeModifiers',
  'Enchantments',
  'ItemFlags',
  'PersistentData',
  'CustomArmor',
  'Mechanics',
];

/** Interne Schlüssel von NexoBuilder beginnen mit "$" und werden nie exportiert. */
export function isInternalKey(key: string): boolean {
  return key.startsWith('$');
}

export interface BuildContext {
  project: Project;
  item: Item;
  /** "namespace:pfad" des Modells oder null, wenn das Item kein Modell hat */
  modelKey: string | null;
  /** Equipment-Asset für Rüstungen (namespace:set) */
  armorAssetId?: string | null;
}

export interface BuildResult {
  config: Record<string, unknown>;
  rawYamlError: string | null;
}

export function buildItemConfig(ctx: BuildContext): BuildResult {
  const { item, project, modelKey } = ctx;
  const source = deepClone(item.config);

  // 1. Eigenschaften gemäß Schema bereinigen
  const cleaned: Record<string, unknown> = {};
  const handledRoots = new Set<string>();
  for (const def of PROPERTIES) {
    const value = getPath(source, def.path);
    if (value === undefined) continue;
    handledRoots.add(def.path.join('.'));
    if (isInternalKey(def.path[0])) continue;
    let pruned = pruneByField(value, def.field);
    if (pruned === undefined && def.keepEmpty && isPlainObject(value)) pruned = {};
    if (pruned !== undefined) setPath(cleaned as ConfigObject, def.path, pruned as ConfigValue);
  }
  // Werte, die zu keiner bekannten Eigenschaft gehören, unverändert übernehmen
  copyUnknown(source, cleaned, [], handledRoots);

  // 2. Platzhalter auflösen
  const resolved = resolveTokens(cleaned, modelKey) as Record<string, unknown>;

  // 3. Automatische Werte
  const result: Record<string, unknown> = {};
  const name = item.displayName.trim();
  if (name) result.itemname = name;
  const material = typeof source.material === 'string' && source.material.trim() ? source.material.trim() : 'PAPER';
  result.material = material;
  delete resolved.material;
  delete resolved.itemname;

  if (modelKey) {
    const pack = isPlainObject(resolved.Pack) ? resolved.Pack : {};
    resolved.Pack = { model: modelKey, ...pack };
    const usesCmd = isPlainObject(resolved.Pack) && resolved.Pack.custom_model_data !== undefined;
    if (project.settings.useItemModel && !usesCmd) {
      const components = isPlainObject(resolved.Components) ? resolved.Components : {};
      if (components.item_model === undefined) {
        resolved.Components = { item_model: `nexo:${item.nexoId}`, ...components };
      }
    }
  }
  if (ctx.armorAssetId) {
    const components = isPlainObject(resolved.Components) ? resolved.Components : {};
    const equippable = isPlainObject(components.equippable) ? components.equippable : {};
    resolved.Components = {
      ...components,
      equippable: {
        slot: equippable.slot ?? slotForMaterial(material) ?? 'HEAD',
        asset_id: equippable.asset_id ?? ctx.armorAssetId,
        ...equippable,
      },
    };
  }

  for (const key of TOP_LEVEL_ORDER) {
    if (resolved[key] !== undefined && result[key] === undefined) result[key] = resolved[key];
  }
  for (const [key, value] of Object.entries(resolved)) {
    if (result[key] === undefined && !isInternalKey(key)) result[key] = value;
  }

  // 4. Eigenes YAML darüberlegen
  let rawYamlError: string | null = null;
  if (item.rawYaml.trim()) {
    const parsed = parseYaml(item.rawYaml);
    if (parsed.error) {
      rawYamlError = parsed.error;
    } else if (parsed.value !== null && !isPlainObject(parsed.value)) {
      rawYamlError = 'Das zusätzliche YAML muss aus Schlüssel-Wert-Paaren bestehen (z.B. "Mechanics: ...").';
    } else if (isPlainObject(parsed.value)) {
      return { config: deepMerge(result, parsed.value), rawYamlError: null };
    }
  }
  return { config: result, rawYamlError };
}

/** Ermittelt den Ausrüstungs-Slot anhand des Materials. */
export function slotForMaterial(material: string): string | null {
  const m = material.toUpperCase();
  if (m.endsWith('_HELMET') || m === 'CARVED_PUMPKIN' || m.endsWith('_HEAD') || m.endsWith('_SKULL')) return 'HEAD';
  if (m.endsWith('_CHESTPLATE') || m === 'ELYTRA') return 'CHEST';
  if (m.endsWith('_LEGGINGS')) return 'LEGS';
  if (m.endsWith('_BOOTS')) return 'FEET';
  if (m.endsWith('_HORSE_ARMOR') || m === 'WOLF_ARMOR') return 'BODY';
  return null;
}

function copyUnknown(source: Record<string, unknown>, target: Record<string, unknown>, path: string[], handled: Set<string>) {
  for (const [key, value] of Object.entries(source)) {
    if (isInternalKey(key)) continue;
    const full = [...path, key];
    const id = full.join('.');
    if (handled.has(id)) continue;
    const isPrefixOfHandled = [...handled].some((h) => h.startsWith(id + '.'));
    if (isPrefixOfHandled && isPlainObject(value)) {
      const nested = isPlainObject(target[key]) ? (target[key] as Record<string, unknown>) : {};
      copyUnknown(value, nested, full, handled);
      if (Object.keys(nested).length > 0) target[key] = nested;
      continue;
    }
    const pruned = pruneGeneric(value);
    if (pruned !== undefined) target[key] = pruned;
  }
}

function resolveTokens(value: unknown, modelKey: string | null): unknown {
  if (value === MODEL_TOKEN) return modelKey ?? undefined;
  if (Array.isArray(value)) return value.map((v) => resolveTokens(v, modelKey)).filter((v) => v !== undefined);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = resolveTokens(v, modelKey);
      if (r !== undefined) out[k] = r;
    }
    return out;
  }
  return value;
}

/* ====================================================================== Bereinigung */

function isEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim() === '';
}

/** Entfernt leere Werte gemäß der Feldbeschreibung. Gibt undefined zurück, wenn nichts übrig bleibt. */
export function pruneByField(value: unknown, field: Field): unknown {
  if (value === undefined || value === null) return undefined;
  switch (field.type) {
    case 'text':
      if (typeof value === 'string') return isEmptyString(value) ? undefined : value;
      return pruneGeneric(value);
    case 'number':
      if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
      if (typeof value === 'string') return isEmptyString(value) ? undefined : value;
      return undefined;
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    case 'select':
      return typeof value === 'string' && isEmptyString(value) ? undefined : value;
    case 'stringList': {
      const list = Array.isArray(value) ? value : [value];
      const strings = list.filter((v) => v !== undefined && v !== null).map((v) => (typeof v === 'string' ? v : String(v)));
      if (strings.every((s) => isEmptyString(s))) return undefined;
      const keepBlankLines = field.format === 'minimessage';
      const cleaned = keepBlankLines ? trimTrailingEmpty(strings) : strings.filter((s) => !isEmptyString(s));
      if (field.singleAsString && cleaned.length === 1) return cleaned[0];
      return cleaned;
    }
    case 'multiSelect': {
      const list = Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v) : [];
      return list.length > 0 ? list : undefined;
    }
    case 'presence':
      return isPlainObject(value) || value === true ? {} : undefined;
    case 'yaml':
      return value;
    case 'texture':
      return typeof value === 'string' && value ? value : undefined;
    case 'object': {
      if (!isPlainObject(value)) return undefined;
      const out: Record<string, unknown> = {};
      const known = new Set(field.fields.map((f) => f.key));
      for (const child of field.fields) {
        if (child.key === '*') {
          // "alle übrigen Schlüssel" (z.B. Effekte in armor_effects)
          const rest: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(value)) if (!known.has(k)) rest[k] = v;
          const prunedRest = pruneByField(rest, child);
          if (isPlainObject(prunedRest)) Object.assign(out, prunedRest);
          continue;
        }
        const pruned = pruneByField(value[child.key], child);
        if (pruned !== undefined) out[child.key] = pruned;
      }
      for (const [k, v] of Object.entries(value)) {
        if (known.has(k) || known.has('*') || isInternalKey(k)) continue;
        const pruned = pruneGeneric(v);
        if (pruned !== undefined) out[k] = pruned;
      }
      if (Object.keys(out).length === 0) return field.emptyValue === true ? true : undefined;
      return out;
    }
    case 'objectList': {
      if (!Array.isArray(value)) return undefined;
      const objectField: Field = { type: 'object', key: '', label: '', fields: field.fields };
      const list = value.map((v) => pruneByField(v, objectField)).filter((v) => v !== undefined);
      return list.length > 0 ? list : undefined;
    }
    case 'map': {
      if (!isPlainObject(value)) return undefined;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (!k.trim() || field.reservedKeys?.includes(k)) continue;
        let pruned = pruneByField(v, field.value);
        // Ein Effekt ohne weitere Angaben ist trotzdem gewollt → leeres Objekt behalten
        if (pruned === undefined && isPlainObject(v)) pruned = {};
        if (pruned !== undefined) out[k] = pruned;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    }
  }
}

function trimTrailingEmpty(list: string[]): string[] {
  const out = [...list];
  while (out.length > 0 && isEmptyString(out[out.length - 1])) out.pop();
  return out;
}

/** Bereinigung für Werte ohne Schema: leere Strings/Listen/Objekte entfernen. */
export function pruneGeneric(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return isEmptyString(value) ? undefined : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    const list = value.map(pruneGeneric).filter((v) => v !== undefined);
    return list.length > 0 ? list : undefined;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (isInternalKey(k)) continue;
      const pruned = pruneGeneric(v);
      if (pruned !== undefined) out[k] = pruned;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return value;
}

/** Findet die Eigenschafts-Definition zu einem Pfad. */
export function findProperty(path: string[]): PropertyDef | undefined {
  const id = path.join('.');
  return PROPERTIES.find((p) => p.path.join('.') === id);
}
