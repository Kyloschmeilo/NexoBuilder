/**
 * The text entries of a Nexo furniture's hitboxes, seats, beds and lights, read into their parts and written back.
 * Nexo reads each as one string (furniture-mechanic docs): barriers `x,y,z` (each axis may be a range `0..2`),
 * interactions `x,y,z [width,height]`, shulkers `x,y,z scale length [direction] [visible]`, ghasts
 * `x,y,z scale [rotation] [visible]`, seats `x,y,z`, beds `x,y,z skip_night reset_phantoms [force_visibility]` and
 * lights `x,y,z level`. Words after the ones a kind reads are kept, so writing an entry back never loses text.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';

/** An offset from the furniture's block, in blocks. */
export type NexoVec3 = [number, number, number];

/** The hitbox kinds of `Mechanics.furniture.hitbox`, by their list key. */
export const NEXO_HITBOX_KINDS = ['barriers', 'interactions', 'shulkers', 'ghasts'] as const;
export type NexoHitboxKind = (typeof NEXO_HITBOX_KINDS)[number];

/** The single-entry keys Nexo also reads next to each list key (`barrier: 0,0,0`). */
export const NEXO_HITBOX_SINGLE_KEYS: Record<NexoHitboxKind, string> = {
  barriers: 'barrier',
  interactions: 'interaction',
  shulkers: 'shulker',
  ghasts: 'ghast',
};

/** The directions a shulker hitbox opens to (UP when it names none). */
export const NEXO_SHULKER_DIRECTIONS = ['UP', 'DOWN', 'NORTH', 'SOUTH', 'EAST', 'WEST'] as const;

/** A barrier: one block, or a box of blocks where an axis is a range (`from` to `to`, both included). */
export interface NexoBarrier {
  kind: 'barriers';
  from: NexoVec3;
  to: NexoVec3;
  extra: string[];
}

/** An interaction entity; Nexo takes 1 for a width or height it does not set. */
export interface NexoInteraction {
  kind: 'interactions';
  position: NexoVec3;
  width: number | null;
  height: number | null;
  extra: string[];
}

/** A shulker entity of `scale`, opened by `length` (1–2) towards `direction`, shown when `visible`. */
export interface NexoShulker {
  kind: 'shulkers';
  position: NexoVec3;
  scale: number;
  length: number;
  direction: string | null;
  visible: boolean;
  extra: string[];
}

/** A happy ghast entity of `scale` (0.25 = one block), turned by `rotation`, shown when `visible`. */
export interface NexoGhast {
  kind: 'ghasts';
  position: NexoVec3;
  scale: number;
  rotation: number | null;
  visible: boolean;
  extra: string[];
}

export type NexoHitbox = NexoBarrier | NexoInteraction | NexoShulker | NexoGhast;

export interface NexoSeat {
  position: NexoVec3;
  extra: string[];
}

/** A bed; a flag the entry leaves out is null. */
export interface NexoBed {
  position: NexoVec3;
  skipNight: boolean | null;
  resetPhantoms: boolean | null;
  /** Read by the Nexo jar, not in the docs */
  forceVisibility: boolean | null;
  extra: string[];
}

export interface NexoLight {
  position: NexoVec3;
  /** 1–15 */
  level: number | null;
  extra: string[];
}

const NUMBER = /^-?\d+(?:\.\d+)?$/;
const toNumber = (text: string | undefined): number | null => (text !== undefined && NUMBER.test(text) ? Number(text) : null);
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);
const toBoolean = (text: string | undefined): boolean | null => {
  const lower = text?.toLowerCase();
  return lower === 'true' ? true : lower === 'false' ? false : null;
};

/** `x,y,z` into numbers; null unless it is exactly three numbers. */
function readVector(text: string | undefined): NexoVec3 | null {
  const parts = text?.split(',').map((part) => toNumber(part.trim()));
  if (parts?.length !== 3 || parts.some((n) => n === null)) return null;
  return parts as NexoVec3;
}

