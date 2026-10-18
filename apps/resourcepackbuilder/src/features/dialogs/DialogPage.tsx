/** The page of one Nexo dialog: its ID (the file name) and the dialog file's content in the generic field editor. */
import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { normalizeTypedId } from '@resourcepackbuilder/minecraft';
import { NEXO_DIALOG_FIELD } from '@resourcepackbuilder/core/nexo';
import { type Dialog, dialogKey, toConfigValue } from '@resourcepackbuilder/core/project';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { isPlainObject, issuesFor } from '@resourcepackbuilder/utils';
import { FieldGroup, Section, StatusPill } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { setDialogConfig, updateDialog } from '../../commands/media';
import { MediaEntryFrame } from '../media/MediaEntryFrame';
import { MediaField } from '../media/MediaFields';
import { ObjectFieldRows } from './ObjectFieldRows';

export function DialogPage({ dialog, plan }: { dialog: Dialog; plan: ExportPlan | null }) {
  const t = useTranslations('media.dialogs');
  const tShared = useTranslations('media.shared');
  const tField = useTranslations('media.fields');
  const tSection = useTranslations('media.sections');
  const issues = plan ? issuesFor(plan.issues, { kind: 'dialog', id: dialog.id }) : [];
  const type = typeof dialog.config.type === 'string' ? dialog.config.type : 'NOTICE';

  return (
    <MediaEntryFrame
      kind="dialog"
      entry={dialog}
      title={dialog.dialogId}
      thumb={<MessageSquare />}
      meta={<StatusPill tone="info" label={type} />}
      usage={dialogKey(dialog.dialogId)}
      copyLabel={tShared('copyId')}
      issues={issues}
    >
      <Section id="basics" title={tSection('basics')}>
        <FieldGroup>
          <MediaField label={tField('id')} help={t('idHelp')}>
            {(id) => (
              <Input
                id={id}
                className="font-mono"
                value={dialog.dialogId}
                onChange={(e) => updateDialog(dialog.id, (d) => (d.dialogId = normalizeTypedId(e.target.value)), 'id')}
              />
            )}
          </MediaField>
        </FieldGroup>
      </Section>
      <Section id="content" title={tSection('content')}>
        <ObjectFieldRows
          field={NEXO_DIALOG_FIELD}
          value={dialog.config}
          onChange={(value) => {
            const config = toConfigValue(value);
            setDialogConfig(dialog.id, isPlainObject(config) ? config : {});
          }}
        />
      </Section>
    </MediaEntryFrame>
  );
}
