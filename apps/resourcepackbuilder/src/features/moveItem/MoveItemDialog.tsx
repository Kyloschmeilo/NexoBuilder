import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderInput } from 'lucide-react';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { moveItem } from '../../commands/items';
import { DialogFrame } from '../../components/DialogFrame';
import { FolderSelect } from '../../components/FolderSelect';
import { closeDialog, type FeatureDialogProps } from '../../store/dialogs';
import { useOpenProject } from '../../store/project';

export function MoveItemDialog({ itemId }: FeatureDialogProps['moveItem']) {
  const t = useTranslations('dialogs.moveItem');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const close = closeDialog;
  const item = project.items[itemId];
  const [target, setTarget] = useState(item?.folderId ?? project.rootFolderIds[0]);
  if (!item) return null;
  return (
    <DialogFrame
      title={t('title')}
      icon={<FolderInput />}
      size="narrow"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={() => {
              moveItem(itemId, target);
              close();
            }}
          >
            {t('confirm')}
          </Button>
        </>
      }
    >
      <Field>
        <FieldLabel htmlFor="move-item-folder">{t('targetFolder')}</FieldLabel>
        <FolderSelect id="move-item-folder" value={target} onChange={setTarget} />
      </Field>
    </DialogFrame>
  );
}
