/**
 * The item behaviors of a CraftEngine item as the export writes them: the placement behavior (the kind the user picks
 * for the item's own block or furniture, with its extra keys) followed by the extra behaviors of `behaviors`.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import {
  applyBlockBehavior,
  CE_ITEM_BEHAVIOR_PROPERTIES,
  newCraftEngineBlock,
  newCraftEngineFurniture,
} from '@resourcepackbuilder/core/craftEngine';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const FILE = 'resources/werk/configuration/items/teile/teile.yml';

/** A CraftEngine project with one item per edit, in the folder "Teile". */
function project(...edits: Array<[string, (item: Item) => void]>): Project {
  const result = createProject('Werk', 'werk', '1.21.11', 'craftengine');
  const folder = createFolder('Teile', null);
  insertFolder(result, folder);
  for (const [itemId, edit] of edits) {
    const item = createItem({ displayName: itemId, itemId, folderId: folder.id, material: 'PAPER', model: null });
    edit(item);
    insertItem(result, item);
  }
  return result;
}

const itemOf = (p: Project, id: string) =>
  (parse(pluginText(planExport(p), FILE)) as { items: Record<string, Record<string, unknown>> }).items[`werk:${id}`];
/** The issues of the export, without the missing model the test items all have */
const codes = (p: Project) =>
  planExport(p)
    .issues.filter((issue) => issue.code !== 'ce.missingModel')
    .map((issue) => [issue.code, issue.args]);

const asBlock = (item: Item) => (item.config.block = newCraftEngineBlock());
const asFurniture = (item: Item) => (item.config.furniture = newCraftEngineFurniture());

describe('the placement behavior of a block item', () => {
  it('places the block with the kind of placement the user picks', () => {
    const p = project([
      'lantern',
      (item) => {
        asBlock(item);
        item.config.behavior = { type: 'ceiling_block_item' };
      },
    ]);
    expect(itemOf(p, 'lantern').behavior).toEqual({ type: 'ceiling_block_item', block: 'werk:lantern' });
  });

  it('writes the height offset of a block placed on liquids', () => {
    const p = project([
      'reed',
      (item) => {
        asBlock(item);
        item.config.behavior = { type: 'liquid_collision_block_item', y_offset: 2 };
      },
    ]);
    expect(itemOf(p, 'reed').behavior).toEqual({ type: 'liquid_collision_block_item', block: 'werk:reed', y_offset: 2 });
  });

  it('keeps block_item and leaves out a furniture placement on a block, with a warning', () => {
    const p = project([
      'stone',
      (item) => {
        asBlock(item);
        item.config.behavior = { type: 'furniture_item', ignore_placer: true };
      },
    ]);
    expect(itemOf(p, 'stone').behavior).toEqual({ type: 'block_item', block: 'werk:stone' });
    expect(codes(p)).toContainEqual(['ce.placementTypeIgnored', { type: 'furniture_item' }]);
  });
});

describe('the placement behavior of a door', () => {
  const door = (item: Item) => {
    item.config.block = applyBlockBehavior(newCraftEngineBlock(), 'door_block', `werk:${item.itemId}`, { auto_state: 'solid' });
  };
  const added = () => CE_ITEM_BEHAVIOR_PROPERTIES.find((def) => def.id === 'behavior')!.defaultValue();

  it('keeps the two-block placement the door needs when the property is added without a pick', () => {
    const p = project([
      'gate',
      (item) => {
        door(item);
        item.config.behavior = added();
      },
    ]);
    expect(itemOf(p, 'gate').behavior).toEqual({ type: 'double_high_block_item', block: 'werk:gate' });
    expect(codes(p).filter(([code]) => code === 'ce.placementTypeIgnored')).toEqual([]);
  });

  it('writes the placement the user picks instead', () => {
    const p = project([
      'gate',
      (item) => {
        door(item);
        item.config.behavior = { type: 'block_item' };
      },
    ]);
    expect(itemOf(p, 'gate').behavior).toEqual({ type: 'block_item', block: 'werk:gate' });
  });
});

describe('the placement behavior of a furniture item', () => {
  it('adds the placement checks to furniture_item', () => {
    const p = project([
      'bench',
      (item) => {
        asFurniture(item);
        item.config.behavior = {
          ignore_placer: true,
          ignore_entities: false,
          against_blocks: ['minecraft:stone'],
          against_block_tags: ['minecraft:planks'],
          blacklist: false,
        };
      },
    ]);
    expect(itemOf(p, 'bench').behavior).toEqual({
      type: 'furniture_item',
      furniture: 'werk:bench',
      rules: { ground: { rotation: 'four', alignment: 'center' } },
      ignore_placer: true,
      ignore_entities: false,
      against_blocks: ['minecraft:stone'],
      against_block_tags: ['minecraft:planks'],
      blacklist: false,
    });
    expect(codes(p)).toEqual([]);
  });

  it('places furniture on liquids with liquid_collision_furniture_item', () => {
    const p = project([
      'lily',
      (item) => {
        asFurniture(item);
        item.config.behavior = { type: 'liquid_collision_furniture_item', source_only: false, liquid_type: ['water'] };
      },
    ]);
    expect(itemOf(p, 'lily').behavior).toEqual({
      type: 'liquid_collision_furniture_item',
      furniture: 'werk:lily',
      rules: { ground: { rotation: 'four', alignment: 'center' } },
      source_only: false,
      liquid_type: ['water'],
    });
  });

  it('leaves out the liquid keys on a plain furniture_item and the block keys on furniture', () => {
    const p = project([
      'chair',
      (item) => {
        asFurniture(item);
        item.config.behavior = { type: 'furniture_item', source_only: true, y_offset: 1, block: 'werk:other' };
      },
    ]);
    expect(itemOf(p, 'chair').behavior).toEqual({
      type: 'furniture_item',
      furniture: 'werk:chair',
      rules: { ground: { rotation: 'four', alignment: 'center' } },
    });
  });
});

