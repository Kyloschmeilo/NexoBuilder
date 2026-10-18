/**
 * The settings of the open item for the command palette: every property of the groups the item editor shows, with
 * its group, YAML key and search aliases, so "hardness" or "stack size" finds the setting. Picking one goes to its
 * section and opens it; a setting the item does not use yet is added first.
 */
import {
  type FormSchema,
  isPropertyActive,
  propertyConflict,
  type PropertyDef,
  type PropertyGroup,
  propertyYamlPath,
} from '@resourcepackbuilder/core/form';
import { versionSupport } from '@resourcepackbuilder/minecraft';
import type { Item } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { addProperty } from '../../commands/items';
import { setEditorSection } from '../../store/ui';
import { scrollToFeature, setFeatureOpen } from './properties/featureFocus';
import { FEATURE_EXCLUDE, FEATURE_GROUPS } from './sections/featureGroups';
import { featureGroupNavId } from './sections';

/** A setting of the open item as the palette lists it. */
export interface PaletteSetting {
  def: PropertyDef;
  group: PropertyGroup;
  /** Nav id of the section that edits it. */
  navId: string;
  yamlKey: string;
  /** Whether the item already uses it (then picking it jumps there). */
  added: boolean;
  /** How the project's Minecraft version supports it (`tooOld`: too new for it, `removed`: gone in it). */
  support: VersionSupport;
}

/** CraftEngine's block settings, edited in the Block section. */
const BLOCK_SETTINGS_GROUP = 'blockSettings';

/** The sections outside Features that edit a property group of the item. */
const OTHER_GROUP_SECTIONS: Readonly<Record<PropertyGroup, string>> = {
  general: 'basics',
  model: 'model',
  [BLOCK_SETTINGS_GROUP]: 'block',
};

/** What `versionSupport` says about a property in the project's version. */
type VersionSupport = ReturnType<typeof versionSupport>;

/**
 * Every setting of the item editor's groups, in form order. Settings that conflict with one the item uses are left
 * out (they cannot be added); `version` is the project's Minecraft version.
 */
export function paletteSettings(schema: FormSchema, item: Item, version: string): PaletteSetting[] {
  const featureGroups = FEATURE_GROUPS[schema.target];
  const exclude = FEATURE_EXCLUDE[schema.target];
  return schema.properties.flatMap((def): PaletteSetting[] => {
    const navId = featureGroups.includes(def.group) ? featureGroupNavId(def.group) : OTHER_GROUP_SECTIONS[def.group];
    if (!navId || exclude[def.group]?.includes(def.id)) return [];
    // Block settings only exist on an item that places a block
    if (def.group === BLOCK_SETTINGS_GROUP && !isPlainObject(item.config.block)) return [];
    const added = isPropertyActive(item, def);
    if (!added && propertyConflict(schema, item, def)) return [];
    return [{ def, group: def.group, navId, yamlKey: propertyYamlPath(def) ?? def.id, added, support: versionSupport(version, def) }];
  });
}

/** Goes to the setting's section and opens its row, adding the setting to the item first when it is not used yet. */
export function openPaletteSetting(itemId: string, setting: PaletteSetting): void {
  if (!setting.added) addProperty(itemId, setting.def.id);
  setEditorSection(setting.navId);
  setFeatureOpen(itemId, setting.def.id, true);
  scrollToFeature(setting.def.id);
}
