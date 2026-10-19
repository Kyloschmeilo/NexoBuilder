/** "Move item": moves an item of the open project into another folder. */
import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { createDialogHandle } from '@resourcepackbuilder/ui/components/dialog';
import { FieldRow } from '@resourcepackbuilder/ui';
import { moveItem } from '../../commands/items';
import { DialogFrame, FeatureDialog } from '../../components/DialogFrame';
import { FolderSelect } from '../../components/FolderSelect';
import { useOpenProject } from '../../store/project';

/** Opens "Move item" for an item of the open project. */
export const moveItemDialog = createDialogHandle<{ itemId: string }>();

function MoveItemFrame({ itemId }: { itemId: string }) {
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
      size="narrow"
      footer={
        <>
          <Button variant="outline" onClick={() => moveItemDialog.close()}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={() => {
              moveItem(itemId, target);
              moveItemDialog.close();
            }}
          >
            {t('confirm')}
          </Button>
        </>
      }
    >
      <FieldRow label={t('targetFolder')} htmlFor={folderFieldId} layout="stacked">
        <FolderSelect id={folderFieldId} value={target} onChange={setTarget} />
      </FieldRow>
    </DialogFrame>
  );
}

/** Moves an item into another folder. */
export function MoveItemDialog() {
  return <FeatureDialog handle={moveItemDialog}>{({ itemId }) => <MoveItemFrame itemId={itemId} />}</FeatureDialog>;
}
