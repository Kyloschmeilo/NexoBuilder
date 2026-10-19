import { describe, expect, it } from 'vitest';
import {
  formatNexoBed,
  formatNexoHitbox,
  formatNexoLight,
  formatNexoSeat,
  isReadableNexoEntry,
  NEXO_HITBOX_KINDS,
  newNexoHitbox,
  nexoHitboxEntries,
  parseNexoBed,
  parseNexoHitbox,
  parseNexoLight,
  parseNexoSeat,
  withNexoHitboxEntries,
} from './furnitureEntries';

describe('Nexo furniture hitbox entries', () => {
  it('reads barriers with ranges and writes them back', () => {
    const barrier = parseNexoHitbox('barriers', '0..1,0..2,0');
    expect(barrier).toEqual({ kind: 'barriers', from: [0, 0, 0], to: [1, 2, 0], extra: [] });
    expect(formatNexoHitbox(barrier!)).toBe('0..1,0..2,0');
    expect(formatNexoHitbox(parseNexoHitbox('barriers', '2..1,0,0')!)).toBe('1..2,0,0');
    expect(parseNexoHitbox('barriers', '0,0')).toBeNull();
  });

  it('reads interactions with and without a size', () => {
    expect(parseNexoHitbox('interactions', '0,0.5,0 1.5,2')).toEqual({
      kind: 'interactions',
      position: [0, 0.5, 0],
      width: 1.5,
      height: 2,
      extra: [],
    });
    const unsized = parseNexoHitbox('interactions', '0,0,0');
    expect(unsized).toMatchObject({ width: null, height: null });
    expect(formatNexoHitbox(unsized!)).toBe('0,0,0');
    expect(formatNexoHitbox({ ...(unsized as Extract<typeof unsized, { kind: 'interactions' }>)!, width: 2 })).toBe('0,0,0 2,1');
    expect(parseNexoHitbox('interactions', '0,0,0 1')).toBeNull();
  });

  it('reads shulkers with their optional direction and visibility', () => {
    expect(parseNexoHitbox('shulkers', '0,0,0 1 1.5 north true')).toEqual({
      kind: 'shulkers',
      position: [0, 0, 0],
      scale: 1,
      length: 1.5,
      direction: 'NORTH',
      visible: true,
      extra: [],
    });
    const plain = parseNexoHitbox('shulkers', '0,0,0 1 1');
    expect(plain).toMatchObject({ direction: null, visible: false });
    expect(formatNexoHitbox(plain!)).toBe('0,0,0 1 1');
    // The visibility word needs the direction before it
    expect(formatNexoHitbox({ ...(plain as Extract<typeof plain, { kind: 'shulkers' }>)!, visible: true })).toBe('0,0,0 1 1 UP true');
    expect(parseNexoHitbox('shulkers', '0,0,0 1')).toBeNull();
  });

  it('reads ghasts with their optional rotation and visibility', () => {
    expect(parseNexoHitbox('ghasts', '0,0,0 0.25 90 true')).toMatchObject({ scale: 0.25, rotation: 90, visible: true });
    expect(parseNexoHitbox('ghasts', '0,0,0 0.25 true')).toMatchObject({ rotation: null, visible: true });
    expect(formatNexoHitbox(parseNexoHitbox('ghasts', '0,0,0 0.25 true')!)).toBe('0,0,0 0.25 0 true');
    expect(formatNexoHitbox(parseNexoHitbox('ghasts', '0,0,0 0.25')!)).toBe('0,0,0 0.25');
  });

  it('reads offsets and sizes with spaces after the commas, as the export checks do', () => {
    expect(parseNexoHitbox('barriers', '-1, 0, 0')).toMatchObject({ from: [-1, 0, 0] });
    expect(parseNexoHitbox('interactions', '0, 1, 0 1, 2')).toMatchObject({ position: [0, 1, 0], width: 1, height: 2 });
  });

  it('keeps words it does not read, but the entry is then not readable', () => {
    expect(isReadableNexoEntry(parseNexoHitbox('interactions', '0,0,0 1,1'))).toBe(true);
    expect(isReadableNexoEntry(parseNexoHitbox('interactions', '0,0,0 1,1 future'))).toBe(false);
    expect(isReadableNexoEntry(null)).toBe(false);
    expect(formatNexoHitbox(parseNexoHitbox('interactions', '0,0,0 1,1 future')!)).toBe('0,0,0 1,1 future');
    expect(formatNexoSeat(parseNexoSeat('0,0.5,0 90')!)).toBe('0,0.5,0 90');
  });

  it('starts every kind with an entry it can read', () => {
    for (const kind of NEXO_HITBOX_KINDS) expect(parseNexoHitbox(kind, newNexoHitbox(kind))).not.toBeNull();
  });

  it('lists the entries of all kinds and writes them back by kind, keeping other keys', () => {
    const hitbox = { barriers: ['0,0,0', '1,0,0'], interactions: '0,1,0 1,1', barrier: '5,5,5' };
    const entries = nexoHitboxEntries(hitbox);
    expect(entries).toEqual([
      { kind: 'barriers', text: '0,0,0' },
      { kind: 'barriers', text: '1,0,0' },
      { kind: 'interactions', text: '0,1,0 1,1' },
    ]);
    expect(withNexoHitboxEntries(hitbox, [entries[2], { kind: 'shulkers', text: '0,0,0 1 1' }])).toEqual({
      barrier: '5,5,5',
      interactions: ['0,1,0 1,1'],
      shulkers: ['0,0,0 1 1'],
    });
    expect(withNexoHitboxEntries({ barriers: ['0,0,0'] }, [])).toBeUndefined();
  });
});

describe('Nexo furniture seats, beds and lights', () => {
  it('reads seats', () => {
    expect(parseNexoSeat('0,0.5,0')).toEqual({ position: [0, 0.5, 0], extra: [] });
    expect(parseNexoSeat('a,b,c')).toBeNull();
  });

  it('reads beds and writes the flags Nexo reads by position', () => {
    expect(parseNexoBed('0,0,0 true false')).toEqual({
      position: [0, 0, 0],
      skipNight: true,
      resetPhantoms: false,
      forceVisibility: null,
      extra: [],
    });
    const bare = parseNexoBed('0,0,0')!;
    expect(formatNexoBed(bare)).toBe('0,0,0');
    expect(formatNexoBed({ ...bare, resetPhantoms: false })).toBe('0,0,0 true false');
    expect(formatNexoBed({ ...bare, forceVisibility: true })).toBe('0,0,0 true true true');
  });

  it('reads lights with their level', () => {
    expect(parseNexoLight('0,1,0 15')).toEqual({ position: [0, 1, 0], level: 15, extra: [] });
    expect(formatNexoLight({ position: [1, 0, 0], level: 7, extra: [] })).toBe('1,0,0 7');
    expect(parseNexoLight('0,1,0 bright')).toBeNull();
    // The level is required
    expect(parseNexoLight('0,1,0')).toBeNull();
  });
});
