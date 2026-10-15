/** The optional pack icon (pack.png) of the open project: preview, upload and remove. */
import { useTranslations } from 'next-intl';
import { ImageUp, Trash2 } from 'lucide-react';
import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/binary/png';
import { pickFiles, readPngFile } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { updateProjectSettings } from '../../commands/settings';
import { toast } from '../../store/notifications';

export function PackIconField({ packIcon }: { packIcon: string | null }) {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');

  const upload = async () => {
    const [file] = await pickFiles('.png,image/png', false);
    if (!file) return;
    const dataUrl = await readPngFile(file);
    if (!readPngInfoFromDataUrl(dataUrl)) {
      toast('error', t('invalidPng'));
      return;
    }
    updateProjectSettings((p) => (p.settings.packIcon = dataUrl));
  };

  return (
    <Field>
      <FieldTitle>{t('packIcon')}</FieldTitle>
      <div className="flex max-w-md gap-3 rounded-md border border-border bg-muted/40 p-3">
        <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-sm bg-background">
          {packIcon ? (
            <img src={packIcon} alt="" className="max-h-full max-w-full [image-rendering:pixelated]" />
          ) : (
            <ImageUp className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="text-xs text-muted-foreground">{t('packIconHint')}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void upload()}>
              <ImageUp /> {packIcon ? t('replace') : t('upload')}
            </Button>
            {packIcon && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => updateProjectSettings((p) => (p.settings.packIcon = null))}
              >
                <Trash2 /> {tCommon('remove')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Field>
  );
}
