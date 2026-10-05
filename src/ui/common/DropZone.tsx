import { useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { filesFromDataTransfer, pickFiles } from '../files';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept: string;
  title: ReactNode;
  subtitle?: ReactNode;
  formats?: string[];
  multiple?: boolean;
  compact?: boolean;
}

export function DropZone({ onFiles, accept, title, subtitle, formats, multiple = true, compact }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''}`}
      style={compact ? { padding: '16px 14px' } : undefined}
      role="button"
      tabIndex={0}
      onClick={async () => {
        const files = await pickFiles(accept, multiple);
        if (files.length) onFiles(files);
      }}
      onKeyDown={async (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const files = await pickFiles(accept, multiple);
          if (files.length) onFiles(files);
        }
      }}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        const files = await filesFromDataTransfer(e.dataTransfer);
        if (files.length) onFiles(files);
      }}
    >
      <Upload size={compact ? 20 : 28} />
      <strong>{title}</strong>
      {subtitle && <div className="small">{subtitle}</div>}
      {formats && (
        <div className="formats">
          {formats.map((f) => (
            <span key={f} className="badge mono">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
