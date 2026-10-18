// @vitest-environment jsdom
/**
 * The catalog dialog in the DOM: facets, search with highlighting, the keyboard (arrows, Enter, Shift+Enter,
 * Ctrl+Enter with `multi`), the added state with "Jump to", disabled conflicts and the detail pane.
 */
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogDialog, type CatalogDialogProps } from './CatalogDialog';
import { cleanup, click, press, render, type } from './testRender';
import type { CatalogItem } from './types';

const ITEMS: CatalogItem[] = [
  {
    id: 'slab_block',
    label: 'Slab block',
    yamlKey: 'slab_block',
    category: 'shapes',
    description: 'A half block.',
    preview: 'type: slab_block\n',
  },
  { id: 'door_block', label: 'Door block', yamlKey: 'door_block', category: 'shapes', description: 'Opens by hand.' },
  {
    id: 'falling_block',
    label: 'Falling block',
    yamlKey: 'falling_block',
    category: 'physics',
    description: 'Falls like sand.',
    common: true,
  },
  { id: 'crop_block', label: 'Crop block', yamlKey: 'crop_block', category: 'plants', added: true },
  {
    id: 'stem_block',
    label: 'Stem block',
    yamlKey: 'stem_block',
    category: 'plants',
    disabledReason: 'Not possible together with “Crop block”.',
  },
];
const CATEGORIES = [
  { id: 'shapes', label: 'Shapes' },
  { id: 'physics', label: 'Physics' },
  { id: 'plants', label: 'Plants' },
];

/** The dialog, open, with spies for its callbacks. */
function Harness(props: Partial<CatalogDialogProps>) {
  const [open, setOpen] = useState(true);
  return (
    <CatalogDialog
      open={open}
      onOpenChange={setOpen}
      title="Add a block behavior"
      items={ITEMS}
      categories={CATEGORIES}
      onAdd={() => {}}
      {...props}
    />
  );
}

const dialog = () => document.querySelector('[data-slot=catalog-dialog]');
const search = () => document.querySelector<HTMLInputElement>('input[role=combobox]') as HTMLInputElement;
const activeId = () => document.querySelector('[role=option][data-active]')?.getAttribute('data-item-id');
const cardIds = () => [...document.querySelectorAll('[role=option]')].map((card) => card.getAttribute('data-item-id'));

afterEach(cleanup);

