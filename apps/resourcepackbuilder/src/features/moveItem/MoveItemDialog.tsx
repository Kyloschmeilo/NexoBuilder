import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderInput } from 'lucide-react';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { moveItem } from '../../commands/items';
import { DialogFrame } from '../../components/DialogFrame';
import { FolderSelect } from '../../components/FolderSelect';
import { closeDialog, type FeatureDialogProps } from '../../store/dialogs';
import { useOpenProject } from '../../store/project';

/** Moves an item into another folder. */
export function MoveItemDialog({ itemId }: FeatureDialogProps['moveItem']) {
  const t = useTranslations('dialogs.moveItem');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const folderFieldId = useId();
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
          <Button variant="outline" onClick={closeDialog}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={() => {
              moveItem(itemId, target);
              closeDialog();
            }}
          >
            {t('confirm')}
          </Button>
        </>
      }
    >
      <Field>
        <FieldLabel htmlFor={folderFieldId}>{t('targetFolder')}</FieldLabel>
        <FolderSelect id={folderFieldId} value={target} onChange={setTarget} />
      </Field>
    </DialogFrame>
  );
}
