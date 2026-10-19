import type { ReactNode } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Thumb } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card } from '@resourcepackbuilder/ui/components/card';

interface ImageUploadFieldProps {
  /** The current image; without one `hint` is shown. */
  src?: string | null;
  /** Facts about the current image (name, size). */
  details?: ReactNode;
  /** Shown while there is no image. */
  hint: ReactNode;
  uploadLabel: string;
  replaceLabel: string;
  onUpload: () => void;
  /** Offers "Remove" while there is an image. */
  onRemove?: () => void;
  className?: string;
}

/** Preview of one optional image with upload/replace and remove buttons. */
export function ImageUploadField({ src, details, hint, uploadLabel, replaceLabel, onUpload, onRemove, className }: ImageUploadFieldProps) {
  const tCommon = useTranslations('common');
  return (
    <Card variant="muted" size="sm" className={cn('flex-row p-3', className)}>
      <Thumb src={src} fallback={<ImageUp className="size-5.5" />} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 text-sm">
        {src ? details : <span className="text-xs text-muted-foreground">{hint}</span>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onUpload}>
            <ImageUp /> {src ? replaceLabel : uploadLabel}
          </Button>
          {src && onRemove && (
            <Button type="button" variant="ghost-destructive" size="sm" onClick={onRemove}>
              <Trash2 /> {tCommon('remove')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
