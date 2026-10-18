// @vitest-environment jsdom
/**
 * The typed entry card: a known CraftEngine block behavior with its fields, a type without fields, an unknown type
 * with the YAML fallback, the Negate switch of invertible lists, and the collapsed summary.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CE_CONDITIONS, CE_LOGIC } from '@resourcepackbuilder/core/craftEngine';
import { TypedEntryCard } from './TypedEntryCard';
import { cleanup, click, render } from './testRender';

const behaviors = { types: () => CE_LOGIC.blockBehaviors };
const card = (host: HTMLElement) => host.querySelector('[data-slot=typed-entry-card]') as HTMLElement;

afterEach(cleanup);

describe('TypedEntryCard', () => {
  it('shows a known type with its human name, id, docs link and fields', () => {
    const host = render(<TypedEntryCard source={behaviors} entry={{ type: 'crop_block', grow_speed: 0.5 }} onChange={() => {}} />);
    const root = card(host);
    expect(root.getAttribute('data-known')).toBe('true');
    expect(root.textContent).toContain('Crop block');
    expect(root.querySelector('[data-slot=yaml-key]')?.textContent).toBe('crop_block');
    const docs = root.querySelector('a[data-target=craftengine]');
    expect(docs?.getAttribute('href')).toMatch(/^https:\/\/xiao-momi\.github\.io\/craft-engine-wiki\//);
    expect(docs?.className).toContain('text-target-ce');
    expect(root.querySelectorAll('[data-slot=field-row]').length).toBeGreaterThan(3);
  });

  it('says so when a type has no settings', () => {
    const host = render(<TypedEntryCard source={behaviors} entry={{ type: 'slab_block' }} onChange={() => {}} />);
    expect(card(host).textContent).toContain('This type has no settings. Adding it is enough.');
  });

  it('renders an unknown type in the same card with a YAML editor', () => {
    const host = render(<TypedEntryCard source={behaviors} entry={{ type: 'future_block', speed: 3 }} onChange={() => {}} />);
    const root = card(host);
    expect(root.hasAttribute('data-known')).toBe(false);
    expect(root.textContent).toContain('future_block');
    expect(root.querySelector('[data-slot=unknown-type-note]')?.textContent).toBe('No form for this type yet; edit it as YAML.');
    expect(root.querySelector('textarea')?.value).toContain('speed: 3');
  });

  it('negates an invertible entry with its switch', () => {
    const onChange = vi.fn();
    const conditions = { types: () => CE_CONDITIONS, invertible: true };
    const host = render(<TypedEntryCard source={conditions} entry={{ type: '!has_player' }} onChange={onChange} />);
    const root = card(host);
    expect(root.getAttribute('data-known')).toBe('true');
    expect(root.querySelector('[data-slot=yaml-key]')?.textContent).toBe('!has_player');
    const negate = root.querySelector('[role=switch]');
    expect(negate?.getAttribute('aria-checked')).toBe('true');
    click(negate);
    expect(onChange).toHaveBeenCalledWith({ type: 'has_player' });
  });

  it('collapses to a summary of the set keys', () => {
    const host = render(
      <TypedEntryCard
        source={behaviors}
        entry={{ type: 'crop_block', grow_speed: 0.5, light_requirement: 9 }}
        onChange={() => {}}
        defaultOpen={false}
      />,
    );
    const root = card(host);
    expect(root.querySelector('[data-slot=entry-toggle]')?.getAttribute('aria-expanded')).toBe('false');
    expect(root.textContent).toContain('grow_speed 0.5, light_requirement 9');
    click(root.querySelector('[data-slot=entry-toggle]'));
    expect(root.querySelectorAll('[data-slot=field-row]').length).toBeGreaterThan(0);
  });
});
