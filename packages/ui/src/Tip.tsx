import { isValidElement, type ReactElement, type ReactNode, useId } from 'react';
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
 * Shows `label` as a tooltip on `children`. A disabled trigger receives no pointer events and no focus, so it is
 * wrapped in a focusable span that carries the tooltip instead and is described by `label`, which tells keyboard and
 * screen reader users why the control is disabled.
 */
export function Tip({ label, side, children }: TipProps) {
  const descriptionId = useId();
  if (!label) return children;
  const isTriggerDisabled = isValidElement(children) && isDisabled(children);
  return (
    <Tooltip>
      {isTriggerDisabled ? (
        <TooltipTrigger
          render={
            <span
              className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              tabIndex={0}
              aria-describedby={descriptionId}
            />
          }
        >
          {children}
          <span id={descriptionId} hidden>
            {label}
          </span>
        </TooltipTrigger>
      ) : (
        <TooltipTrigger render={children} />
      )}
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
