import { useDialogStore } from '../store/dialogs';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';

/** Renders the stack of open questions (`confirm`, `prompt`); the newest is on top. */
export function DialogHost() {
  const questions = useDialogStore((s) => s.questions);
  return questions.map((question) =>
    question.kind === 'confirm' ? (
      <ConfirmDialog key={question.id} question={question} />
    ) : (
      <PromptDialog key={question.id} question={question} />
    ),
  );
}
