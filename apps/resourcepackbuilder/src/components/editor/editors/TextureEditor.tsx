import { useTranslations } from 'next-intl';
import type { TextureField } from '@resourcepackbuilder/core/nexo/form/fields';
import { pickFiles, PNG_ACCEPT } from '@resourcepackbuilder/ui';
import { ImageUploadField } from '../../ImageUploadField';
import { useFieldContext } from '../fieldContext';
import { FieldShell } from '../FieldShell';
import type { EditorProps } from '../types';

/** An extra PNG of the item (e.g. an armor layer); the value is its "@asset:<id>" token. */
export function TextureEditor({ field, value, onChange, hideLabel }: EditorProps<TextureField>) {
  const t = useTranslations('editor');
  const { getAsset, uploadAsset } = useFieldContext();
  const texture = typeof value === 'string' ? getAsset(value) : undefined;

  const upload = async () => {
    const [file] = await pickFiles(PNG_ACCEPT, false);
    if (!file) return;
    const token = await uploadAsset(file);
    if (token) onChange(token);
  };

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <ImageUploadField
        className="max-w-lg"
        src={texture?.dataUrl}
        details={
          texture && (
            <>
              <strong className="truncate font-semibold">{texture.name}.png</strong>
              <span className="text-muted-foreground">
                {texture.width}×{texture.height} px
              </span>
            </>
          )
        }
        hint={field.sizeHint ? t('field.noTextureHint', { size: field.sizeHint }) : t('field.noTexture')}
        uploadLabel={t('field.uploadPng')}
        replaceLabel={t('field.replace')}
        onUpload={() => void upload()}
        onRemove={() => onChange(undefined)}
      />
    </FieldShell>
  );
}
