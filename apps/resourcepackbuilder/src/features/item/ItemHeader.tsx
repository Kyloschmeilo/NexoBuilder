/** The header of the item editor: name, check result, facts and actions of the open item. */
import { useTranslations } from 'next-intl';
import { Box, ClipboardCopy, ClipboardPaste, Copy, FolderInput, Gift, Trash2 } from 'lucide-react';
import { getFolderPathLabel, type Item, itemMaterial } from '@resourcepackbuilder/core/project';
import type { Issue } from '@resourcepackbuilder/utils';
import { PLAYER_NAME_PATTERN } from '@resourcepackbuilder/test-server';
import { canCopyItemConfig, canPasteItemConfig, clipboardLabel } from '@resourcepackbuilder/core/nexo';
import { type MenuEntry, PageHeader, Thumb, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { useThumbnail } from '../../components/useThumbnail';
import { IssueCountBadges } from '../../components/IssueCountBadges';
import { MiniMessageTitle } from '../../components/miniMessage/MiniMessageLine';
import { TargetDot } from '../../components/TargetDot';
import { useBusyAction } from '../../hooks/useBusyAction';
import { useServices } from '../../services/bootstrap';
import { useClipboardStore } from '../../store/clipboard';
import { useOpenProject } from '../../store/project';
import { useTestServerStore } from '../../services/testServerStore';
import { serverRunsOtherTarget, wrongTargetError } from '../../services/testServerSync';
import { useErrorMessage } from '../../i18n/errors';
import { moveItemDialog } from '../moveItem/MoveItemDialog';
import { useItemActions } from './useItemActions';

/**
 * "Give in test server" (desktop program only). Shown all the time so it can be found; while it cannot give the item
 * (server stopped, running another plugin, no player name) it is disabled and its tooltip says why.
 */
function GiveButton({ item }: { item: Item }) {
  const t = useTranslations('item');
  const testServer = useServices().testServer;
  const errorMessage = useErrorMessage();
  const { isBusy, run } = useBusyAction();
  const server = useTestServerStore((s) => s.server);
  const target = useOpenProject().target;
  if (!testServer) return null;
  // The give command needs a valid player name; core's command builder rejects anything else
  const blocker =
    server?.status !== 'running'
      ? t('editor.giveNeedsServer')
      : serverRunsOtherTarget(server, target) && server.target
        ? errorMessage(wrongTargetError(server.target, target))
        : !PLAYER_NAME_PATTERN.test(server.config.playerName)
          ? t('editor.giveNeedsName')
          : null;
  const give = () =>
    void run(
      () => testServer.give(item),
      (player) => t('editor.giveSuccess', { id: item.itemId, player }),
    );
  return (
    <Tip label={blocker ?? t('editor.giveTooltip')}>
      <Button variant="outline" size="sm" disabled={isBusy || blocker !== null} onClick={give}>
        <Gift /> {t('editor.give')}
      </Button>
    </Tip>
  );
}

/** The meta line below the name: item id, folder, material and the project's target, each a separate fact. */
function ItemMeta({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tTargets = useTranslations('layout.projectForm.targets');
  const project = useOpenProject();
  return (
    <>
      <Tip label={t('editor.itemId')}>
        <code className="font-mono text-text">{item.itemId}</code>
      </Tip>
      <Separator />
      <Tip label={t('editor.folder')}>
        <span className="truncate">{getFolderPathLabel(project, item.folderId)}</span>
      </Tip>
      <Separator />
      <Tip label={t('general.material')}>
        <code className="font-mono">{itemMaterial(item)}</code>
      </Tip>
      <Separator />
      <span className="inline-flex items-center gap-1.5">
        <TargetDot target={project.target} />
        {tTargets(`${project.target}.name`)}
      </span>
    </>
  );
}

function Separator() {
  return (
    <span aria-hidden className="text-text-faint">
      ·
    </span>
  );
}

/** The rarer actions of the `⋯` menu: copy and paste features (Nexo), move to a folder and delete. */
function useItemMenu(item: Item): MenuEntry[] {
  const t = useTranslations('item');
  const clip = useClipboardStore((s) => s.clip);
  const { target } = useOpenProject();
  const actions = useItemActions();
  // Copying works on Nexo's property groups; other targets do not offer it
  const canCopy = canCopyItemConfig(target);
  const canPaste = canPasteItemConfig(clip, target) && clip.sourceId !== item.id;
  return [
    ...(canCopy
      ? ([
          {
            icon: <ClipboardCopy />,
            label: t('header.copy'),
            description: t('editor.copyTooltip'),
            onSelect: () => actions.copyProperties(item.id),
          },
          {
            icon: <ClipboardPaste />,
            label: t('header.paste'),
            description: clip ? t('editor.pasteTooltip', { name: clipboardLabel(clip) }) : t('editor.pasteDisabled'),
            disabled: !canPaste,
            onSelect: () => actions.pasteProperties([item.id]),
          },
          'separator',
        ] satisfies MenuEntry[])
      : []),
    { icon: <FolderInput />, label: t('header.moveToFolder'), onSelect: () => moveItemDialog.openWithPayload({ itemId: item.id }) },
    'separator',
    { icon: <Trash2 />, label: t('header.delete'), destructive: true, onSelect: () => void actions.remove(item) },
  ];
}

/**
 * The slim header of the item editor: thumbnail, the display name drawn as MiniMessage on the page, the check result
 * as status pills, one meta line, Give and Duplicate, and the rarer actions in the `⋯` menu.
 */
export function ItemHeader({ item, issues }: { item: Item; issues: Issue[] }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const thumb = useThumbnail(item.model);
  const actions = useItemActions();
  const menu = useItemMenu(item);
  return (
    <PageHeader
      thumb={<Thumb src={thumb} size={32} checkered={false} fallback={<Box className="size-5 opacity-60" />} />}
      title={<MiniMessageTitle text={item.displayName || item.itemId} />}
      status={<IssueCountBadges issues={issues} okLabel={t('editor.ready')} />}
      meta={<ItemMeta item={item} />}
      actions={
        <>
          <GiveButton item={item} />
          <Button variant="outline" size="sm" onClick={() => actions.duplicate(item)}>
            <Copy /> {tCommon('duplicate')}
          </Button>
        </>
      }
      menu={menu}
    />
  );
}
