/**
 * The pack target whose form the editors below show. It is the open project's target unless a
 * {@link FormTargetProvider} sets one (the dev primitives page shows Nexo and CraftEngine data side by side).
 */
import { createContext, type ReactNode, useContext } from 'react';
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { useProjectStore } from '../store/project';

const FormTargetContext = createContext<PackTargetId | null>(null);

/** Makes the editors below use `target`'s form texts and docs links, whatever project is open. */
export function FormTargetProvider({ target, children }: { target: PackTargetId; children: ReactNode }) {
  return <FormTargetContext.Provider value={target}>{children}</FormTargetContext.Provider>;
}

/** The target of the nearest {@link FormTargetProvider}, else the open project's, else undefined. */
export function useFormTarget(): PackTargetId | undefined {
  const provided = useContext(FormTargetContext);
  const projectTarget = useProjectStore((s) => s.project?.target);
  return provided ?? projectTarget;
}