const writeVector = (vector: readonly number[]) => vector.join(',');

/** A barrier's offset: each axis a number or a range `a..b`. */
function readRanges(text: string | undefined): { from: NexoVec3; to: NexoVec3 } | null {
  const parts = text?.split(',').map((part) => part.trim());
  if (parts?.length !== 3) return null;
  const from: number[] = [];
  const to: number[] = [];
  for (const part of parts) {
    const [a, b, ...rest] = part.split('..');
    const start = toNumber(a);
    const end = b === undefined ? start : toNumber(b);
    if (start === null || end === null || rest.length > 0) return null;
    from.push(Math.min(start, end));
    to.push(Math.max(start, end));
  }
  return { from: from as NexoVec3, to: to as NexoVec3 };
}

/** Reads a hitbox entry of `kind`; null when Nexo could not read it either. */
export function parseNexoHitbox(kind: NexoHitboxKind, value: unknown): NexoHitbox | null {
  if (typeof value !== 'string') return null;
  const [offset, ...rest] = words(value);
  if (kind === 'barriers') {
    const ranges = readRanges(offset);
    return ranges && { kind, ...ranges, extra: rest };
  }
  const position = readVector(offset);
  if (!position) return null;
  if (kind === 'interactions') {
    const [size, ...extra] = rest;
    if (size === undefined) return { kind, position, width: null, height: null, extra };
    const [width, height, ...more] = size.split(',').map((part) => toNumber(part.trim()));
    if (width === null || height === null || height === undefined || more.length > 0) return null;
    return { kind, position, width, height, extra };
  }
  if (kind === 'shulkers') {
    const [scaleText, lengthText, ...others] = rest;
    const scale = toNumber(scaleText);
    const length = toNumber(lengthText);
    if (scale === null || length === null) return null;
    let direction: string | null = null;
    let index = 0;
    if (others[index] !== undefined && toBoolean(others[index]) === null) direction = others[index++].toUpperCase();
    const visible = toBoolean(others[index]);
    if (visible !== null) index++;
    return { kind, position, scale, length, direction, visible: visible ?? false, extra: others.slice(index) };
  }
  const [scaleText, ...others] = rest;
  const scale = toNumber(scaleText);
  if (scale === null) return null;
  let index = 0;
  const rotation = toNumber(others[index]);
  if (rotation !== null) index++;
  const visible = toBoolean(others[index]);
  if (visible !== null) index++;
  return { kind, position, scale, rotation, visible: visible ?? false, extra: others.slice(index) };
}

const axis = (from: number, to: number) => (from === to ? String(from) : `${from}..${to}`);
const join = (parts: Array<string | number | null | undefined | false>, extra: string[]) =>
  [...parts.filter((part): part is string | number => part !== null && part !== undefined && part !== false), ...extra].join(' ');

/** Writes a hitbox entry the way Nexo reads it, leaving out optional words that say nothing. */
export function formatNexoHitbox(hitbox: NexoHitbox): string {
  switch (hitbox.kind) {
    case 'barriers':
      return join([hitbox.from.map((n, i) => axis(n, hitbox.to[i])).join(',')], hitbox.extra);
    case 'interactions': {
      const sized = hitbox.width !== null || hitbox.height !== null;
      return join([writeVector(hitbox.position), sized && `${hitbox.width ?? 1},${hitbox.height ?? 1}`], hitbox.extra);
    }
    case 'shulkers': {
      // The visibility word follows the direction, so a visible shulker writes its direction too
      const direction = hitbox.direction ?? (hitbox.visible ? 'UP' : null);
      return join([writeVector(hitbox.position), hitbox.scale, hitbox.length, direction, hitbox.visible && 'true'], hitbox.extra);
    }
    case 'ghasts': {
      const rotation = hitbox.rotation ?? (hitbox.visible ? 0 : null);
      return join([writeVector(hitbox.position), hitbox.scale, rotation, hitbox.visible && 'true'], hitbox.extra);
    }
  }
}

