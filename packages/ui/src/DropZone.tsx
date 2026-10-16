import { useState, type ComponentProps, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from './components/badge';
import { carriesFiles, filesFromDataTransfer, pickFiles } from './files';

/** Other props (data attributes, aria) go to the zone element. */
interface DropZoneProps extends Omit<
  ComponentProps<'div'>,
  'title' | 'children' | 'role' | 'tabIndex' | 'onClick' | 'onKeyDown' | 'onDragOver' | 'onDragLeave' | 'onDrop'
> {
  onFiles: (files: File[]) => void;
  /** File types offered by the picker (input `accept` syntax). */
  accept: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Extensions shown as badges. */
  formats?: string[];
  multiple?: boolean;
  compact?: boolean;
}

/**
 * Area that accepts dropped files (including folders) and opens the file picker on click. A handled drop
 * calls `preventDefault()`, so window-level drop handlers can skip events with `defaultPrevented`.
 */
export function DropZone({ onFiles, accept, title, subtitle, formats, multiple = true, compact, className, ...props }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const pick = async () => {
    const files = await pickFiles(accept, multiple);
    if (files.length) onFiles(files);
  };
  return (
    <div
      {...props}
      className={cn(
        'flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-input text-center text-muted-foreground transition-colors outline-none',
        'hover:border-primary hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        isDragging && 'border-primary bg-accent text-foreground',
        compact ? 'px-3.5 py-4' : 'px-5 py-8',
        className,
      )}
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
        if (!carriesFiles(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        // Moving onto a child also fires dragleave; only leaving the zone itself ends the highlight
        if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) setIsDragging(false);
      }}
      onDrop={async (e) => {
        if (!carriesFiles(e.dataTransfer)) return;
        e.preventDefault();
        setIsDragging(false);
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
          {formats.map((format) => (
            <Badge key={format} variant="outline" className="font-mono">
              {format}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
