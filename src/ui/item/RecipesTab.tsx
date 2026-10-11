import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Item } from '../../core/types';
import {
  createRecipe,
  getRecipeTypeInfo,
  INGREDIENT_LETTERS,
  INGREDIENT_SOURCES,
  RECIPE_TYPES,
  recipeFilePath,
  recipeKeys,
  validateRecipe,
  type IngredientSource,
  type Recipe,
  type RecipeIngredient,
  type RecipeType,
} from '../../core/nexo/recipes';
import { CRAFTING_MATERIALS, ITEM_TAGS, type Option } from '../../core/nexo/options';
import { uid } from '../../core/util';
import { updateItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { IssueList } from '../common/IssueList';
import { MenuItem, Popover } from '../common/Popover';
import { NumberInput, TextInput } from '../form/inputs';

export function RecipesTab({ item }: { item: Item }) {
  const project = useStore((s) => s.project)!;
  const recipes = item.recipes ?? [];
  const keys = recipeKeys(item);

  const update = (recipeId: string, recipe: (r: Recipe) => void, historyKey = recipeId) =>
    updateItem(
      item.id,
      (d) => {
        const r = d.recipes.find((x) => x.id === recipeId);
        if (r) recipe(r);
      },
      `recipe:${historyKey}`,
    );

  return (
    <div>
      <div className="section-title">
        <span>Rezepte</span>
        <span className="spacer" />
        <AddRecipeButton onAdd={(type) => updateItem(item.id, (d) => d.recipes.push(createRecipe(type, uid('r_'))))} />
      </div>
      {recipes.length === 0 && (
        <div className="card">
          <div className="card-body faint small" style={{ textAlign: 'center', padding: 22 }}>
            Noch keine Rezepte. Über <strong>„Hinzufügen“</strong> legst du fest, wie dieses Item hergestellt werden kann.
          </div>
        </div>
      )}
      {recipes.map((recipe) => {
        const key = keys.get(recipe.id) ?? recipe.type;
        const info = getRecipeTypeInfo(recipe.type);
        const issues = validateRecipe(recipe, project, key);
        return (
          <div className="card" key={recipe.id}>
            <div className="card-header">
              <div className="card-title-group">
                <div className="row">
                  <h3>{info.label}</h3>
                  <span className="badge mono" title="Schlüssel des Rezepts">
                    {key}
                  </span>
                </div>
                <div className="desc">
                  {info.description} Datei: <span className="mono">{recipeFilePath(project, recipe.type)}</span>
                </div>
              </div>
              <button
                className="btn ghost icon small danger"
                title="Rezept entfernen"
                onClick={() => updateItem(item.id, (d) => (d.recipes = d.recipes.filter((r) => r.id !== recipe.id)))}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="card-body">
              {info.kind === 'shaped' && <ShapedEditor recipe={recipe} update={(fn, k) => update(recipe.id, fn, k)} />}
              {info.kind === 'shapeless' && <ShapelessEditor recipe={recipe} update={(fn, k) => update(recipe.id, fn, k)} />}
              {(info.kind === 'cooking' || info.kind === 'stonecutting') && (
                <div className="col" style={{ gap: 12 }}>
                  <div className="field">
                    <span className="field-label">Eingabe</span>
                    <IngredientRow
                      value={recipe.input ?? { source: 'minecraft', id: '' }}
                      onChange={(ing) => update(recipe.id, (r) => (r.input = ing), `${recipe.id}:input`)}
                    />
                  </div>
                  {info.kind === 'cooking' && (
                    <div className="field-grid">
                      <label className="field">
                        <span className="field-label">Garzeit in Ticks ({(recipe.cookingTime / 20).toLocaleString('de-DE')} s)</span>
                        <NumberInput
                          value={recipe.cookingTime}
                          integer
                          min={1}
                          onChange={(v) => update(recipe.id, (r) => (r.cookingTime = v ?? 0), `${recipe.id}:time`)}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Erfahrung</span>
                        <NumberInput
                          value={recipe.experience}
                          min={0}
                          onChange={(v) => update(recipe.id, (r) => (r.experience = v ?? 0), `${recipe.id}:xp`)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
              <div className="row" style={{ marginTop: 14, gap: 10 }}>
                <span className="field-label">Ergebnis:</span>
                <div style={{ width: 80 }}>
                  <NumberInput
                    value={recipe.resultAmount}
                    integer
                    min={1}
                    max={99}
                    onChange={(v) => update(recipe.id, (r) => (r.resultAmount = v ?? 1), `${recipe.id}:amount`)}
                  />
                </div>
                <span className="muted">× {item.displayName ? <span className="mono">{item.nexoId}</span> : item.nexoId}</span>
              </div>
              {issues.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <IssueList issues={issues} />
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div className="hint">
        Rezepte werden nach <span className="mono">&nbsp;plugins/Nexo/recipes/&lt;typ&gt;/&nbsp;</span> exportiert und mit{' '}
        <span className="mono">&nbsp;/nexo reload all&nbsp;</span> geladen.
      </div>
    </div>
  );
}

function AddRecipeButton({ onAdd }: { onAdd: (type: RecipeType) => void }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchor} className="btn small primary" onClick={() => setOpen((o) => !o)}>
        <Plus size={14} /> Hinzufügen
      </button>
      <Popover anchor={anchor.current} open={open} onClose={() => setOpen(false)} align="right" width={330}>
        {RECIPE_TYPES.map((t) => (
          <MenuItem
            key={t.type}
            label={t.label}
            description={t.description}
            onClick={() => {
              onAdd(t.type);
              setOpen(false);
            }}
          />
        ))}
      </Popover>
    </>
  );
}

type Updater = (fn: (r: Recipe) => void, historyKey?: string) => void;

function ingredientLabel(ing: RecipeIngredient | undefined): string {
  if (!ing?.id) return '(leer)';
  const prefix = ing.source === 'nexo' ? 'Nexo: ' : ing.source === 'tag' ? '#' : '';
  return `${prefix}${ing.id}${ing.amount && ing.amount > 1 ? ` ×${ing.amount}` : ''}`;
}

function ShapedEditor({ recipe, update }: { recipe: Recipe; update: Updater }) {
  const letters = INGREDIENT_LETTERS.filter((l) => recipe.ingredients[l]);
  const nextLetter = INGREDIENT_LETTERS.find((l) => !recipe.ingredients[l]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
      <div className="field">
        <span className="field-label">Raster</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 96px)', gap: 6 }}>
          {recipe.grid.map((slot, i) => (
            <select
              key={i}
              className="select"
              style={{ height: 56, textAlign: 'center', fontWeight: 700, fontSize: 15, background: slot ? 'var(--accent-soft)' : undefined }}
              value={slot}
              title={slot ? ingredientLabel(recipe.ingredients[slot]) : 'leer'}
              onChange={(e) => update((r) => (r.grid[i] = e.target.value), `${recipe.id}:grid`)}
            >
              <option value="">–</option>
              {letters.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          ))}
        </div>
        <span className="field-help">Leere Ränder werden automatisch entfernt.</span>
      </div>
      <div className="field">
        <span className="field-label">Zutaten</span>
        <div className="list-editor">
          {letters.map((letter) => (
            <div key={letter} className="list-row">
              <span className="badge accent mono" style={{ width: 28, justifyContent: 'center', height: 32 }}>
                {letter}
              </span>
              <div className="grow">
                <IngredientRow
                  value={recipe.ingredients[letter]}
                  onChange={(ing) => update((r) => (r.ingredients[letter] = ing), `${recipe.id}:${letter}`)}
                />
              </div>
              <button
                className="btn ghost icon small danger"
                title="Zutat entfernen"
                onClick={() =>
                  update((r) => {
                    delete r.ingredients[letter];
                    r.grid = r.grid.map((s) => (s === letter ? '' : s));
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {nextLetter && (
            <button
              className="btn small"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => update((r) => (r.ingredients[nextLetter] = { source: 'minecraft', id: '' }))}
            >
              <Plus size={14} /> Zutat hinzufügen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ShapelessEditor({ recipe, update }: { recipe: Recipe; update: Updater }) {
  const letters = INGREDIENT_LETTERS.filter((l) => recipe.ingredients[l]);
  const nextLetter = INGREDIENT_LETTERS.find((l) => !recipe.ingredients[l]);
  return (
    <div className="field">
      <span className="field-label">Zutaten (beliebige Anordnung, max. 9)</span>
      <div className="list-editor">
        {letters.map((letter) => (
          <div key={letter} className="list-row">
            <div className="grow">
              <IngredientRow
                value={recipe.ingredients[letter]}
                onChange={(ing) => update((r) => (r.ingredients[letter] = ing), `${recipe.id}:${letter}`)}
              />
            </div>
            <button
              className="btn ghost icon small danger"
              title="Zutat entfernen"
              onClick={() => update((r) => delete r.ingredients[letter])}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {nextLetter && (
          <button
            className="btn small"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => update((r) => (r.ingredients[nextLetter] = { source: 'minecraft', id: '' }))}
          >
            <Plus size={14} /> Zutat hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}

function IngredientRow({ value, onChange }: { value: RecipeIngredient; onChange: (v: RecipeIngredient) => void }) {
  const project = useStore((s) => s.project)!;
  const nexoItems = useMemo<Option[]>(
    () => Object.values(project.items).map((i) => ({ value: i.nexoId, label: i.displayName || undefined })),
    [project.items],
  );
  const suggestions = value.source === 'minecraft' ? CRAFTING_MATERIALS : value.source === 'nexo' ? nexoItems : ITEM_TAGS;
  return (
    <div className="row" style={{ gap: 6 }}>
      <select
        className="select"
        style={{ width: 150, flex: 'none' }}
        value={value.source}
        onChange={(e) => onChange({ ...value, source: e.target.value as IngredientSource })}
      >
        {INGREDIENT_SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <div className="grow">
        <TextInput
          value={value.id}
          mono
          suggestions={suggestions}
          placeholder={value.source === 'minecraft' ? 'z.B. DIAMOND' : value.source === 'nexo' ? 'Item-ID' : 'z.B. planks'}
          onChange={(v) => onChange({ ...value, id: value.source === 'minecraft' ? (v ?? '').toUpperCase() : (v ?? '') })}
        />
      </div>
      <div style={{ width: 70, flex: 'none' }} title="Benötigte Anzahl pro Feld (optional)">
        <NumberInput
          value={value.amount}
          integer
          min={1}
          max={64}
          placeholder="1×"
          onChange={(v) => {
            const next = { ...value };
            if (v && v > 1) next.amount = v;
            else delete next.amount;
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}
