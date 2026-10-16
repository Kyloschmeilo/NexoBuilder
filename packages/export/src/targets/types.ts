/**
 * The seam between the shared export (models, textures, armor, the pack) and a pack target
 * (Nexo, CraftEngine): the target builds the item configs and every file of its plugin folder.
 */
import type { Issue, IssueCode } from '@resourcepackbuilder/utils';
import type { Item, ItemArmor, MediaKind, PackTargetId, Project } from '@resourcepackbuilder/core/project';
import type { PackWriter } from '../packWriter';
import type { MultiExportPlan } from '../selection';
import type { ExportPlan, ItemExport, ItemPlan, ItemSections, WrittenModel } from '../types';

/** What the shared steps and the target wrote for an item; the target builds its config from it. */
export interface WrittenItemModels {
  /** Key of the main model (null = the item has none) */
  mainKey: string | null;
}

/** State that the items of one export share. */
export interface ItemShared {
  armor: ItemArmor | null;
  /** Custom block variations already used by earlier items ("TYPE:variation" → item) */
  usedVariations: Map<string, Item>;
}

/** An item's config and the further entries it adds to its YAML file. */
export interface BuiltItem {
  config: Record<string, unknown>;
  sections?: ItemSections;
}

/** What a target adds to the plan besides the items. */
export type TargetPluginFiles = Pick<ExportPlan, 'pluginFiles' | 'nexo'>;

/** Which item IDs a target accepts and the code it reports for any other. */
export interface ItemIdRule {
  pattern: RegExp;
  invalidCode: IssueCode;
}

/**
 * A pack target. `W` is what its `writeModels` returns: only the same target's `buildItem` reads it, so each target
 * passes its own details (Nexo's Pack.<slot> keys, CraftEngine's `models:` list) without the plan knowing them.
 */
export interface PackTarget<W extends WrittenItemModels = WrittenItemModels> {
  id: PackTargetId;
  itemIds: ItemIdRule;
  /** File (relative to `layout.pluginDir`) that holds the config of `item` in the folder `folderSlugs`. */
  itemFile(project: Project, folderSlugs: string[], item: Item): string;
  /** Writes the item's further models (variants, item model definitions) after its main model `main`. */
  writeModels(itemExport: ItemExport, main: WrittenModel | null): W;
  /** Builds the item's config from the written models and checks it; reports through itemExport. */
  buildItem(itemExport: ItemExport, written: W, shared: ItemShared): BuiltItem;
  /** Item key in the YAML: Nexo `itemId`, CraftEngine `<namespace>:<itemId>`. */
  yamlKey(project: Project, item: Item): string;
  /** The planned item as it appears in its YAML file (the live preview of the editor). */
  itemYaml(plan: ItemPlan): string;
  /** Every plugin-side file (item YAML, recipes, media …) relative to `layout.pluginDir`; writes media into the pack. */
  planPluginFiles(project: Project, plans: ItemPlan[], writer: PackWriter, issues: Issue[]): TargetPluginFiles;
  layout: TargetLayout;
}

export interface TargetLayout {
  /** The plugin folder on a server, e.g. 'plugins/Nexo' */
  pluginDir: string;
  /** Short name of the plugin in file names, e.g. 'nexo' */
  fileTag: string;
  /** Whether the resource pack of `project` goes into the plugin folder as a ZIP file */
  packAsZip(project: Project): boolean;
  /** Where the resource pack goes inside pluginDir (Nexo: pack/external_packs/<name>[/|.zip]; CE: resources/<pack>/resourcepack/) */
  packLocation(project: Project, asZip: boolean): string;
  /**
   * The install guide of the projects of this target in a full export; `rootFiles` are the files shared by all
   * projects of the archive. `guide.prefixed` = the archive holds several plugin folders and is extracted into the
   * server folder.
   */
  installGuide(multi: MultiExportPlan, rootFiles: Map<string, string>, guide: InstallGuideOptions): string;
  /** Reloads the plugin's configuration and rebuilds the resource pack */
  reloadCommand: string;
  /** The config file (relative to pluginDir) that holds the project's entries of `kind` (Nexo: glyphs/<project>.yml, sounds.yml …) */
  mediaFile(project: Project, kind: MediaKind): string;
}

export interface InstallGuideOptions {
  /** The archive holds the plugin folders themselves (plugins/Nexo/…, plugins/CraftEngine/…) */
  prefixed: boolean;
}
