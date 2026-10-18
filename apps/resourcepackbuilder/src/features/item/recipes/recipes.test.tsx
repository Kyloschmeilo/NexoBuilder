// @vitest-environment jsdom
/**
 * The Recipes section: the row summaries, which target keys show right away and which wait under "More options", the
 * add catalog per target, the recipe commands (add, duplicate, move), and the section itself: collapsed rows with a
 * docs link each, one open recipe at a time, and the catalog behind "Add recipe".
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createProject,
  createRecipe,
  insertNewItem,
  optionsForType,
  type PackTargetId,
  type Project,
  type Recipe,
} from '@resourcepackbuilder/core/project';
import { recipeOptionsFor } from '@resourcepackbuilder/core/targets';
import { addRecipe, duplicateRecipe, moveRecipe } from '../../../commands/items';
import { cleanup, click, render } from '../../../components/catalog/testRender';
import { getProject, setProject } from '../../../store/project';
import { recipeCatalog } from './catalog';
import { groupRecipeOptions, isPrimaryRecipeOption, mergeOptionKeys, pickOptionKeys } from './options';
import { RecipesSection } from './RecipesSection';
import { ingredientName, recipeSummary, type RecipeSummaryText } from './summary';

const TEXT: RecipeSummaryText = {
  empty: 'empty',
  noIngredients: 'No ingredients yet',
  seconds: (seconds) => `${seconds} s`,
  makes: (amount) => `makes ${amount}`,
};

/** A recipe of the type with a fixed id and the given changes. */
function recipe(type: Recipe['type'], change: (r: Recipe) => void = () => undefined): Recipe {
  const r = createRecipe(type, `r_${type}`);
  change(r);
  return r;
}

/** Opens a project of the target with one item ("ruby_sword") holding the recipes; returns the item's id. */
function openProject(target: PackTargetId, recipes: Recipe[] = []): string {
  const project: Project = createProject('Test', 'test', '1.21.4', target);
  project.folders.f = { id: 'f', name: 'Folder', parentId: null, folderIds: [], itemIds: [] } as unknown as Project['folders'][string];
  project.rootFolderIds.push('f');
  const item = insertNewItem(project, { displayName: 'Ruby sword', itemId: 'ruby_sword', folderId: 'f', model: null });
  item.recipes = recipes;
  setProject(project);
  return item.id;
}

const recipesOf = (itemId: string) => getProject()!.items[itemId].recipes;

afterEach(() => {
  cleanup();
  setProject(null);
});

describe('recipeSummary', () => {
  it('lists the ingredients of crafting recipes, at most three', () => {
    const shaped = recipe('shaped', (r) => {
      r.ingredients = {
        A: { source: 'minecraft', id: 'DIAMOND', amount: 2 },
        B: { source: 'tag', id: 'planks' },
        C: { source: 'nexo', id: 'ruby' },
        D: { source: 'mmoitems', id: 'blade', itemType: 'SWORD' },
      };
      r.resultAmount = 4;
    });
    expect(recipeSummary(shaped, 'nexo', TEXT)).toBe('DIAMOND ×2, #planks, ruby +1 · makes 4');
    expect(recipeSummary(recipe('shapeless'), 'nexo', TEXT)).toBe('No ingredients yet');
    expect(ingredientName({ source: 'mmoitems', id: 'blade', itemType: 'SWORD' })).toBe('SWORD:blade');
    expect(ingredientName({ source: 'minecraft', id: '  ' })).toBeNull();
  });

  it('joins the slots of the other types and adds the cooking time', () => {
    const smithing = recipe('smithing_transform', (r) => {
      r.slots = {
        template: { source: 'minecraft', id: '' },
        base: { source: 'minecraft', id: 'diamond_sword' },
        addition: { source: 'nexo', id: 'ruby' },
      };
    });
    expect(recipeSummary(smithing, 'nexo', TEXT)).toBe('empty + diamond_sword + ruby');
    // CraftEngine lets the template stay empty, so it is not reported as missing
    expect(recipeSummary(smithing, 'craftengine', TEXT)).toBe('diamond_sword + ruby');
    const furnace = recipe('furnace', (r) => {
      r.input = { source: 'minecraft', id: 'RAW_IRON' };
      r.cookingTime = 200;
    });
    expect(recipeSummary(furnace, 'nexo', TEXT)).toBe('RAW_IRON · 10 s');
    // A trim makes no item of its own, so its amount is never mentioned
    expect(
      recipeSummary(
        recipe('smithing_trim', (r) => (r.resultAmount = 3)),
        'nexo',
        TEXT,
      ),
    ).toBe('empty + empty + empty');
  });
});

