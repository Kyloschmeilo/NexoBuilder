/**
 * Worldgen features of a CraftEngine pack: configured features (`configured_features`: what a tree, ore or flower
 * looks like, a vanilla feature in YAML that may name custom blocks) and placed features (`placed_features`: where
 * and how often one generates). CraftEngine reads both sections (BukkitWorldManager), each entry under its id; a
 * placed feature's `feature` names a configured feature or holds one inline, its `placement` lists vanilla placement
 * modifiers, and its `world`, `dimension`, `dimension_type` and `biome` lists limit where it runs (`biome` only with
 * a `minecraft:biome` modifier in `placement`). Saplings grow configured features, grass blocks placed features.
 *
 * The project keeps both as lists (`configuredFeatures`, `placedFeatures` of `Project.craftEngine`), each entry with
 * its `id`; the feature bodies are YAML, as the wiki suggests writing them with a datapack generator.
 */
import { compareVersions, FEATURE_VERSIONS } from '@resourcepackbuilder/minecraft';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, resolveFields } from '../form/build';
import type { ObjectListField } from '../form/fields';
import { type Option, plainOptions } from '../form/options';
import type { ConfigObject, Project } from '../project/types';
import { entrySection, keyedEntries } from './projectEntries';

/** Feature types of the configured features: CraftEngine's own and the common vanilla ones (any other can be typed in) */
export const CE_FEATURE_TYPES = plainOptions([
  'minecraft:tree',
  'minecraft:ore',
  'minecraft:scattered_ore',
  'minecraft:simple_block',
  'craftengine:simple_block',
  'minecraft:random_patch',
  'minecraft:flower',
  'minecraft:no_bonemeal_flower',
  'minecraft:block_column',
  'minecraft:disk',
  'minecraft:block_pile',
  'minecraft:vegetation_patch',
  'minecraft:waterlogged_vegetation_patch',
  'minecraft:geode',
  'minecraft:huge_brown_mushroom',
  'minecraft:huge_red_mushroom',
  'minecraft:random_selector',
  'minecraft:simple_random_selector',
  'minecraft:random_boolean_selector',
]);

/** The vanilla dimensions (and dimension types) */
export const CE_DIMENSIONS = plainOptions(['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end']);

/** Common vanilla biomes for a placed feature's `biome` (any other can be typed in) */
export const CE_BIOMES = plainOptions(
  [
    'badlands',
    'bamboo_jungle',
    'beach',
    'birch_forest',
    'cherry_grove',
    'dark_forest',
    'deep_dark',
    'desert',
    'dripstone_caves',
    'eroded_badlands',
    'flower_forest',
    'forest',
    'frozen_peaks',
    'grove',
    'jagged_peaks',
    'jungle',
    'lush_caves',
    'mangrove_swamp',
    'meadow',
    'mushroom_fields',
    'ocean',
    'old_growth_birch_forest',
    'old_growth_pine_taiga',
    'old_growth_spruce_taiga',
    'pale_garden',
    'plains',
    'river',
    'savanna',
    'snowy_plains',
    'snowy_slopes',
    'snowy_taiga',
    'sparse_jungle',
    'stony_peaks',
    'stony_shore',
    'sunflower_plains',
    'swamp',
    'taiga',
    'warm_ocean',
    'windswept_hills',
    'wooded_badlands',
  ].map((biome) => `minecraft:${biome}`),
);

/** The project's configured features (an empty list for a project without any). */
export const projectConfiguredFeatures = (project: Pick<Project, 'craftEngine'>): ConfigObject[] =>
  project.craftEngine?.configuredFeatures ?? [];

/** The project's placed features (an empty list for a project without any). */
export const projectPlacedFeatures = (project: Pick<Project, 'craftEngine'>): ConfigObject[] => project.craftEngine?.placedFeatures ?? [];

/** A new configured feature: a simple block to fill in */
export const newConfiguredFeature = (): ConfigObject => ({
  id: '',
  type: 'craftengine:simple_block',
  config: { to_place: { type: 'craftengine:simple_state_provider', state: { Name: 'minecraft:stone' } } },
});

/** A new placed feature: rare, on the surface, in the overworld */
export const newPlacedFeature = (): ConfigObject => ({
  id: '',
  feature: '',
  placement: [
    { type: 'minecraft:rarity_filter', chance: 16 },
    { type: 'minecraft:in_square' },
    { type: 'minecraft:heightmap', heightmap: 'WORLD_SURFACE' },
  ],
  dimension_type: ['minecraft:overworld'],
});

