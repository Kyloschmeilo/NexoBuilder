/** Rendering helpers for the DOM tests of the catalog, feature and input components (jsdom, no Testing Library). */
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { TooltipProvider } from '@resourcepackbuilder/ui/components/tooltip';
import { FieldContext, type FieldContextValue } from '../editor/fieldContext';
import { FormTargetProvider } from '../formTarget';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const CONTEXT: FieldContextValue = { minecraftVersion: '1.21.4', uploadAsset: async () => null, getAsset: () => undefined };

const roots: Root[] = [];

/** Renders `element` with messages, tooltips, a field context and `target`'s form; returns the container. */
export function render(element: ReactElement, target: PackTargetId = 'craftengine'): HTMLElement {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() =>
    root.render(
      <NextIntlClientProvider locale="en" messages={MESSAGES_BY_LOCALE.en} timeZone="UTC">
        <TooltipProvider>
          <FormTargetProvider target={target}>
            <FieldContext.Provider value={CONTEXT}>{element}</FieldContext.Provider>
          </FormTargetProvider>
        </TooltipProvider>
      </NextIntlClientProvider>,
    ),
  );
  return host;
}

/** Unmounts everything `render` mounted (call in `afterEach`). */
export function cleanup(): void {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = '';
}

/** Types `text` into an input the way React notices (the native value setter, then an input event). */
export function type(input: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Presses a key on an element. */
export function press(element: Element, key: string, modifiers: KeyboardEventInit = {}): void {
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }));
  });
}

/** Clicks an element. */
export function click(element: Element | null | undefined): void {
  if (!element) throw new Error('nothing to click');
  act(() => {
    (element as HTMLElement).click();
  });
}
