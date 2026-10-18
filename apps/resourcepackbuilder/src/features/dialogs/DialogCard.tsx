/** Card of one Nexo dialog: its ID (the file name) and the dialog file's content in the generic field editor. */
import { useTranslations } from 'next-intl';
import { normalizeTypedId } from '@resourcepackbuilder/minecraft';
import { NEXO_DIALOG_FIELD } from '@resourcepackbuilder/core/nexo';
import { type Dialog, dialogKey, toConfigValue } from '@resourcepackbuilder/core/project';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { isPlainObject, issuesFor } from '@resourcepackbuilder/utils';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { setDialogConfig, updateDialog } from '../../commands/media';
import { FormField } from '../../components/FormField';
import { IssueList } from '../../components/IssueList';
import { MediaCard } from '../media/MediaCard';
import { NexoKey } from '../media/NexoKey';
import { useMediaActions } from '../media/useMediaActions';
import { ObjectFieldRows } from './ObjectFieldRows';

export function DialogCard({ dialog, plan }: { dialog: Dialog; plan: ExportPlan | null }) {
  const t = useTranslations('media.dialogs');
  const tShared = useTranslations('media.shared');
  const media = useMediaActions();
  const issues = plan ? issuesFor(plan.issues, { kind: 'dialog', id: dialog.id }) : [];
  const type = typeof dialog.config.type === 'string' ? dialog.config.type : 'NOTICE';

  return (
    <MediaCard
      title={dialog.dialogId}
      badges={<Badge variant="secondary">{type}</Badge>}
      usage={dialogKey(dialog.dialogId)}
      copyLabel={tShared('copyId')}
      deleteLabel={t('delete')}
      onDelete={() => void media.remove('dialog', dialog)}
    >
      <FormField label={<NexoKey>ID</NexoKey>} help={t('idHelp')}>
        <Input
          className="font-mono"
          value={dialog.dialogId}
          onChange={(e) => updateDialog(dialog.id, (d) => (d.dialogId = normalizeTypedId(e.target.value)), 'id')}
        />
      </FormField>
      <ObjectFieldRows
        field={NEXO_DIALOG_FIELD}
        value={dialog.config}
        onChange={(value) => {
          const config = toConfigValue(value);
          setDialogConfig(dialog.id, isPlainObject(config) ? config : {});
        }}
      />
      <IssueList issues={issues} />
    </MediaCard>
  );
}