describe('recipe option groups', () => {
  const keys = (options: { field: { key: string } }[]) => options.map((option) => option.field.key);
  const groups = (target: PackTargetId, type: Recipe['type']) => groupRecipeOptions(optionsForType(recipeOptionsFor(target).recipe, type));

  it('shows the keys a type is about and folds the shared ones away', () => {
    expect(keys(groups('nexo', 'smithing_trim').primary)).toEqual(['trim_pattern']);
    expect(keys(groups('nexo', 'smithing_trim').more)).toEqual(['permission']);
    expect(keys(groups('nexo', 'anvil').primary)).toEqual(['preserve', 'cost', 'repair']);
    expect(keys(groups('craftengine', 'smithing_trim').primary)).toEqual(['pattern']);
    const shaped = groups('craftengine', 'shaped');
    expect(shaped.primary).toEqual([]);
    expect(keys(shaped.more)).toContain('group');
    expect(keys(shaped.premium)).toEqual(['conditions', 'functions', 'visual_result']);
  });

  it('shows the source flag of a transform ingredient right away', () => {
    const ingredient = optionsForType(recipeOptionsFor('craftengine').ingredient, 'shaped_transform');
    expect(keys(ingredient.filter(isPrimaryRecipeOption))).toEqual(['source']);
  });

  it('writes a group back without touching the other keys', () => {
    const { primary } = groups('nexo', 'smithing_trim');
    const stored = { trim_pattern: 'minecraft:bolt', permission: 'a.b', pattern: 'minecraft:eye' };
    expect(pickOptionKeys(stored, primary)).toEqual({ trim_pattern: 'minecraft:bolt' });
    expect(mergeOptionKeys(stored, primary, { trim_pattern: 'minecraft:vex' })).toEqual({ ...stored, trim_pattern: 'minecraft:vex' });
    expect(mergeOptionKeys(stored, primary, {})).toEqual({ permission: 'a.b', pattern: 'minecraft:eye' });
    expect(mergeOptionKeys({ trim_pattern: 'x' }, primary, undefined)).toBeUndefined();
  });
});

describe('recipeCatalog', () => {
  const text = { schema: (key: string) => key, category: (category: string) => category };

  it('offers only the types the target reads, sorted into categories', () => {
    const nexo = recipeCatalog('nexo', text);
    const ids = nexo.items.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(['shaped', 'crafter', 'transmute', 'anvil', 'brewing', 'smithing_trim']));
    expect(ids).not.toContain('dye');
    expect(nexo.categories.map((category) => category.id)).toEqual(['crafting', 'cooking', 'smithing', 'stations']);
    const ce = recipeCatalog('craftengine', text);
    expect(ce.items.map((item) => item.id)).toEqual(expect.arrayContaining(['shaped_transform', 'dye']));
    expect(ce.items.map((item) => item.id)).not.toContain('anvil');
  });

  it('gives every type its docs link, key and category', () => {
    for (const target of ['nexo', 'craftengine'] as const) {
      for (const item of recipeCatalog(target, text).items) {
        expect(item.docs?.target).toBe(target);
        expect(item.docs?.url).toMatch(/^https:\/\//);
        expect(item.yamlKey).toBe(item.id);
        expect(item.category).toBeTruthy();
      }
    }
    const shaped = recipeCatalog('craftengine', text).items.find((item) => item.id === 'shaped');
    expect(shaped).toMatchObject({ common: true, preview: 'type: shaped' });
    expect(recipeCatalog('nexo', text).items.find((item) => item.id === 'shaped')?.preview).toBeUndefined();
  });
});

