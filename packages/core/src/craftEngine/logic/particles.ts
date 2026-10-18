/**
 * The keys of one particle effect as CraftEngine reads them (`ParticleConfig` and `ParticleDataTypes`): the particle,
 * its position, count, spread and speed, and the data some particle types need (a block state, an item, a color …).
 * Shared by the `particle` function and the particle block behaviors (`simple_particle_block`,
 * `wall_torch_particle_block`); each data key shows only for the particle types that read it.
 */
import { keySegment } from '@resourcepackbuilder/utils';
import { field, type FieldSpec, type FieldSpecs } from '../../form/build';
import { plainOptions } from '../../form/options';
import { numberProvider } from './shared';

/** The particle types whose data CraftEngine reads, by data key (vanilla ids without namespace) */
const DATA_PARTICLES = {
  block_state: ['block', 'falling_dust', 'dust_pillar', 'block_crumble', 'block_marker'],
  item: ['item'],
  color: ['entity_effect', 'tinted_leaves', 'dust', 'spell', 'trail'],
  scale: ['dust', 'dust_color_transition'],
  power: ['spell'],
  from: ['dust_color_transition'],
  to: ['dust_color_transition'],
  target_x: ['vibration', 'trail'],
  target_y: ['vibration', 'trail'],
  target_z: ['vibration', 'trail'],
  arrival_time: ['vibration'],
  duration: ['trail'],
  charge: ['sculk_charge'],
  shriek: ['shriek'],
  blocks: ['geyser', 'geyser_plume', 'geyser_base', 'geyser_poof'],
  burst_impulse_base: ['geyser_base', 'geyser_poof'],
} as const;

/** Common particle types offered as suggestions (any other particle id can be typed) */
export const CE_PARTICLE_TYPES: readonly string[] = [
  ...new Set([
    'flame',
    'soul_fire_flame',
    'small_flame',
    'smoke',
    'large_smoke',
    'campfire_cosy_smoke',
    'cloud',
    'end_rod',
    'enchant',
    'portal',
    'heart',
    'happy_villager',
    'angry_villager',
    'note',
    'crit',
    'enchanted_hit',
    'witch',
    'glow',
    'electric_spark',
    'wax_on',
    'wax_off',
    'dripping_water',
    'dripping_lava',
    'bubble',
    'splash',
    'snowflake',
    'cherry_leaves',
    'spore_blossom_air',
    'firework',
    'totem_of_undying',
    ...Object.values(DATA_PARTICLES).flat(),
  ]),
].map((name) => `minecraft:${name}`);

/** Shows a data key only for the particles that read it (written with or without the `minecraft:` namespace) */
const forParticles = (names: readonly string[]) => ({
  showIf: { key: 'particle', values: names.flatMap((name) => [name, `minecraft:${name}`]) },
});

/** Every particle key shares its messages across the catalogs (`logic.shared.particle.<key>`) */
const shared = <S extends FieldSpec>(key: string, spec: S): S => ({ ...spec, scope: `logic.shared.particle.${keySegment(key)}` }) as S;

const color = () => field.text({ placeholder: true });
const data = (key: keyof typeof DATA_PARTICLES, spec: FieldSpec): FieldSpec =>
  shared(key, { ...spec, ...forParticles(DATA_PARTICLES[key]), help: true });

/**
 * The keys of one particle effect. `x`, `y` and `z` are relative to the block for a block's particles and default to
 * the event's position for the `particle` function.
 */
export function particleFields(): FieldSpecs {
  return {
    particle: shared('particle', field.text({ format: 'resource', suggestions: plainOptions(CE_PARTICLE_TYPES), help: true })),
    x: shared('x', numberProvider()),
    y: shared('y', numberProvider()),
    z: shared('z', numberProvider()),
    count: shared('count', { ...numberProvider(), help: true }),
    offset_x: shared('offset_x', { ...numberProvider(), help: true }),
    offset_y: shared('offset_y', numberProvider()),
    offset_z: shared('offset_z', numberProvider()),
    speed: shared('speed', { ...numberProvider(), help: true }),
    block_state: data('block_state', field.text({ placeholder: true })),
    item: data('item', field.text({ format: 'resource' })),
    color: data('color', color()),
    from: data('from', color()),
    to: data('to', color()),
    scale: data('scale', field.number({ min: 0, step: 0.1 })),
    power: data('power', field.number({ min: 0, step: 0.1 })),
    target_x: data('target_x', numberProvider()),
    target_y: data('target_y', numberProvider()),
    target_z: data('target_z', numberProvider()),
    arrival_time: data('arrival_time', numberProvider()),
    duration: data('duration', numberProvider()),
    charge: data('charge', field.number({ step: 0.1 })),
    shriek: data('shriek', field.number({ integer: true, min: 0 })),
    blocks: data('blocks', field.number({ integer: true, min: 0 })),
    burst_impulse_base: data('burst_impulse_base', field.number({ step: 0.1 })),
  };
}