describe('extra item behaviors', () => {
  it('writes a single behavior of an item that places nothing as behavior', () => {
    const p = project(['seeds', (item) => (item.config.behaviors = [{ type: 'compostable_item', chance: 0.3 }])]);
    expect(itemOf(p, 'seeds').behavior).toEqual({ type: 'compostable_item', chance: 0.3 });
    expect(itemOf(p, 'seeds').behaviors).toBeUndefined();
  });

  it('lists the placement first and the extra behaviors after it', () => {
    const p = project([
      'ore',
      (item) => {
        asBlock(item);
        item.config.behaviors = [{ type: 'range_mining_item', range: ['0,1,0', '0,-1,0'] }, { type: 'flint_and_steel_item' }];
      },
    ]);
    const written = itemOf(p, 'ore');
    expect(written.behavior).toBeUndefined();
    expect(written.behaviors).toEqual([
      { type: 'block_item', block: 'werk:ore' },
      { type: 'range_mining_item', range: ['0,1,0', '0,-1,0'] },
      { type: 'flint_and_steel_item' },
    ]);
  });

  it('keeps the placement behavior of an item that places another block', () => {
    const p = project([
      'torch_item',
      (item) => {
        item.config.behavior = { type: 'wall_block_item', block: 'werk:torch' };
        item.config.behaviors = [{ type: 'compostable_item', chance: 0.5 }];
      },
    ]);
    expect(itemOf(p, 'torch_item').behaviors).toEqual([
      { type: 'wall_block_item', block: 'werk:torch' },
      { type: 'compostable_item', chance: 0.5 },
    ]);
    expect(codes(p)).toEqual([]);
  });

  it('reports a placement behavior without a block or furniture to place', () => {
    const p = project(['loose', (item) => (item.config.behavior = { type: 'block_item' })]);
    expect(itemOf(p, 'loose').behavior).toEqual({ type: 'block_item' });
    expect(codes(p)).toContainEqual(['ce.behaviorTargetMissing', { type: 'block_item' }]);
  });
});

describe('item behaviors in the additional YAML', () => {
  it('merges a raw behavior: into the placement behavior of a list', () => {
    const p = project([
      'bench',
      (item) => {
        asFurniture(item);
        item.config.behaviors = [{ type: 'compostable_item' }];
        item.rawYaml = 'behavior:\n  ignore_entities: true\n';
      },
    ]);
    const written = itemOf(p, 'bench');
    expect(written.behavior).toBeUndefined();
    expect(written.behaviors).toEqual([
      {
        type: 'furniture_item',
        furniture: 'werk:bench',
        rules: { ground: { rotation: 'four', alignment: 'center' } },
        ignore_entities: true,
      },
      { type: 'compostable_item' },
    ]);
  });

  it('keeps the placement in front of a raw behaviors: list without one, with a warning', () => {
    const p = project([
      'stone',
      (item) => {
        asBlock(item);
        item.config.behaviors = [
          { type: 'range_mining_item', range: ['0,1,0'] },
          { type: 'compostable_item', chance: 0.2 },
        ];
        item.rawYaml = 'behaviors:\n  - type: compostable_item\n    chance: 1\n';
      },
    ]);
    const written = itemOf(p, 'stone');
    expect(written.behavior).toBeUndefined();
    expect(written.behaviors).toEqual([
      { type: 'block_item', block: 'werk:stone' },
      { type: 'compostable_item', chance: 1 },
      { type: 'range_mining_item', range: ['0,1,0'] },
    ]);
    expect(codes(p)).toContainEqual(['ce.rawBehaviorsOverride', undefined]);
  });

  it('writes a raw behaviors: list with a placement of its own in place of the generated one', () => {
    const p = project([
      'stone',
      (item) => {
        asBlock(item);
        item.rawYaml = 'behaviors:\n  - type: wall_block_item\n    block: werk:stone\n  - type: compostable_item\n';
      },
    ]);
    expect(itemOf(p, 'stone').behaviors).toEqual([{ type: 'wall_block_item', block: 'werk:stone' }, { type: 'compostable_item' }]);
  });

  it('adds a raw behavior: mapping first on an item that places nothing', () => {
    const p = project([
      'seeds',
      (item) => {
        item.config.behaviors = [{ type: 'compostable_item', chance: 0.3 }];
        item.rawYaml = 'behavior:\n  type: flint_and_steel_item\n';
      },
    ]);
    expect(itemOf(p, 'seeds').behaviors).toEqual([{ type: 'flint_and_steel_item' }, { type: 'compostable_item', chance: 0.3 }]);
  });
});
