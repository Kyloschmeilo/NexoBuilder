// @vitest-environment jsdom
/**
 * The Block section in the DOM: the places choice, the behavior cards (main behavior first, one card open at a time),
 * the states summary and the empty block settings for CraftEngine; the type and features of a Nexo custom block.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createFolder, createProject, insertFolder, insertNewItem, type Item, type PackTargetId } from '@resourcepackbuilder/core/project';
import { addBlockBehaviors, setItemPlaces } from '../../../commands/items';
import { cleanup, click, render } from '../../../components/catalog/testRender';
import { getProject, setProject } from '../../../store/project';
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
const cards = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot=typed-entry-card]')];
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
    // Cards start collapsed; opening one shows its fields
    expect(list.every((card) => card.querySelector('[data-slot=entry-toggle]')?.getAttribute('aria-expanded') === 'false')).toBe(true);
    click(list[0]?.querySelector('[data-slot=entry-toggle]'));
    expect(cards(host)[0]?.querySelectorAll('[data-slot=field-row]').length).toBeGreaterThan(3);
    // The states the crop preset wrote and the empty settings
    const states = host.querySelector('[data-section-id=block-states]');
    expect(states?.textContent).toMatch(/\d+ states/);
    expect(states?.querySelector('[role=table]')).not.toBeNull();
    expect(host.querySelector('[data-section-id=block-settings]')?.textContent).toContain('No settings yet.');
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
