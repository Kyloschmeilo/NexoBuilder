import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'narrow' | 'normal' | 'wide';
  /** Schließen per Klick auf den Hintergrund verhindern (z.B. bei ungespeicherten Eingaben) */
  sticky?: boolean;
}

export function Modal({ title, icon, onClose, children, footer, size = 'normal', sticky }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (!sticky && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${size === 'normal' ? '' : size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          {icon}
          <h2>{title}</h2>
          <button className="btn ghost icon" onClick={onClose} title="Schließen" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