describe('CatalogDialog', () => {
  it('shows the facets with counts and the cards grouped by category', async () => {
    render(<Harness />);
    // The dialog moves the focus into the search box once it has opened
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    const facets = [...document.querySelectorAll('[data-facet]')].map((f) => [f.getAttribute('data-facet'), f.textContent]);
    expect(facets).toEqual([
      ['all', 'All5'],
      ['common', 'Common1'],
      ['shapes', 'Shapes2'],
      ['physics', 'Physics1'],
      ['plants', 'Plants2'],
      ['added', 'Added1'],
    ]);
    expect([...document.querySelectorAll('[role=group] h3')].map((h) => h.textContent)).toEqual(['Shapes', 'Physics', 'Plants']);
    expect(cardIds()).toEqual(['slab_block', 'door_block', 'falling_block', 'crop_block', 'stem_block']);
    // The search box has the focus and points at the first card
    expect(document.activeElement).toBe(search());
    expect(search().getAttribute('aria-activedescendant')).toBe(document.querySelector('[role=option]')?.id);
  });

  it('filters by facet', () => {
    render(<Harness />);
    click(document.querySelector('[data-facet=plants]'));
    expect(cardIds()).toEqual(['crop_block', 'stem_block']);
    click(document.querySelector('[data-facet=common]'));
    expect(cardIds()).toEqual(['falling_block']);
  });

  it('ranks search results and highlights the match', () => {
    render(<Harness />);
    type(search(), 'sand');
    expect(cardIds()).toEqual(['falling_block']);
    expect(document.querySelector('[role=option] mark')?.textContent).toBe('sand');
    type(search(), 'block');
    // Labels first; the conflicting entry stays listed
    expect(cardIds()).toEqual(['falling_block', 'slab_block', 'door_block', 'crop_block', 'stem_block']);
    type(search(), 'zzz');
    expect(cardIds()).toEqual([]);
    expect(dialog()?.textContent).toContain('Nothing matches “zzz”.');
  });

  it('moves with the arrow keys and adds the active card with Enter, closing the dialog', () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    expect(activeId()).toBe('slab_block');
    press(search(), 'ArrowDown');
    expect(activeId()).toBe('door_block');
    press(search(), 'ArrowRight');
    expect(activeId()).toBe('falling_block');
    press(search(), 'ArrowLeft');
    press(search(), 'ArrowUp');
    expect(activeId()).toBe('slab_block');
    press(search(), 'ArrowUp');
    expect(activeId()).toBe('slab_block');
    press(search(), 'ArrowDown');
    press(search(), 'Enter');
    expect(onAdd).toHaveBeenCalledWith(['door_block']);
    expect(dialog()).toBeNull();
  });

  it('keeps left and right for the caret while the search has text', () => {
    render(<Harness />);
    type(search(), 'block');
    press(search(), 'ArrowRight');
    expect(activeId()).toBe('falling_block');
    press(search(), 'ArrowDown');
    expect(activeId()).toBe('slab_block');
  });

  it('adds with Shift+Enter and stays open, showing the card as added', () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    press(search(), 'Enter', { shiftKey: true });
    expect(onAdd).toHaveBeenCalledWith(['slab_block']);
    expect(dialog()).not.toBeNull();
    expect(document.querySelector('[data-item-id=slab_block]')?.hasAttribute('data-added')).toBe(true);
    // A second Shift+Enter on the added card adds nothing
    press(search(), 'Enter', { shiftKey: true });
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('jumps to an added entry instead of adding it again', () => {
    const onAdd = vi.fn();
    const onJumpTo = vi.fn();
    render(<Harness onAdd={onAdd} onJumpTo={onJumpTo} />);
    click(document.querySelector('[data-facet=added]'));
    expect(document.querySelector('[data-slot=catalog-detail]')?.textContent).toContain('Jump to');
    press(search(), 'Enter');
    expect(onJumpTo).toHaveBeenCalledWith('crop_block');
    expect(onAdd).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it('does not add a disabled entry and shows why', () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    type(search(), 'stem');
    const card = document.querySelector('[data-item-id=stem_block]');
    expect(card?.getAttribute('aria-disabled')).toBe('true');
    expect(card?.textContent).toContain('Not possible together with “Crop block”.');
    press(search(), 'Enter');
    click(card);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('checks several cards with multi and adds them at once with Ctrl+Enter', () => {
    const onAdd = vi.fn();
    render(<Harness multi onAdd={onAdd} />);
    press(search(), 'Enter');
    press(search(), 'ArrowRight');
    press(search(), 'ArrowRight');
    press(search(), 'Enter');
    expect(document.querySelectorAll('[role=option][aria-selected=true]')).toHaveLength(2);
    expect(dialog()?.textContent).toContain('2 checked');
    press(search(), 'Enter', { ctrlKey: true });
    expect(onAdd).toHaveBeenCalledWith(['slab_block', 'falling_block']);
    expect(dialog()).toBeNull();
  });

  it('adds a card on click and shows the active entry in the detail pane', () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);
    const detail = document.querySelector('[data-slot=catalog-detail]');
    expect(detail?.textContent).toContain('A half block.');
    expect(detail?.textContent).toContain('Adds');
    click(document.querySelector('[data-item-id=falling_block]'));
    expect(onAdd).toHaveBeenCalledWith(['falling_block']);
  });

  it('opens on the initial category', () => {
    render(<Harness initialCategory="physics" />);
    expect(document.querySelector('[data-facet=physics]')?.getAttribute('aria-pressed')).toBe('true');
    expect(cardIds()).toEqual(['falling_block']);
  });
});
