/** The small coloured dot that marks a pack target (Nexo or CraftEngine) next to its name. */
import { cn } from '@resourcepackbuilder/ui/cn';
import type { PackTargetId } from '@resourcepackbuilder/core/project';

/** Dot colour of each target: the fixed target marker tokens, readable on every theme. */
const TARGET_DOT_CLASS: Record<PackTargetId, string> = {
  nexo: 'bg-target-nexo',
  craftengine: 'bg-target-ce',
};

/** A decorative dot in the colour of `target`; the target's name is always written beside it. */
export function TargetDot({ target, className }: { target: PackTargetId; className?: string }) {
  return <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', TARGET_DOT_CLASS[target], className)} />;
}
