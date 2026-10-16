import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { RemoteChange } from '@resourcepackbuilder/core/sync/engine';
import { useServices } from '../services/bootstrap';
import { useSaveStore } from '../services/autosaveStore';
import { notify } from './notify';

/** Repeated changes to the same entries by the same person are announced at most this often. */
const ANNOUNCE_QUIET_MS = 15_000;

/** Turns what the background services report into notices for the user. */
export function useServiceNotices(): void {
  const { share } = useServices();
  const t = useTranslations('app');
  const lastAnnounced = useRef(new Map<string, number>());

  // Once per series of failed saves
  useEffect(
    () =>
      useSaveStore.subscribe((state, previous) => {
        if (state.isFailing && !previous.isFailing) notify('warning', t('autosave.failed'));
      }),
    [t],
  );

  useEffect(() => {
    if (!share) return;
    /** Short notice of what the others changed */
    const announce = (changes: RemoteChange[]) => {
      const byPerson = new Map<string, RemoteChange[]>();
      for (const change of changes) {
        const name = change.byName || t('defaults.someone');
        byPerson.set(name, [...(byPerson.get(name) ?? []), change]);
      }
      const now = Date.now();
      for (const [name, list] of byPerson) {
        const key = `${name}|${list
          .map((c) => `${c.kind}:${c.id}:${c.deleted}`)
          .sort()
          .join(',')}`;
        if (now - (lastAnnounced.current.get(key) ?? 0) < ANNOUNCE_QUIET_MS) continue;
        lastAnnounced.current.set(key, now);
        const labels = [...new Set(list.map((c) => c.label).filter(Boolean))];
        const quote = (label: string) => t('share.quoted', { label });
        const what =
          labels.length === 0
            ? t('share.entryCount', { count: list.length })
            : labels.length <= 3
              ? labels.map(quote).join(', ')
              : t('share.andMore', { list: labels.slice(0, 2).map(quote).join(', '), count: labels.length - 2 });
        const deleted = list.every((c) => c.deleted);
        notify('info', t(deleted ? 'share.remoteDeleted' : 'share.remoteChanged', { name, what }));
      }
    };
    return share.events.subscribe(announce);
  }, [share, t]);
}
