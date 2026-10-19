// @vitest-environment jsdom
/**
 * The item model tree editor renders a tree with every node type, property, special model, tint and transformation
 * for both targets, and finds each of its texts (a missing message fails the test).
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import {
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type ItemModelNode,
  ITEM_MODEL_PROPERTIES,
  ITEM_MODEL_SPECIAL_TYPES,
  ITEM_MODEL_TINT_TYPES,
  ITEM_MODEL_TYPES,
  newItemModelNode,
  newSpecialModel,
  newTint,
  PACK_TARGETS,
  withProperty,
} from '@resourcepackbuilder/core/project';
import { MESSAGES_BY_LOCALE, SUPPORTED_LOCALES } from '@resourcepackbuilder/i18n';
import { useProjectStore } from '../../../../store/project';
import { ItemModelTreeSection } from './ItemModelTreeSection';

/** A composite holding one node of every type, every property, special model and tint source. */
function everything(): ItemModelNode {
  const models: ItemModelNode[] = ITEM_MODEL_TYPES.map((type) => newItemModelNode(type));
  for (const kind of ['condition', 'select', 'range_dispatch'] as const) {
    for (const def of ITEM_MODEL_PROPERTIES[kind])
      models.push(withProperty(newItemModelNode(`minecraft:${kind}` as 'minecraft:select'), kind, def.id));
  }
  for (const def of ITEM_MODEL_SPECIAL_TYPES) models.push({ type: 'minecraft:special', base: '@model', model: newSpecialModel(def.id) });
  models.push({
    type: 'minecraft:model',
    model: 'ns:item/a',
    tints: ITEM_MODEL_TINT_TYPES.map((def) => newTint(def.id)),
    transformation: { translation: [0, 0, 0], scale: [1, 1, 1] },
  });
  models.push({ type: 'minecraft:model', model: 'ns:item/b', transformation: [[1, 0, 0, 0]] });
  models.push({ type: 'minecraft:unknown' });
  return { type: 'minecraft:composite', models };
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('item model tree editor', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const messages = MESSAGES_BY_LOCALE[locale];
    for (const target of PACK_TARGETS) {
      it(`renders every node type for ${target} in ${locale}`, () => {
        const project = createProject('Tree', 'tree', '26.3', target);
        useProjectStore.setState({ project });
        const item = createItem({ displayName: 'Item', itemId: 'item', folderId: 'f', model: null });
        /** Renders the section, then selects every node of the outline in turn; returns the HTML of every state. */
        const render = (withTree: boolean) => {
          const container = document.createElement('div');
          const root = createRoot(container);
          act(() =>
            root.render(
              <NextIntlClientProvider
                locale={locale}
                messages={messages}
                onError={(error) => {
                  throw error;
                }}
              >
                <ItemModelTreeSection item={withTree ? { ...item, itemModel: { model: everything(), oversized_in_gui: true } } : item} />
              </NextIntlClientProvider>,
            ),
          );
          const html = [container.innerHTML];
          const rowCount = container.querySelectorAll('[role=treeitem]').length;
          for (let i = 0; i < rowCount; i++) {
            act(() => container.querySelectorAll<HTMLElement>('[role=treeitem]')[i].click());
            expect(container.querySelector('[role=treeitem][aria-selected=true]')).toBe(container.querySelectorAll('[role=treeitem]')[i]);
            html.push(container.querySelector('[data-slot=item-model-node]')!.innerHTML);
          }
          act(() => root.unmount());
          return { html: html.join('\n'), rowCount };
        };
        expect(render(false).html).toContain(messages.schema.itemModel.ui.create);
        const { html, rowCount } = render(true);
        // The composite root, its children and the children of the select, condition and range dispatch nodes
        expect(rowCount).toBeGreaterThan((everything().models as unknown[]).length);
        expect(html).toContain('minecraft:copper_golem_statue');
        expect(html).toContain(messages.schema.itemModel.ui.addTint);
        expect(html).toContain(messages.schema.itemModel.ui.addTransformation);
        expect(html.includes('oversized_in_gui')).toBe(target === 'nexo');
        // Selecting each of the many nodes re-renders the whole section, which takes a few seconds in jsdom
      }, 60_000);
    }
  }
});

/** Types `text` into an input the way a user does (React reads the native value setter's change). */
function typeInto(input: HTMLInputElement, text: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setValue.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('select case values in the editor', () => {
  it('keeps commas and spaces while typing and stores the values on blur', () => {
    const project = createProject('Tree', 'tree', '26.3', 'nexo');
    const folder = createFolder('F', null);
    insertFolder(project, folder);
    const item = createItem({ displayName: 'Item', itemId: 'item', folderId: folder.id, model: null });
    item.itemModel = {
      model: {
        type: 'minecraft:select',
        property: 'minecraft:context_entity_type',
        cases: [{ when: 'minecraft:zombie', model: { type: 'minecraft:empty' } }],
      },
    };
    insertItem(project, item);
    useProjectStore.setState({ project });
    const messages = MESSAGES_BY_LOCALE.en;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <ItemModelTreeSection item={item} />
        </NextIntlClientProvider>,
      ),
    );
    // The case's value is edited in the card of its model, which the outline opens
    expect(container.querySelector(`input[placeholder="${messages.schema.itemModel.ui.whenPlaceholder}"]`)).toBeNull();
    act(() => container.querySelector<HTMLElement>('[role=treeitem][data-path="model.cases.0.model"]')!.click());
    const input = container.querySelector<HTMLInputElement>(`input[placeholder="${messages.schema.itemModel.ui.whenPlaceholder}"]`)!;
    expect(input.value).toBe('minecraft:zombie');
    const stored = () => useProjectStore.getState().project!.items[item.id].itemModel!.model.cases;
    typeInto(input, 'minecraft:zombie, ');
    expect(input.value).toBe('minecraft:zombie, ');
    expect(stored()).toEqual(item.itemModel.model.cases);
    typeInto(input, 'minecraft:zombie, minecraft:husk ');
    act(() => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(stored()).toEqual([{ when: ['minecraft:zombie', 'minecraft:husk'], model: { type: 'minecraft:empty' } }]);
    act(() => root.unmount());
    container.remove();
  });
});
