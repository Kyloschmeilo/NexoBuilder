// @vitest-environment jsdom
/**
 * The special appearance list: the catalog offers only the slots the project's target exports, a slot of another
 * target that holds a model stays listed and is marked, and removing a row removes the variant.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type PackTargetId,
} from '@resourcepackbuilder/core/project';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { DEFAULT_UI_LABELS } from '@resourcepackbuilder/ui';
import { cleanup, click, render } from '../../../components/catalog/testRender';
import { useProjectStore } from '../../../store/project';
import { VariantsSection } from './VariantsSection';

const messages = MESSAGES_BY_LOCALE.en;
const label = (key: keyof typeof messages.schema.variants) => messages.schema.variants[key].label;

/** A bow item in a project of `target` with a pulling and a GUI model variant (the GUI model is Nexo-only). */
function setup(target: PackTargetId): Item {
  const project = createProject('Variants', 'variants', '1.21.4', target);
  const folder = createFolder('F', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Bow', itemId: 'bow', folderId: folder.id, model: null });
  item.config.material = 'BOW';
  item.variants = { pulling_models: [], gui_model: [] };
  insertItem(project, item);
  useProjectStore.setState({ project });
  return item;
}

/** The names of the catalog's cards. */
const catalogLabels = () => [...document.querySelectorAll('[role=option]')].map((option) => option.textContent ?? '');

afterEach(cleanup);

describe('special appearance', () => {
  it('lists every stored variant and marks the ones CraftEngine does not export', () => {
    const host = render(<VariantsSection item={setup('craftengine')} />);
    const rows = [...host.querySelectorAll('[data-slot=list-row]')];
    expect(rows.map((row) => row.getAttribute('data-row-key'))).toEqual(['pulling_models', 'gui_model']);
    expect(rows[1].textContent).toContain('Not exported for CraftEngine');
    expect(rows[0].textContent).not.toContain('Not exported');
  });

  it('offers only the slots of the project target in the catalog', () => {
    const host = render(<VariantsSection item={setup('craftengine')} />);
    click([...host.querySelectorAll('button')].find((b) => b.textContent?.includes(messages.item.variants.add)));
    const ce = catalogLabels();
    expect(ce.some((text) => text.includes(label('pullingModels')))).toBe(true);
    expect(ce.some((text) => text.includes(label('guiModel')))).toBe(false);
    cleanup();

    const nexo = render(<VariantsSection item={setup('nexo')} />, 'nexo');
    click([...nexo.querySelectorAll('button')].find((b) => b.textContent?.includes(messages.item.variants.add)));
    expect(catalogLabels().some((text) => text.includes(label('guiModel')))).toBe(true);
  });

  it('removes a variant with its row', () => {
    const item = setup('nexo');
    const host = render(<VariantsSection item={item} />, 'nexo');
    const row = host.querySelector('[data-row-key=pulling_models]')!;
    click(row.querySelector(`button[aria-label="${DEFAULT_UI_LABELS.remove}"]`));
    expect(Object.keys(useProjectStore.getState().project!.items[item.id].variants ?? {})).toEqual(['gui_model']);
  });
});
