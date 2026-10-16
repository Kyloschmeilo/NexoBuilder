import { useTranslations } from 'next-intl';
import { Box, ClipboardCopy, ClipboardPaste, Copy, FolderInput, Gift, Trash2 } from 'lucide-react';
import { getFolderPathLabel, type Item, itemMaterial } from '@resourcepackbuilder/core/project';
import type { Issue } from '@resourcepackbuilder/utils';
import { PLAYER_NAME_PATTERN } from '@resourcepackbuilder/test-server';
import { clipboardLabel } from '@resourcepackbuilder/core/nexo';
import { IconButton, PageHeader, Thumb, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { useThumbnail } from '../../components/useThumbnail';
import { IssueCountBadges } from '../../components/IssueCountBadges';
import { MiniMessageBox } from '../../components/miniMessage/MiniMessageBox';
import { MiniMessageLine } from '../../components/miniMessage/MiniMessageLine';
import { useBusyAction } from '../../hooks/useBusyAction';
import { useServices } from '../../services/bootstrap';
import { useClipboardStore } from '../../store/clipboard';
import { useOpenProject } from '../../store/project';
import { useTestServerStore } from '../../services/testServerStore';
import { moveItemDialog } from '../moveItem/MoveItemDialog';
import { useItemActions } from './useItemActions';

/** "Give in test server" – only visible while the local test server is running. */
function GiveButton({ itemId }: { itemId: string }) {
  const t = useTranslations('item');
  const testServer = useServices().testServer;
  const { isBusy, run } = useBusyAction();
  const tPack = useTranslations('media.testServer.pack');
  const isRunning = useTestServerStore((s) => s.server?.status === 'running');
  const player = useTestServerStore((s) => s.server?.config.playerName ?? '');
  if (!testServer || !isRunning) return null;
  // The give command needs a valid player name; core's command builder rejects anything else
  const isValidPlayer = PLAYER_NAME_PATTERN.test(player);
  const give = () =>
    void run(
      () => testServer.give(itemId),
      (player) => t('editor.giveSuccess', { id: itemId, player }),
    );
  return (
    <Tip label={isValidPlayer ? t('editor.giveTooltip') : tPack('enterName')}>
      <Button variant="outline" size="sm" disabled={isBusy || !isValidPlayer} onClick={give}>
        <Gift /> {t('editor.give')}
      </Button>
    </Tip>
  );
}

/** The item's state badges: id, folder, material and the result of the checks. */
function ItemBadges({ item, issues }: { item: Item; issues: Issue[] }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  return (
    <>
      <Tip label={t('editor.itemId')}>
        <Badge variant="outline" className="border-primary font-mono text-primary">
          {item.itemId}
        </Badge>
      </Tip>
      <Tip label={t('editor.folder')}>
        <Badge variant="outline">{getFolderPathLabel(project, item.folderId)}</Badge>
      </Tip>
      <Badge variant="outline" className="font-mono">
        {itemMaterial(item)}
      </Badge>
      <IssueCountBadges issues={issues} okLabel={t('editor.ready')} />
    </>
  );
}

function ItemActions({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const clip = useClipboardStore((s) => s.clip);
  const actions = useItemActions();
  const canPaste = !!clip && clip.sourceId !== item.id;
  return (
    <>
      <GiveButton itemId={item.itemId} />
      <Tip label={t('editor.copyTooltip')}>
        <Button variant="outline" size="sm" onClick={() => actions.copyProperties(item.id)}>
          <ClipboardCopy /> {tCommon('copy')}
        </Button>
      </Tip>
      <Tip label={clip ? t('editor.pasteTooltip', { name: clipboardLabel(clip) }) : t('editor.pasteDisabled')}>
        <Button variant="outline" size="sm" disabled={!canPaste} onClick={() => actions.pasteProperties([item.id])}>
          <ClipboardPaste /> {tCommon('paste')}
        </Button>
      </Tip>
      <Button variant="outline" size="sm" onClick={() => actions.duplicate(item)}>
        <Copy /> {tCommon('duplicate')}
      </Button>
      <IconButton label={t('editor.move')} variant="outline" onClick={() => moveItemDialog.openWithPayload({ itemId: item.id })}>
        <FolderInput />
      </IconButton>
      <IconButton label={tCommon('delete')} variant="destructive" onClick={() => void actions.remove(item)}>
        <Trash2 />
      </IconButton>
    </>
  );
}

/** Thumbnail, name, badges and actions of the item; the actions wrap below when the editor is narrow. */
export function ItemHeader({ item, issues }: { item: Item; issues: Issue[] }) {
  const thumb = useThumbnail(item.model);
  return (
    <PageHeader
      icon={<Thumb src={thumb} size={48} checkered={false} fallback={<Box className="size-6 opacity-60" />} />}
      title={
        // Minecraft colours are made for a dark background, so the name sits in a dark box in both themes
        <MiniMessageBox className="min-w-0 px-3 py-0.5 align-top font-heading text-2xl leading-8">
          <MiniMessageLine text={item.displayName || item.itemId} />
        </MiniMessageBox>
      }
      meta={<ItemBadges item={item} issues={issues} />}
      actions={<ItemActions item={item} />}
    />
  );
}
