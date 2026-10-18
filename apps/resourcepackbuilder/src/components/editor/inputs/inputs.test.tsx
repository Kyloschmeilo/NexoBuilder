// @vitest-environment jsdom
/** `Vector3Input` (parsing, formatting, axis edits) and `BooleanSwitch` (required, unset with the plugin default). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, click, render, type } from '../../catalog/testRender';
import { BooleanSwitch } from './BooleanSwitch';
import { formatVector3, parseVector3, Vector3Input } from './Vector3Input';

afterEach(cleanup);

describe('Vector3Input', () => {
  it('parses and formats the text form', () => {
    expect(parseVector3('0.5,1,-2')).toEqual([0.5, 1, -2]);
    expect(parseVector3('0.5 1 -2')).toEqual([0.5, 1, -2]);
    expect(parseVector3(' 1 , 2 , 3 ')).toEqual([1, 2, 3]);
    expect(parseVector3('1,2')).toBeUndefined();
    expect(parseVector3('a,b,c')).toBeUndefined();
    expect(parseVector3('')).toBeUndefined();
    expect(formatVector3([1, undefined, 3])).toBe('1,0,3');
    expect(formatVector3([1, 2, 3], ' ')).toBe('1 2 3');
    expect(formatVector3([undefined, undefined, undefined])).toBeUndefined();
  });

  it('names each axis and writes the whole vector on an edit', () => {
    const onChange = vi.fn();
    const host = render(<Vector3Input label="Position" value={[0, 1, 2]} onChange={onChange} />);
    const inputs = [...host.querySelectorAll('input')];
    expect(inputs.map((input) => input.getAttribute('aria-label'))).toEqual(['Position x', 'Position y', 'Position z']);
    expect(inputs.map((input) => input.value)).toEqual(['0', '1', '2']);
    type(inputs[1], '4.5');
    expect(onChange).toHaveBeenLastCalledWith([0, 4.5, 2]);
  });

  it('gives undefined once every axis is empty', () => {
    const onChange = vi.fn();
    const host = render(<Vector3Input label="Scale" value={[undefined, 2, undefined]} onChange={onChange} />);
    type(host.querySelectorAll('input')[1], '');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});

describe('BooleanSwitch', () => {
  const state = (host: HTMLElement) => host.querySelector('[data-slot=boolean-switch]') as HTMLElement;

  it('switches a required value with no unset button', () => {
    const onChange = vi.fn();
    const host = render(<BooleanSwitch required value={false} onChange={onChange} label="Glint" />);
    expect(state(host).textContent).toBe('Off');
    expect(host.querySelectorAll('button:not([role=switch])')).toHaveLength(0);
    click(host.querySelector('[role=switch]'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows the plugin default while unset and sets the opposite on a click', () => {
    const onChange = vi.fn();
    const host = render(<BooleanSwitch value={undefined} defaultValue onChange={onChange} label="Glint" />);
    expect(state(host).hasAttribute('data-unset')).toBe(true);
    expect(state(host).textContent).toBe('Default: On');
    expect(host.querySelector('[role=switch]')?.getAttribute('aria-checked')).toBe('true');
    click(host.querySelector('[role=switch]'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('clears a set value with the unset button', () => {
    const onChange = vi.fn();
    const host = render(<BooleanSwitch value onChange={onChange} label="Glint" />);
    expect(state(host).textContent).toContain('On');
    const unset = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Unset');
    click(unset);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
