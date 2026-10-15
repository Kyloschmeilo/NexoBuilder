import { useState, type DragEvent } from 'react';

/** Drag payload types of the sidebar tree. */
export const DRAG_ITEM = 'application/x-resourcepackbuilder-item';
export const DRAG_FOLDER = 'application/x-resourcepackbuilder-folder';
export const DRAG_FILES = 'Files';

/**
 * Highlight state and handlers of an element that accepts drops of the given payload types. Drop targets nest: an
 * event an inner target already accepted (`defaultPrevented`) is left to it, so the outer one neither highlights nor
 * handles it.
 */
export function useDropTarget(types: readonly string[], onDrop: (data: DataTransfer) => void) {
  const [isOver, setIsOver] = useState(false);
  const accepts = (e: DragEvent) => !e.defaultPrevented && types.some((type) => e.dataTransfer.types.includes(type));
  return {
    isOver,
    handlers: {
      onDragOver(e: DragEvent) {
        const accepted = accepts(e);
        if (accepted) e.preventDefault();
        setIsOver(accepted);
      },
      onDragLeave(e: DragEvent) {
        // Moving onto a child also fires dragleave; only leaving the element itself ends the highlight
        if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) setIsOver(false);
      },
      onDrop(e: DragEvent) {
        setIsOver(false);
        if (!accepts(e)) return;
        e.preventDefault();
        onDrop(e.dataTransfer);
      },
    },
  };
}
