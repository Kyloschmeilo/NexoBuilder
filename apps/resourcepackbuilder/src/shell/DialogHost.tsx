import { useProjectStore } from '../store/project';
import { useDialogStore, type FeatureDialogId, type FeatureDialogProps } from '../store/dialogs';
import { DIALOGS } from './dialogRegistry';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';

function FeatureDialog<K extends FeatureDialogId>({ id, props }: { id: K; props: FeatureDialogProps[K] }) {
  const hasProject = useProjectStore((s) => s.project !== null);
  const { component: Dialog, requiresProject } = DIALOGS[id];
  if (requiresProject && !hasProject) return null;
  return <Dialog {...props} />;
}

/** Renders the open feature dialog and, above it, the stack of open questions. */
export function DialogHost() {
  const feature = useDialogStore((s) => s.feature);
  const questions = useDialogStore((s) => s.questions);
  return (
    <>
      {feature && <FeatureDialog key={feature.id} id={feature.id} props={feature.props} />}
      {questions.map((question) =>
        question.kind === 'confirm' ? (
          <ConfirmDialog key={question.id} question={question} />
        ) : (
          <PromptDialog key={question.id} question={question} />
        ),
      )}
    </>
  );
}
