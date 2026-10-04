import { useState } from 'react';
import { FolderInput } from 'lucide-react';
import { moveItem } from '../../state/actions';
import { useStore } from '../../state/store';
import { Modal } from '../common/Modal';
import { FolderSelect } from './FolderSelect';

export function MoveItemDialog({ itemId }: { itemId: string }) {
  const project = useStore((s) => s.project)!;
  const close = useStore((s) => s.closeDialog);
  const item = project.items[itemId];
  const [target, setTarget] = useState(item?.folderId ?? project.rootFolderIds[0]);
  if (!item) return null;
  return (
    <Modal
      title="Item verschieben"
      icon={<FolderInput size={20} />}
      onClose={close}
      size="narrow"
      footer={
        <>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <button
            className="btn primary"
            onClick={() => {
              moveItem(itemId, target);
              close();
            }}
          >
            Verschieben
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Zielordner</span>
        <FolderSelect value={target} onChange={setTarget} />
      </label>
    </Modal>
  );
}
