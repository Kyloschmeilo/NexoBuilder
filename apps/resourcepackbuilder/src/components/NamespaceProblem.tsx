/** Checking a project namespace and showing what is wrong with it (new project form, project settings). */
import { useTranslations } from 'next-intl';
import { namespaceError } from '@resourcepackbuilder/minecraft';
import { FieldDescription, FieldError } from '@resourcepackbuilder/ui/components/field';

/** What is wrong with a namespace: an error (it cannot be used) or a warning (it can, but better not). */
export interface NamespaceProblem {
  message: string;
  isError: boolean;
}

/** Returns the function that checks a namespace and words the problem, or null when it is fine. */
export function useNamespaceProblem(): (namespace: string) => NamespaceProblem | null {
  const t = useTranslations('layout.namespaceProblem');
  return (namespace) => {
    const problem = namespaceError(namespace);
    return problem && { message: t(problem), isError: problem !== 'nexo' };
  };
}

/** The problem below the namespace field (an error, or a warning), else `fallback`. */
export function NamespaceProblemText({ problem, fallback }: { problem: NamespaceProblem | null; fallback?: string }) {
  if (problem?.isError) return <FieldError>{problem.message}</FieldError>;
  if (problem) return <FieldDescription className="text-warning">{problem.message}</FieldDescription>;
  return fallback ? <FieldDescription>{fallback}</FieldDescription> : null;
}