describe('recipe commands', () => {
  it('adds a recipe and returns its id', () => {
    const itemId = openProject('nexo');
    const id = addRecipe(itemId, 'brewing');
    expect(recipesOf(itemId).map((r) => [r.id, r.type])).toEqual([[id, 'brewing']]);
  });

  it('inserts a copy with an id of its own right below the recipe', () => {
    const itemId = openProject('nexo', [recipe('shaped', (r) => (r.resultAmount = 3)), recipe('furnace')]);
    const copy = duplicateRecipe(itemId, 'r_shaped');
    const recipes = recipesOf(itemId);
    expect(recipes.map((r) => r.id)).toEqual(['r_shaped', copy, 'r_furnace']);
    expect(recipes[1]).toMatchObject({ type: 'shaped', resultAmount: 3 });
    expect(duplicateRecipe(itemId, 'missing')).toBeNull();
  });

  it('moves a recipe up and down, and not past the ends', () => {
    const itemId = openProject('nexo', [recipe('shaped'), recipe('furnace'), recipe('brewing')]);
    moveRecipe(itemId, 'r_brewing', -1);
    expect(recipesOf(itemId).map((r) => r.type)).toEqual(['shaped', 'brewing', 'furnace']);
    moveRecipe(itemId, 'r_shaped', -1);
    moveRecipe(itemId, 'r_furnace', 1);
    expect(recipesOf(itemId).map((r) => r.type)).toEqual(['shaped', 'brewing', 'furnace']);
  });
});

describe('RecipesSection', () => {
  let itemId = '';
  beforeEach(() => {
    itemId = openProject('nexo', [
      recipe('shaped', (r) => (r.ingredients = { A: { source: 'minecraft', id: 'DIAMOND' } })),
      recipe('smithing_transform'),
      recipe('brewing'),
    ]);
  });

  const toggles = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>('[data-slot=feature-toggle]')];
  const section = () => <RecipesSection item={getProject()!.items[itemId]} />;

  it('lists the recipes collapsed, each with its summary, key and docs link', () => {
    const host = render(section(), 'nexo');
    expect(toggles(host)).toHaveLength(3);
    expect(host.querySelector('[data-slot=recipe-editor]')).toBeNull();
    expect(host.textContent).toContain('DIAMOND');
    expect(host.textContent).toContain('ruby_sword_smithing_transform');
    const docs = [...host.querySelectorAll('[data-slot=recipe-list] a[data-target=nexo]')];
    expect(docs).toHaveLength(3);
    // The disabled vanilla recipes of a Nexo project sit on their own panel
    expect(host.textContent).toContain('Disabled vanilla recipes');
  });

  it('edits one recipe at a time', () => {
    const host = render(section(), 'nexo');
    click(toggles(host)[0]);
    expect(host.querySelectorAll('[data-slot=recipe-editor]')).toHaveLength(1);
    expect(host.querySelector('[data-slot=shaped-grid]')).not.toBeNull();
    click(toggles(host)[1]);
    expect(host.querySelectorAll('[data-slot=recipe-editor]')).toHaveLength(1);
    expect(host.querySelector('[data-slot=shaped-grid]')).toBeNull();
    expect(host.querySelector('[data-slot=recipe-flow]')).not.toBeNull();
    click(toggles(host)[1]);
    expect(host.querySelector('[data-slot=recipe-editor]')).toBeNull();
  });

  it('opens the catalog of the target recipe types from "Add recipe"', () => {
    const host = render(section(), 'nexo');
    click(host.querySelector('[data-testid=add-recipe]'));
    const dialog = document.querySelector('[role=dialog]');
    expect(dialog?.textContent).toContain('Add a recipe');
    const options = [...document.querySelectorAll('[role=option]')].map((option) => option.textContent ?? '');
    expect(options.some((text) => text.includes('anvil'))).toBe(true);
    expect(options.some((text) => text.includes('dye'))).toBe(false);
  });

  it('shows no disabled recipes panel in a CraftEngine project', () => {
    itemId = openProject('craftengine', [recipe('dye')]);
    const host = render(section(), 'craftengine');
    expect(host.textContent).not.toContain('Disabled vanilla recipes');
    expect(host.querySelectorAll('[data-slot=recipe-list] a[data-target=craftengine]')).toHaveLength(1);
  });
});
