/** React access to the model thumbnails (rendering and caching: see thumbnail.ts). */
import { useEffect, useState } from 'react';
import type { ImportedModel } from '@resourcepackbuilder/minecraft';
import { cachedThumbnail, renderThumbnail } from './thumbnail';

/** The thumbnail of `model` (PNG data URL), or `null` while rendering or when there is nothing to show. */
export function useThumbnail(model: ImportedModel | null): string | null {
  const [rendered, setRendered] = useState<{ model: ImportedModel; url: string | null } | null>(null);
  useEffect(() => {
    if (!model || cachedThumbnail(model) !== undefined) return;
    let isCurrent = true;
    void renderThumbnail(model).then((url) => {
      if (isCurrent) setRendered({ model, url });
    });
    return () => {
      isCurrent = false;
    };
  }, [model]);
  if (!model) return null;
  const cached = cachedThumbnail(model);
  if (cached !== undefined) return cached;
  return rendered?.model === model ? rendered.url : null;
}
