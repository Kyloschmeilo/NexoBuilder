/** The server plugin a project's pack is built for. */
export const PACK_TARGETS = ['nexo', 'craftengine'] as const;

export type PackTargetId = (typeof PACK_TARGETS)[number];

export const DEFAULT_PACK_TARGET: PackTargetId = 'nexo';
