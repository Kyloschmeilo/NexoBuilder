/** The texts of a registry group: its own (`media.registry.groups.<id>.<text>`) or, for a group without any, the generic ones. */
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { registryGroupId, type REGISTRY_GROUP_TEXTS } from './registryTexts';

type GroupText = (typeof REGISTRY_GROUP_TEXTS)[number];

/** Returns `(groupId, text) => string`. */
export function useRegistryGroupText(): (groupId: string, text: GroupText) => string {
  const t = useTranslations('media.registry');
  return useCallback(
    (groupId: string, text: GroupText) => {
      const id = registryGroupId(groupId);
      return id ? t(`groups.${id}.${text}`) : t(`generic.${text}`);
    },
    [t],
  );
}
