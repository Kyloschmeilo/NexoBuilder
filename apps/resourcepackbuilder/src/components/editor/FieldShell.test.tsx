// @vitest-environment jsdom
/**
 * The schema adapter onto `FieldRow`: translated label, YAML key in the key rail, docs link tinted by the open project's
 * target, version badge, help placement, and fields marked `advanced` tucked into "More options".
 */
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import type { Field, ObjectField } from '@resourcepackbuilder/core/form';
import { createProject, type PackTargetId } from '@resourcepackbuilder/core/project';
import { formFor } from '@resourcepackbuilder/core/targets';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { TooltipProvider } from '@resourcepackbuilder/ui/components/tooltip';
import { setProject } from '../../store/project';
import { FieldContext, type FieldContextValue } from './fieldContext';
import { FieldRenderer } from './FieldRenderer';
import { FieldShell } from './FieldShell';

const CONTEXT: FieldContextValue = { minecraftVersion: '1.21.4', uploadAsset: async () => null, getAsset: () => undefined };

/** The `nutrition` field of Nexo's `Components.food`, with a translated label. */
function nutritionField(): Field {
  const food = formFor('nexo').properties.find((def) => def.id === 'Components.food');
  const field = (food?.field as ObjectField).fields.find((f) => f.key === 'nutrition');
  if (!field) throw new Error('Components.food has no nutrition field');
  return field;
}

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const roots: Root[] = [];

/** Renders `element` into a fresh container with the app's providers and `target` as the open project's target. */
function render(element: ReactElement, target: PackTargetId | null = 'nexo'): HTMLElement {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  setProject(target ? createProject('Test', undefined, undefined, target) : null);
  const host = document.createElement('div');
  const root = createRoot(host);
  roots.push(root);
  act(() =>
    root.render(
      <NextIntlClientProvider locale="en" messages={MESSAGES_BY_LOCALE.en} timeZone="UTC">
        <TooltipProvider>
          <FieldContext.Provider value={CONTEXT}>{element}</FieldContext.Provider>
        </TooltipProvider>
      </NextIntlClientProvider>,
    ),
  );
  return host;
}

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  setProject(null);
});

describe('FieldShell', () => {
  const docs = 'https://docs.nexomc.com/configuration/components#food';

  it('shows the translated label, the YAML key and the docs link of a Nexo project', () => {
    const host = render(
      <FieldShell field={{ ...nutritionField(), docs, minVersion: '1.21.2' }}>
        <input />
      </FieldShell>,
    );
    expect(host.querySelector('[data-slot=field-row] span')?.textContent).toBe('Nutrition (hunger points)');
    expect(host.querySelector('[data-slot=yaml-key]')?.textContent).toBe('nutrition');
    const link = host.querySelector('a');
    expect(link?.getAttribute('href')).toBe(docs);
    expect(link?.getAttribute('aria-label')).toBe('Open Nexo docs: Nutrition (hunger points)');
    expect(link?.className).toContain('text-target-nexo');
    expect(host.textContent).toContain('from 1.21.2');
  });

  it('tints the docs link for a CraftEngine project and leaves it out without a project', () => {
    const field = { ...nutritionField(), docs: 'https://xiao-momi.github.io/craft-engine-wiki/' };
    expect(render(<FieldShell field={field}>x</FieldShell>, 'craftengine').querySelector('a')?.className).toContain('text-target-ce');
    expect(render(<FieldShell field={field}>x</FieldShell>, null).querySelector('a')).toBeNull();
  });

  it('stacks wide fields and drops label, key and docs when the label is hidden', () => {
    const field = { ...nutritionField(), docs };
    expect(
      render(
        <FieldShell field={field} wide>
          x
        </FieldShell>,
      ).querySelector('[data-layout=stacked]'),
    ).not.toBeNull();
    const hidden = render(
      <FieldShell field={field} hideLabel error="Too small.">
        x
      </FieldShell>,
    );
    expect(hidden.querySelector('[data-slot=yaml-key], a')).toBeNull();
    expect(hidden.textContent).toContain('Too small.');
  });
});

describe('ObjectFields', () => {
  it('puts fields marked advanced into More options with their count', () => {
    const food = formFor('nexo').properties.find((def) => def.id === 'Components.food')!.field as ObjectField;
    const field: ObjectField = { ...food, fields: food.fields.map((f) => (f.key === 'nutrition' ? f : { ...f, advanced: true })) };
    const host = render(<FieldRenderer field={field} value={{ nutrition: 4 }} root onChange={() => {}} />);
    const more = host.querySelector('[data-slot=more-options]');
    expect(more?.textContent).toContain('More options(2)');
    // The common field is outside the disclosure, in front of it
    const rows = [...host.querySelectorAll('[data-slot=yaml-key]')].map((key) => key.textContent);
    expect(rows[0]).toBe('nutrition');
    expect(more?.querySelector('[data-slot=yaml-key]')).toBeNull();
  });

  it('opens More options when an advanced field has a value', () => {
    const food = formFor('nexo').properties.find((def) => def.id === 'Components.food')!.field as ObjectField;
    const field: ObjectField = { ...food, fields: food.fields.map((f) => (f.key === 'saturation' ? { ...f, advanced: true } : f)) };
    const host = render(<FieldRenderer field={field} value={{ saturation: 2.4 }} root onChange={() => {}} />);
    const keys = [...(host.querySelector('[data-slot=more-options]')?.querySelectorAll('[data-slot=yaml-key]') ?? [])];
    expect(keys.map((key) => key.textContent)).toContain('saturation');
  });
});
