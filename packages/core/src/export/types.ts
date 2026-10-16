/** Types of the export plan. */
import type { Issue, IssueContext, IssueLevel, MessageArgs } from '@resourcepackbuilder/utils';
import type { ImportedModel, JavaModelJson } from '@resourcepackbuilder/minecraft';
import type { Item, Project } from '../project/types';
import type { PackWriter } from './packWriter';

export type ExportMode = 'full' | 'pack' | 'items';

export type FileContent = string | Uint8Array;

export interface PlanOptions {
  /** Decode binary files (textures). Not needed for the live check in the editor. */
  includeBinaries?: boolean;
}

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
  /** Files relative to the root directory of the resource pack */
  packFiles: Map<string, FileContent>;
  /** Files relative to the Nexo plugin folder (items/…) */
  itemFiles: Map<string, string>;
  /** Recipe files relative to the Nexo plugin folder (recipes/<type>/…) */
  recipeFiles: Map<string, string>;
  /** Glyph files relative to the Nexo plugin folder (glyphs/…) */
  glyphFiles: Map<string, string>;
  /** Entries for plugins/Nexo/sounds.yml */
  soundEntries: Array<Record<string, unknown>>;
  /** Entries for plugins/Nexo/paintings.yml (key = namespace:id) */
  paintingEntries: Record<string, Record<string, unknown>>;
  issues: Issue[];
}

export interface WrittenModel {
  /** Model reference, e.g. "ns:item/weapons/ruby_sword" */
  key: string;
  /** Path in the pack */
  file: string;
  json: JavaModelJson;
}

/** Everything the export steps of one item share. */
export interface ItemExport {
  project: Project;
  item: Item;
  writer: PackWriter;
  /** Path of the main model, e.g. "item/weapons/ruby_sword" */
  modelPath: string;
  folderSlugs: string[];
  /** Reports an issue about the item; `context` frames are shown after the item's name. */
  report(level: IssueLevel, code: string, args?: MessageArgs, context?: IssueContext[]): void;
  /** Reports an issue of a shared check (texture, model, recipe) in the context of the item. */
  reportIn(issue: Issue, context?: IssueContext[]): void;
  /** Writes a model and its textures; `frame` names it in issues (null = the main model). */
  writeModel(model: ImportedModel, modelPath: string, frame: IssueContext | null): WrittenModel;
}
