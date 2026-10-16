import type { ComponentType } from 'react';
import { FolderPlus, MousePointerClick } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { FolderView } from '../features/folder/FolderView';
import { useFolderActions } from '../features/folder/useFolderActions';
import { ItemEditor } from '../features/item/ItemEditor';
import { LootSourcesView } from '../features/lootSources/LootSourcesView';
import { GlyphsView, PaintingsView, SoundsView } from '../features/media/MediaView';
import { TestServerView } from '../features/testServer/TestServerView';
import { useOpenProject } from '../store/project';
import { useUiStore, type ViewName } from '../store/ui';

/** The page of each project-wide view. */
const VIEWS: Record<ViewName, ComponentType> = {
  glyphs: GlyphsView,
  sounds: SoundsView,
  paintings: PaintingsView,
  lootSources: LootSourcesView,
  testServer: TestServerView,
};

/** Shown while nothing is selected: pick something, or create the first folder. */
function NothingSelected() {
  const t = useTranslations('layout.main');
  const project = useOpenProject();
  const folders = useFolderActions();
  const hasFolders = project.rootFolderIds.length > 0;
  return (
    <Empty className="h-full p-8">
      <EmptyHeader className="max-w-md">
        <EmptyMedia>
          {hasFolders ? (
            <MousePointerClick className="size-9 text-muted-foreground" />
          ) : (
            <FolderPlus className="size-9 text-muted-foreground" />
          )}
        </EmptyMedia>
        <EmptyTitle className="font-heading text-xl tracking-wide uppercase">{hasFolders ? t('pickTitle') : t('startTitle')}</EmptyTitle>
        <EmptyDescription>{hasFolders ? t('pickDescription') : t('startDescription')}</EmptyDescription>
      </EmptyHeader>
      {!hasFolders && (
        <EmptyContent>
          <Button size="lg" onClick={() => void folders.create(null)}>
            <FolderPlus /> {t('createFolder')}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

/** Shows the selected entry; the UI store drops a selection whose entry no longer exists. */
function SelectedPage() {
  const selection = useUiStore((s) => s.selection);
  if (!selection) return <NothingSelected />;
  switch (selection.kind) {
    case 'item':
      return <ItemEditor itemId={selection.id} />;
    case 'folder':
      return <FolderView folderId={selection.id} />;
    case 'view': {
      const View = VIEWS[selection.view];
      return <View />;
    }
  }
}

export function MainArea() {
  return (
    <main className="min-h-0 min-w-0 overflow-auto">
      <SelectedPage />
    </main>
  );
}
