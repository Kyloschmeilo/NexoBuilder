import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/tooltip';

interface TipProps {
  /** Tooltip text; without one the trigger is rendered as is. */
  label: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** The trigger; it must accept the trigger props (a Button, a menu trigger, …). */
  children: ReactElement;
}

function isDisabled(element: ReactElement): boolean {
  const props: unknown = element.props;
  return typeof props === 'object' && props !== null && 'disabled' in props && props.disabled === true;
}

/**
 * Shows `label` as a tooltip on `children`. A disabled trigger receives no pointer events, so it is
 * wrapped in a span that carries the tooltip instead.
 */
export function Tip({ label, side, children }: TipProps) {
  if (!label) return children;
  const disabled = isValidElement(children) && isDisabled(children);
  return (
    <Tooltip>
      {disabled ? <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger> : <TooltipTrigger render={children} />}
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
