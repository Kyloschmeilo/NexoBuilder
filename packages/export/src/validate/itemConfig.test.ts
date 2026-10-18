/** Checks of the Nexo item config that go beyond single field values: directional blocks and furniture hitboxes. */
import { describe, expect, it } from 'vitest';
import {
  type ConfigObject,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Project,
} from '@resourcepackbuilder/core/project';
import { planExport } from '../plan';

/** A project with one item per config, all in one folder. */
function projectWith(...configs: ConfigObject[]): Project {
  const project = createProject('Prüfung', 'pruefung', '1.21.11');
  const folder = createFolder('Blöcke', null);
  insertFolder(project, folder);
  configs.forEach((config, i) => {
    const item = createItem({ displayName: `Item ${i}`, itemId: `item_${i}`, folderId: folder.id, model: null });
    item.config = { ...item.config, ...config };
    insertItem(project, item);
  });
  return project;
}

const issuesOf = (project: Project, code: string) => planExport(project).issues.filter((issue) => issue.code === code);

describe('directional blocks', () => {
  it('checks the range of every face variation', () => {
    const project = projectWith({
      Mechanics: { custom_block: { type: 'NOTEBLOCK', directional: { type: 'LOG', y_variation: 1, x_variation: 2000 } } },
    });
    const issues = issuesOf(project, 'plan.blockVariationRange');
    expect(issues).toHaveLength(1);
    expect(issues[0].args).toMatchObject({ variation: 2000, max: 1149, type: 'NOTEBLOCK' });
  });

  it('reports a face variation another block already uses', () => {
    const project = projectWith(
      { Mechanics: { custom_block: { type: 'NOTEBLOCK', custom_variation: 5 } } },
      { Mechanics: { custom_block: { type: 'NOTEBLOCK', directional: { type: 'FURNACE', north_variation: 5, south_variation: 6 } } } },
    );
    const issues = issuesOf(project, 'plan.blockVariationDuplicate');
    expect(issues).toHaveLength(1);
    expect(issues[0].args).toMatchObject({ variation: 5, type: 'NOTEBLOCK' });
  });

  it('lets the parent block share its variation with one face', () => {
    const project = projectWith({
      Mechanics: { custom_block: { type: 'NOTEBLOCK', custom_variation: 1, directional: { type: 'LOG', y_variation: 1, x_variation: 2 } } },
    });
    expect(issuesOf(project, 'plan.blockVariationDuplicate')).toEqual([]);
  });

  it('warns when a block other than a NoteBlock is directional', () => {
    const project = projectWith({ Mechanics: { custom_block: { type: 'STRINGBLOCK', directional: { type: 'LOG' } } } });
    expect(issuesOf(project, 'plan.directionalNeedsNoteblock')).toHaveLength(1);
    expect(
      issuesOf(
        projectWith({ Mechanics: { custom_block: { type: 'NOTEBLOCK', directional: { type: 'LOG' } } } }),
        'plan.directionalNeedsNoteblock',
      ),
    ).toEqual([]);
  });
});

describe('furniture hitboxes', () => {
  it('accepts the formats of the Nexo docs', () => {
    const project = projectWith({
      Mechanics: {
        furniture: {
          hitbox: {
            barriers: ['0,0,0', '1,0,0..2', '-1, 0, 0'],
            interactions: ['0,0,0 1,1', '1,0,0 1,2.0', '-1,0,0 1,2.2'],
            shulkers: ['0,0,0 1.0 1.0', '1,0,0 1.2 1.5 EAST', '-1,0,0 0.8 2.0 UP true'],
            ghasts: ['0,0,0 0.25', '0,1,0 0.25 45', '0,2,0 0.25 true'],
          },
        },
      },
    });
    expect(issuesOf(project, 'plan.hitboxEntryInvalid')).toEqual([]);
  });

  it('reports entries Nexo cannot read, also as a single string', () => {
    const project = projectWith({
      Mechanics: {
        furniture: {
          hitbox: { barriers: '0,0', interactions: ['0,0,0 wide', '0,0,0 1,1 extra'], shulkers: ['0,0,0'], ghasts: ['a,b,c 1'] },
        },
      },
    });
    const issues = issuesOf(project, 'plan.hitboxEntryInvalid');
    expect(issues.map((issue) => [issue.args?.kind, issue.args?.entry])).toEqual([
      ['barriers', '0,0'],
      ['interactions', '0,0,0 wide'],
      ['interactions', '0,0,0 1,1 extra'],
      ['shulkers', '0,0,0'],
      ['ghasts', 'a,b,c 1'],
    ]);
    expect(issues.every((issue) => issue.level === 'warning')).toBe(true);
  });

  it('warns about lights inside a barrier, which Nexo ignores', () => {
    const project = projectWith({
      Mechanics: {
        furniture: {
          hitbox: { barriers: ['0,0,0', '1..2,0,0'] },
          lights: { lights: ['0,0,0 15', '2, 0, 0 10', '0,1,0 12', '1,1,0 5'] },
        },
      },
    });
    const issues = issuesOf(project, 'plan.furnitureLightInBarrier');
    expect(issues.map((issue) => issue.args?.light)).toEqual(['0,0,0 15', '2, 0, 0 10']);
    expect(issues.every((issue) => issue.level === 'warning')).toBe(true);
  });
});

describe('Carpentry blocks', () => {
  const stair = (variation: number) => ({
    Mechanics: { custom_block: { type: 'STAIR', custom_variation: variation, model: 'pruefung:stair' } },
  });

  it('warns while the project does not have the addon', () => {
    const project = projectWith(stair(1));
    expect(issuesOf(project, 'plan.carpentryNotInstalled').map((issue) => [issue.level, issue.args?.type])).toEqual([['warning', 'STAIR']]);
    project.settings.carpentryAddon = true;
    expect(issuesOf(project, 'plan.carpentryNotInstalled')).toEqual([]);
  });

  it('allows four variations per type and reports duplicates', () => {
    const project = projectWith(stair(4), stair(5), stair(4));
    project.settings.carpentryAddon = true;
    expect(issuesOf(project, 'plan.blockVariationRange').map((issue) => issue.args)).toEqual([{ variation: 5, max: 4, type: 'STAIR' }]);
    expect(issuesOf(project, 'plan.blockVariationDuplicate')).toHaveLength(1);
  });

  it('needs Minecraft 1.21.10 for chains, lanterns and bars', () => {
    const project = projectWith({ Mechanics: { custom_block: { type: 'CHAIN', model: 'pruefung:chain' } } });
    project.settings.carpentryAddon = true;
    expect(issuesOf(project, 'plan.carpentryNeedsVersion')).toEqual([]);
    project.settings.minecraftVersion = '1.21.6';
    expect(issuesOf(project, 'plan.carpentryNeedsVersion').map((issue) => issue.args)).toEqual([{ type: 'CHAIN', version: '1.21.10' }]);
  });
});
