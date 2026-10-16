/** The optional pack icon (pack.png) of the open project: preview, upload and remove. */
import { useTranslations } from 'next-intl';
import { Field, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { updateProjectSettings } from '../../commands/settings';
import { ImageUploadField } from '../../components/ImageUploadField';
import { usePngPicker } from '../../hooks/useFileReaders';

export function PackIconField({ packIcon }: { packIcon: string | null }) {
  const t = useTranslations('dialogs.settings');
  const pickPng = usePngPicker();

  const upload = async () => {
    const png = await pickPng();
    if (png) updateProjectSettings((p) => (p.settings.packIcon = png.dataUrl));
  };

  return (
    <Field>
      <FieldTitle>{t('packIcon')}</FieldTitle>
      <ImageUploadField
        className="max-w-md"
        src={packIcon}
        details={<span className="text-xs text-muted-foreground">{t('packIconHint')}</span>}
        hint={t('packIconHint')}
        uploadLabel={t('upload')}
        replaceLabel={t('replace')}
        onUpload={() => void upload()}
        onRemove={() => updateProjectSettings((p) => (p.settings.packIcon = null))}
      />
    </Field>
  );
}
