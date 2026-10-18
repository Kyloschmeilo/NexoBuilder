// @vitest-environment jsdom
/**
 * The Block section in the DOM: the places choice, the behavior cards (main behavior first, one card open at a time),
 * the edit dialog of a behavior, the states summary and the empty block settings for CraftEngine; the type and features of a Nexo custom block.
 */
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFolder, createProject, insertFolder, insertNewItem, type Item, type PackTargetId } from '@resourcepackbuilder/core/project';
import { addBlockBehaviors, setItemPlaces } from '../../../commands/items';
import { cleanup, click, press, render, type } from '../../../components/catalog/testRender';
import { getProject, setProject, useOpenProject } from '../../../store/project';
import { BlockSection } from './BlockSection';

function openItem(target: PackTargetId): string {
  const project = createProject('Ruby', 'ruby', undefined, target);
  const folder = createFolder('Blocks', null);
  insertFolder(project, folder);
  const item = insertNewItem(project, { displayName: 'Ruby Crop', itemId: 'ruby_crop', folderId: folder.id, model: null });
  setProject(project);
  return item.id;
}

const item = (id: string): Item => getProject()!.items[id]!;
const cards = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot=behavior-card]')];
const dialog = () => document.querySelector<HTMLElement>('[data-slot=behavior-dialog]');

/** The section of the item as the store has it now (edits made in the section show up). */
function Live({ id }: { id: string }) {
  const current = useOpenProject().items[id];
  return current ? <BlockSection item={current} /> : null;
}
const pressed = (host: HTMLElement) =>
  [...host.querySelectorAll('[data-testid=item-places] [aria-pressed=true], [data-testid=item-places] [data-pressed]')].map(
    (button) => button.textContent,
  );

afterEach(() => {
  cleanup();
  setProject(null);
});

describe('BlockSection', () => {
  it('shows only the places choice while a CraftEngine item places nothing', () => {
    const id = openItem('craftengine');
    const host = render(<BlockSection item={item(id)} />);
    expect(pressed(host)).toEqual(['Nothing']);
    expect(host.textContent).toContain('The item places nothing.');
    expect(host.querySelectorAll('[data-slot=section]')).toHaveLength(1);
  });

  it('lists the behaviors of a CraftEngine block with the main one first, and its states and settings', () => {
    const id = openItem('craftengine');
    setItemPlaces(id, 'block');
    addBlockBehaviors(id, ['crop_block', 'bouncing_block']);
    const host = render(<BlockSection item={item(id)} />);
    expect(pressed(host)).toEqual(['Block']);
    const list = cards(host);
    expect(list.map((card) => card.getAttribute('data-type'))).toEqual([
      'crop_block',
      'liquid_flowable_block',
      'bush_block',
      'bouncing_block',
    ]);
    // The main behavior carries the editor's name of its preset and the "Main" pill
    expect(list[0]?.textContent).toContain('Crop');
    expect(list[0]?.textContent).toContain('Main');
    expect(list[1]?.textContent).not.toContain('Main');
    // The cards stay compact: name, type and a summary, no fields in the list
    expect(host.querySelectorAll('[data-slot=field-row]').length).toBeLessThan(10);
    expect(list[0]?.querySelector('a[data-target=craftengine]')).not.toBeNull();
    // The states the crop preset wrote and the empty settings
    const states = host.querySelector('[data-section-id=block-states]');
    expect(states?.textContent).toMatch(/\d+ states/);
    expect(states?.querySelector('[role=table]')).not.toBeNull();
    expect(host.querySelector('[data-section-id=block-settings]')?.textContent).toContain('No settings yet.');
  });

  it('edits a behavior in a dialog: its keys, Remove and Done, and focus goes back to the card', async () => {
    const id = openItem('craftengine');
    setItemPlaces(id, 'block');
    addBlockBehaviors(id, ['crop_block', 'bouncing_block']);
    const host = render(<Live id={id} />);
    const open = cards(host)[0]?.querySelector<HTMLButtonElement>('[data-slot=behavior-open]');
    open?.focus();
    click(open);
    const body = dialog();
    expect(body?.querySelectorAll('[data-slot=field-row]').length).toBeGreaterThan(3);
    expect(document.querySelector('[data-slot=behavior-dialog-title]')?.textContent).toContain('Crop behavior');
    expect(document.querySelector('[data-slot=behavior-dialog-title] a[data-target=craftengine]')).not.toBeNull();
    // Done closes it and the focus returns to the card
    const done = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Done');
    click(done);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(cards(host)[0]?.querySelector('[data-slot=behavior-open]'));
    // Remove in the dialog of the last card removes that behavior only
    click(cards(host)[3]?.querySelector('[data-slot=behavior-open]'));
    click([...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Remove behavior'));
    expect(cards(host).map((card) => card.getAttribute('data-type'))).toEqual(['crop_block', 'liquid_flowable_block', 'bush_block']);
  });

  it('opens a behavior added from the catalog in its dialog right away', () => {
    const id = openItem('craftengine');
    setItemPlaces(id, 'block');
    render(<Live id={id} />);
    click(document.querySelector('[data-testid=block-add-behavior]'));
    const search = document.querySelector<HTMLInputElement>('[role=combobox]');
    if (!search) throw new Error('no search box');
    type(search, 'bouncing');
    press(search, 'Enter');
    expect(document.querySelector('[data-slot=behavior-dialog-title]')?.textContent).toContain('Bouncing block behavior');
    expect(dialog()?.querySelectorAll('[data-slot=field-row]').length).toBeGreaterThan(0);
  });

  it('edits a Nexo custom block: its type and plain keys, and its parts as features', () => {
    const id = openItem('nexo');
    setItemPlaces(id, 'block');
    const host = render(<BlockSection item={item(id)} />, 'nexo');
    expect(pressed(host)).toEqual(['Block']);
    const basics = host.querySelector('[data-section-id=block]');
    expect(basics?.textContent).toContain('Block type');
    expect(basics?.textContent).toContain('NOTEBLOCK');
    expect(host.querySelector('[data-section-id=block-features]')?.textContent).toContain('No features yet.');
  });
});
