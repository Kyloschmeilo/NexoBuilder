import { useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from './components/badge';
import { filesFromDataTransfer, pickFiles } from './files';

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
  const pick = async () => {
    const files = await pickFiles(accept, multiple);
    if (files.length) onFiles(files);
  };
  return (
    <div
      className={cn(
        'group/dropzone flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-input text-center text-muted-foreground transition-colors outline-none',
        'hover:border-primary hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        dragging && 'border-primary bg-accent text-foreground',
        compact ? 'px-3.5 py-4' : 'px-5 py-8',
      )}
      data-dragging={dragging || undefined}
      role="button"
      tabIndex={0}
      onClick={() => void pick()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void pick();
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
      <Upload className={cn('text-primary', compact ? 'size-5' : 'size-7')} />
      <strong className="mt-2 mb-1 block font-heading text-base leading-5 font-semibold tracking-[0.06em] text-foreground uppercase">
        {title}
      </strong>
      {subtitle && <div className="text-[13px] leading-[18px]">{subtitle}</div>}
      {formats && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {formats.map((f) => (
            <Badge key={f} variant="outline" className="font-mono">
              {f}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
