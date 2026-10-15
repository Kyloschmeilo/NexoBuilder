/** Short notices for the user, shown as toasts by the shadcn toast manager (rendered by `Toasts`). */
import { toast } from '@resourcepackbuilder/ui/components/toast';

export type NoticeKind = 'info' | 'success' | 'warning' | 'error';

/** Shows `message` (already translated) as a toast; errors stay longer and take precedence. */
export function notify(kind: NoticeKind, message: string): void {
  toast.add({
    type: kind,
    description: message,
    timeout: kind === 'error' ? 7000 : 4000,
    priority: kind === 'error' ? 'high' : 'low',
  });
}
