/** The optional pack icon (pack.png) of the open project: preview, upload and remove. */
import { useTranslations } from 'next-intl';
import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/binary/png';
import { pickFiles, readPngAsDataUrl } from '@resourcepackbuilder/ui';
import { Field, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { updateProjectSettings } from '../../commands/settings';
import { ImageUploadField } from '../../components/ImageUploadField';
import { notify } from '../../shell/notify';

export function PackIconField({ packIcon }: { packIcon: string | null }) {
  const t = useTranslations('dialogs.settings');

  const upload = async () => {
    const [file] = await pickFiles('.png,image/png', false);
    if (!file) return;
    const dataUrl = await readPngAsDataUrl(file);
    if (!readPngInfoFromDataUrl(dataUrl)) {
      notify('error', t('invalidPng'));
      return;
    }
    updateProjectSettings((p) => (p.settings.packIcon = dataUrl));
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