/** A new entry of each hitbox kind: one block at the furniture's own block. */
export function newNexoHitbox(kind: NexoHitboxKind): string {
  return { barriers: '0,0,0', interactions: '0,0,0 1,1', shulkers: '0,0,0 1 1', ghasts: '0,0,0 0.25' }[kind];
}

export function parseNexoSeat(value: unknown): NexoSeat | null {
  if (typeof value !== 'string') return null;
  const [offset, ...extra] = words(value);
  const position = readVector(offset);
  return position && { position, extra };
}

export const formatNexoSeat = (seat: NexoSeat): string => join([writeVector(seat.position)], seat.extra);

export function parseNexoBed(value: unknown): NexoBed | null {
  if (typeof value !== 'string') return null;
  const [offset, ...rest] = words(value);
  const position = readVector(offset);
  if (!position) return null;
  const flags: Array<boolean | null> = [];
  let index = 0;
  while (index < 3 && rest[index] !== undefined && toBoolean(rest[index]) !== null) flags.push(toBoolean(rest[index++]));
  return {
    position,
    skipNight: flags[0] ?? null,
    resetPhantoms: flags[1] ?? null,
    forceVisibility: flags[2] ?? null,
    extra: rest.slice(index),
  };
}

/**
 * Writes a bed. Nexo reads its flags by position, so a flag before a set one is written too: a normal bed skips the
 * night and resets phantoms (docs), so a missing one is written as true; the visibility flag only when it is set.
 */
export function formatNexoBed(bed: NexoBed): string {
  const flags = [bed.skipNight, bed.resetPhantoms, bed.forceVisibility];
  const last = flags.findLastIndex((flag) => flag !== null);
  const written = flags.slice(0, last + 1).map((flag, i) => String(flag ?? i < 2));
  return join([writeVector(bed.position), ...written], bed.extra);
}

export function parseNexoLight(value: unknown): NexoLight | null {
  if (typeof value !== 'string') return null;
  const [offset, levelText, ...extra] = words(value);
  const position = readVector(offset);
  if (!position) return null;
  const level = toNumber(levelText);
  if (levelText !== undefined && level === null) return null;
  return { position, level, extra };
}

export const formatNexoLight = (light: NexoLight): string => join([writeVector(light.position), light.level], light.extra);

/** A hitbox section's entries as one list of the given kinds, each with its text; a single string counts as a list. */
export function nexoHitboxEntries(hitbox: unknown): Array<{ kind: NexoHitboxKind; text: unknown }> {
  if (!isPlainObject(hitbox)) return [];
  return NEXO_HITBOX_KINDS.flatMap((kind) => {
    const value = hitbox[kind];
    const list = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    return list.map((text) => ({ kind, text }));
  });
}

/**
 * The hitbox section with these entries: each kind's list in entry order, kinds without entries left out, keys other
 * than the four lists kept. Undefined when nothing is left.
 */
export function withNexoHitboxEntries(
  hitbox: unknown,
  entries: ReadonlyArray<{ kind: NexoHitboxKind; text: unknown }>,
): Record<string, unknown> | undefined {
  const rest = isPlainObject(hitbox) ? Object.fromEntries(Object.entries(hitbox).filter(([key]) => !isHitboxKind(key))) : {};
  const lists = Object.fromEntries(
    NEXO_HITBOX_KINDS.map((kind) => [kind, entries.filter((entry) => entry.kind === kind).map((entry) => entry.text)] as const).filter(
      ([, list]) => list.length > 0,
    ),
  );
  const next = { ...rest, ...lists };
  return Object.keys(next).length > 0 ? next : undefined;
}

const isHitboxKind = (key: string): key is NexoHitboxKind => (NEXO_HITBOX_KINDS as readonly string[]).includes(key);
