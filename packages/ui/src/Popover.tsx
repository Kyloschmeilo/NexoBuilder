import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number;
}

/** Schwebendes Menü, das an einem Element ausgerichtet wird. */
export function Popover({ anchor, open, onClose, children, align = 'left', width }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const popWidth = width ?? ref.current?.offsetWidth ?? 260;
    let left = align === 'right' ? rect.right - popWidth : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - popWidth - 8));
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    if (spaceBelow < 240 && spaceAbove > spaceBelow) {
      const maxHeight = Math.min(spaceAbove, window.innerHeight * 0.7);
      const height = Math.min(ref.current?.scrollHeight ?? maxHeight, maxHeight);
      setPos({ top: rect.top - height - 4, left, maxHeight });
    } else {
      setPos({ top: rect.bottom + 4, left, maxHeight: Math.min(spaceBelow, window.innerHeight * 0.7) });
    }
  }, [open, anchor, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) || anchor?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, anchor, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      className="popover"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width,
        maxHeight: pos?.maxHeight,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
}

export function MenuItem({ icon, label, description, onClick, danger, disabled, active }: MenuItemProps) {
  return (
    <button
      className={`menu-item ${danger ? 'danger' : ''} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {icon && <span style={{ marginTop: 1, display: 'flex' }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        {label}
        {description && <span className="menu-desc">{description}</span>}
      </span>
    </button>
  );
}
