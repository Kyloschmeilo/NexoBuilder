/** A vertical drag handle on the edge of a side panel that changes the panel's width by mouse, touch or keyboard. */
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@resourcepackbuilder/ui/cn';
import type { WidthRange } from '../store/ui';

/** Pixels per arrow key press (Shift: four times as much). */
const KEY_STEP_PX = 16;

interface ResizeHandleProps {
  /** Which edge of its panel the handle sits on: dragging away from the panel makes it wider */
  edge: 'left' | 'right';
  width: number;
  range: WidthRange;
  onResize: (width: number) => void;
  /** Accessible name, e.g. "Resize sidebar" */
  label: string;
  className?: string;
}

/**
 * The handle is a focusable separator: arrow keys change the width, Home and End jump to the limits, a double click
 * restores the initial width. It sits absolutely on its panel's edge, so the panel needs `position: relative`.
 */
export function ResizeHandle({ edge, width, range, onResize, label, className }: ResizeHandleProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  // Dragging right widens a panel whose handle is on its right edge, and narrows one whose handle is on its left
  const direction = edge === 'right' ? 1 : -1;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startWidth: width };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onResize(drag.current.startWidth + (e.clientX - drag.current.startX) * direction);
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP_PX * 4 : KEY_STEP_PX;
    const next =
      e.key === 'ArrowRight'
        ? width + step * direction
        : e.key === 'ArrowLeft'
          ? width - step * direction
          : e.key === 'Home'
            ? range.min
            : e.key === 'End'
              ? range.max
              : null;
    if (next === null) return;
    e.preventDefault();
    onResize(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={range.min}
      aria-valuemax={range.max}
      aria-valuenow={width}
      tabIndex={0}
      className={cn(
        'group/resize absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-none',
        edge === 'right' ? '-right-1' : '-left-1',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onResize(range.initial)}
      onKeyDown={onKeyDown}
    >
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover/resize:bg-primary group-focus-visible/resize:bg-primary group-active/resize:bg-primary" />
    </div>
  );
}