const [configuredList, placedList] = resolveFields(
  {
    configured_features: field.objectList(
      {
        id: field.text({ placeholder: true, help: true }),
        type: field.select(CE_FEATURE_TYPES, { allowCustom: true, help: true }),
        config: field.yaml({ help: true, placeholder: true }),
      },
      { titleKey: 'id', newItem: newConfiguredFeature },
    ),
    placed_features: field.objectList(
      {
        id: field.text({ placeholder: true, help: true }),
        feature: field.choice(
          {
            reference: {
              field: field.select([], { allowCustom: true, dynamicSuggestions: 'configuredFeatures', placeholder: true }),
              matches: (value) => typeof value === 'string',
              newValue: () => '',
            },
            inline: {
              field: field.yaml({ placeholder: true }),
              matches: (value) => isPlainObject(value),
              newValue: () => ({ type: 'minecraft:simple_block', config: {} }),
            },
          },
          { help: true },
        ),
        placement: field.yaml({ help: true, placeholder: true }),
        world: field.stringList({ placeholder: true, help: true }),
        dimension: field.stringList({ suggestions: CE_DIMENSIONS, help: true }),
        dimension_type: field.stringList({ suggestions: CE_DIMENSIONS, help: true }),
        biome: field.stringList({ suggestions: CE_BIOMES, help: true }),
      },
      { titleKey: 'id', newItem: newPlacedFeature },
    ),
  },
  'craftEngine',
);

/** The project's configured features as the editor edits them (messages at `craftEngine.fields.configuredFeatures`). */
export const CE_CONFIGURED_FEATURE_LIST = configuredList as ObjectListField;

/** The project's placed features as the editor edits them (messages at `craftEngine.fields.placedFeatures`). */
export const CE_PLACED_FEATURE_LIST = placedList as ObjectListField;

/**
 * The `configured_features` and `placed_features` sections. From Minecraft 26.3 on the game reads a feature's
 * config next to its `type` (CraftEngine's own packs write it so for `$$>=26.3`), so the `config` of a configured
 * feature and of an inline feature of a placed feature is written there; before, under `config` as edited.
 */
export function craftEngineWorldgen(project: Project): {
  configured_features: Record<string, ConfigObject>;
  placed_features: Record<string, ConfigObject>;
} {
  const configured = entrySection(project, projectConfiguredFeatures(project), CE_CONFIGURED_FEATURE_LIST);
  const placed = entrySection(project, projectPlacedFeatures(project), CE_PLACED_FEATURE_LIST);
  if (compareVersions(project.settings.minecraftVersion, FEATURE_VERSIONS.inlineFeatureConfig) < 0) {
    return { configured_features: configured, placed_features: placed };
  }
  const inline = (feature: ConfigObject): ConfigObject => {
    const { config, ...rest } = feature;
    return isPlainObject(config) ? { ...rest, ...config } : feature;
  };
  return {
    configured_features: Object.fromEntries(Object.entries(configured).map(([key, feature]) => [key, inline(feature)])),
    placed_features: Object.fromEntries(
      Object.entries(placed).map(([key, entry]) => [
        key,
        isPlainObject(entry.feature) ? { ...entry, feature: inline(entry.feature) } : entry,
      ]),
    ),
  };
}

/** Whether a placement list has the `minecraft:biome` modifier a `biome` filter needs. */
export function hasBiomeModifier(placement: unknown): boolean {
  return (
    Array.isArray(placement) &&
    placement.some((modifier) => isPlainObject(modifier) && (modifier.type === 'minecraft:biome' || modifier.type === 'biome'))
  );
}

/** The project's configured features as suggestions (by key), e.g. for a sapling's `feature`. */
export function projectConfiguredFeatureOptions(project: Project): Option[] {
  return plainOptions([...keyedEntries(project, projectConfiguredFeatures(project)).keys()]);
}

/** The project's placed features as suggestions (by key), e.g. for a grass block's `feature`. */
export function projectPlacedFeatureOptions(project: Project): Option[] {
  return plainOptions([...keyedEntries(project, projectPlacedFeatures(project)).keys()]);
}
