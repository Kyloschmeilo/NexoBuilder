import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderInput } from 'lucide-react';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { moveItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { AppDialog } from './AppDialog';
import { FolderSelect } from './FolderSelect';

export function MoveItemDialog({ itemId }: { itemId: string }) {
  const t = useTranslations('dialogs.moveItem');
  const tc = useTranslations('common');
  const project = useStore((s) => s.project)!;
  const close = useStore((s) => s.closeDialog);
  const item = project.items[itemId];
  const [target, setTarget] = useState(item?.folderId ?? project.rootFolderIds[0]);
  if (!item) return null;
  return (
    <AppDialog
      title={t('title')}
      icon={<FolderInput />}
      size="narrow"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {tc('cancel')}
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
    </AppDialog>
  );
}
