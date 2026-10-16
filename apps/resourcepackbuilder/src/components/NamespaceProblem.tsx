/** Checking a project namespace and showing what is wrong with it (new project form, project settings). */
import { useTranslations } from 'next-intl';
import { namespaceError } from '@resourcepackbuilder/minecraft';
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { FieldDescription, FieldError } from '@resourcepackbuilder/ui/components/field';

/** What is wrong with a namespace: an error (it cannot be used) or a warning (it can, but better not). */
export interface NamespaceProblem {
  message: string;
  isError: boolean;
}

/**
 * Returns the function that checks a namespace of a project for `target` and words the problem, or null when it is
 * fine. Only Nexo uses the namespace "nexo" itself.
 */
export function useNamespaceProblem(): (namespace: string, target: PackTargetId) => NamespaceProblem | null {
  const t = useTranslations('layout.namespaceProblem');
  return (namespace, target) => {
    const problem = namespaceError(namespace);
    if (!problem || (problem === 'nexo' && target !== 'nexo')) return null;
    return { message: t(problem), isError: problem !== 'nexo' };
  };
}

/** The problem below the namespace field (an error, or a warning), else `fallback`. */
export function NamespaceProblemText({ problem, fallback }: { problem: NamespaceProblem | null; fallback?: string }) {
  if (problem?.isError) return <FieldError>{problem.message}</FieldError>;
  if (problem) return <FieldDescription className="text-warning">{problem.message}</FieldDescription>;
  return fallback ? <FieldDescription>{fallback}</FieldDescription> : null;
}
