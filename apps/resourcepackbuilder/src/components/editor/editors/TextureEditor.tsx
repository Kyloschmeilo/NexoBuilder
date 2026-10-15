import { ImageUp, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TextureField } from '@resourcepackbuilder/core/nexo/fields';
import { pickFiles, Thumb } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { useFieldContext } from '../fieldContext';
import { FieldShell } from '../FieldShell';
import type { EditorProps } from '../types';

/** An extra PNG of the item (e.g. an armor layer); the value is its "@asset:<id>" token. */
export function TextureEditor({ field, value, onChange, hideLabel }: EditorProps<TextureField>) {
  const t = useTranslations('editor');
  const tCommon = useTranslations('common');
  const { getAsset, uploadAsset } = useFieldContext();
  const texture = typeof value === 'string' ? getAsset(value) : undefined;

  const upload = async () => {
    const [file] = await pickFiles('.png,image/png', false);
    if (!file) return;
    const token = await uploadAsset(file);
    if (token) onChange(token);
  };

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <div className="flex max-w-lg gap-3 rounded-md border border-border bg-muted/40 p-3">
        <Thumb src={texture?.dataUrl} fallback={<ImageUp className="size-5.5" />} />
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          {texture ? (
            <>
              <strong className="truncate font-semibold">{texture.name}.png</strong>
              <span className="text-muted-foreground">
                {texture.width}×{texture.height} px
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {field.sizeHint ? t('field.noTextureHint', { size: field.sizeHint }) : t('field.noTexture')}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void upload()}>
              <ImageUp /> {texture ? t('field.replace') : t('field.uploadPng')}
            </Button>
            {texture && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onChange(undefined)}
              >
                <Trash2 /> {tCommon('remove')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </FieldShell>
  );
}
